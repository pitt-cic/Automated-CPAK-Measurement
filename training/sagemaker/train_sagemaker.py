"""
SageMaker-compatible training script for CPAK keypoint detection.

SageMaker conventions:
- Input data: /opt/ml/input/data/<channel>/
- Model output: /opt/ml/model/
- Hyperparameters: passed as command line args
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from pathlib import Path
import argparse
import json
import time
import os
import numpy as np
from PIL import Image, ImageEnhance
import random
import math

from eval_utils import evaluate_model, upload_report_to_s3

# ============================================================================
# Model definitions 
# ============================================================================

class ConvBlock(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )

    def forward(self, x):
        return self.conv(x)


class EncoderBlock(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.conv = ConvBlock(in_channels, out_channels)
        self.pool = nn.MaxPool2d(2)

    def forward(self, x):
        features = self.conv(x)
        pooled = self.pool(features)
        return features, pooled


class DecoderBlock(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.upsample = nn.ConvTranspose2d(in_channels, out_channels, kernel_size=2, stride=2)
        self.conv = ConvBlock(out_channels * 2, out_channels)

    def forward(self, x, skip):
        x = self.upsample(x)
        if x.shape != skip.shape:
            x = F.interpolate(x, size=skip.shape[2:], mode='bilinear', align_corners=False)
        x = torch.cat([x, skip], dim=1)
        return self.conv(x)


class UNetWithIntermediateSupervision(nn.Module):
    """
    U-Net with configurable output scale.

    Args:
        in_channels: Number of input channels (1 for grayscale)
        out_channels: Number of output channels (8 keypoints)
        base_channels: Base channel count (doubled at each encoder level)
        output_scale: Output resolution as fraction of input (4 = 1/4 res, 2 = 1/2 res, 1 = full res)
    """
    def __init__(self, in_channels=1, out_channels=8, base_channels=16, output_scale=2):
        super().__init__()
        self.output_scale = output_scale

        # Encoder (4 levels, each halves resolution)
        self.enc1 = EncoderBlock(in_channels, base_channels)
        self.enc2 = EncoderBlock(base_channels, base_channels * 2)
        self.enc3 = EncoderBlock(base_channels * 2, base_channels * 4)
        self.enc4 = EncoderBlock(base_channels * 4, base_channels * 8)
        self.bottleneck = ConvBlock(base_channels * 8, base_channels * 16)

        # Decoder - number of levels depends on output_scale
        # scale=4: 2 decoder blocks (1/4 res), scale=2: 3 blocks (1/2 res), scale=1: 4 blocks (full)
        self.dec4 = DecoderBlock(base_channels * 16, base_channels * 8)
        self.aux_head4 = nn.Conv2d(base_channels * 8, out_channels, kernel_size=1)

        self.dec3 = DecoderBlock(base_channels * 8, base_channels * 4)

        if output_scale <= 2:
            self.dec2 = DecoderBlock(base_channels * 4, base_channels * 2)
            self.aux_head2 = nn.Conv2d(base_channels * 2, out_channels, kernel_size=1)
        else:
            self.dec2 = None
            self.aux_head2 = None

        if output_scale == 1:
            self.dec1 = DecoderBlock(base_channels * 2, base_channels)
            self.out_conv = nn.Conv2d(base_channels, out_channels, kernel_size=1)
        elif output_scale == 2:
            self.dec1 = None
            self.out_conv = nn.Conv2d(base_channels * 2, out_channels, kernel_size=1)
        else:  # scale == 4
            self.dec1 = None
            self.out_conv = nn.Conv2d(base_channels * 4, out_channels, kernel_size=1)

    def forward(self, x, return_aux=False):
        skip1, x = self.enc1(x)
        skip2, x = self.enc2(x)
        skip3, x = self.enc3(x)
        skip4, x = self.enc4(x)
        x = self.bottleneck(x)

        x = self.dec4(x, skip4)
        aux4 = self.aux_head4(x) if return_aux else None

        x = self.dec3(x, skip3)

        if self.output_scale <= 2:
            x = self.dec2(x, skip2)
            aux2 = self.aux_head2(x) if return_aux else None
        else:
            aux2 = None

        if self.output_scale == 1:
            x = self.dec1(x, skip1)

        out = self.out_conv(x)

        if return_aux:
            return out, aux4, aux2
        return out


# ============================================================================
# Dataset 
# ============================================================================

KEYPOINT_NAMES = [
    "femoral_head_center",
    "knee_center_femoral",
    "knee_center_tibial",
    "ankle_center",
    "inner_upper",
    "outer_upper",
    "inner_lower",
    "outer_lower"
]


class DataAugmentation:
    """Data augmentation for keypoint detection."""

    def __init__(self,
                 horizontal_flip_prob=0.0,
                 rotation_range=5.0,
                 scale_range=(0.9, 1.1),
                 brightness_range=(0.8, 1.2),
                 contrast_range=(0.8, 1.2)):
        self.horizontal_flip_prob = horizontal_flip_prob
        self.rotation_range = rotation_range
        self.scale_range = scale_range
        self.brightness_range = brightness_range
        self.contrast_range = contrast_range

    def __call__(self, image, keypoints, input_size):
        """
        Apply augmentations to image and keypoints.

        Args:
            image: PIL Image (grayscale)
            keypoints: list of (x, y) tuples in input resolution
            input_size: (width, height)

        Returns:
            augmented_image: numpy array
            augmented_keypoints: list of (x, y) tuples
        """
        w, h = input_size
        keypoints = list(keypoints)

        # Horizontal flip
        if random.random() < self.horizontal_flip_prob:
            image = image.transpose(Image.FLIP_LEFT_RIGHT)
            keypoints = [(w - x, y) for x, y in keypoints]

        # Brightness adjustment
        if self.brightness_range:
            factor = random.uniform(*self.brightness_range)
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(factor)

        # Contrast adjustment
        if self.contrast_range:
            factor = random.uniform(*self.contrast_range)
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(factor)

        # Rotation and scale (combined affine transform)
        if self.rotation_range or self.scale_range:
            angle = random.uniform(-self.rotation_range, self.rotation_range) if self.rotation_range else 0
            scale = random.uniform(*self.scale_range) if self.scale_range else 1.0

            # Center of image
            cx, cy = w / 2, h / 2

            # Rotation matrix
            cos_a = math.cos(math.radians(angle))
            sin_a = math.sin(math.radians(angle))

            # Apply affine transform to image
            # PIL affine uses inverse transform coefficients
            # We want: x' = scale * (cos(a)*(x-cx) - sin(a)*(y-cy)) + cx
            #          y' = scale * (sin(a)*(x-cx) + cos(a)*(y-cy)) + cy
            # Inverse: x = (cos(a)*(x'-cx) + sin(a)*(y'-cy)) / scale + cx
            #          y = (-sin(a)*(x'-cx) + cos(a)*(y'-cy)) / scale + cy

            a = cos_a / scale
            b = sin_a / scale
            c = cx - a * cx - b * cy
            d = -sin_a / scale
            e = cos_a / scale
            f = cy - d * cx - e * cy

            image = image.transform((w, h), Image.AFFINE, (a, b, c, d, e, f), resample=Image.BILINEAR)

            # Transform keypoints (forward transform)
            new_keypoints = []
            for x, y in keypoints:
                x_new = scale * (cos_a * (x - cx) - sin_a * (y - cy)) + cx
                y_new = scale * (sin_a * (x - cx) + cos_a * (y - cy)) + cy
                new_keypoints.append((x_new, y_new))
            keypoints = new_keypoints

        # Convert to numpy
        image = np.array(image).astype(np.float32) / 255.0

        return image, keypoints


class LegKeypointDataset(Dataset):
    def __init__(self, annotations_path, images_dir,
                 input_size=(384, 2688), sigma=10, heatmap_scale=2,
                 augment=False, normalize_orientation=True):
        self.images_dir = Path(images_dir)
        self.input_size = input_size
        self.sigma = sigma
        self.heatmap_scale = heatmap_scale
        self.heatmap_size = (input_size[0] // heatmap_scale, input_size[1] // heatmap_scale)
        self.augment = augment
        self.normalize_orientation = normalize_orientation

        if augment:
            self.augmentation = DataAugmentation(
                horizontal_flip_prob=0.0,
                rotation_range=5.0,
                scale_range=(0.9, 1.1),
                brightness_range=(0.8, 1.2),
                contrast_range=(0.8, 1.2)
            )
        else:
            self.augmentation = None

        with open(annotations_path, 'r') as f:
            self.annotations = json.load(f)

        self.samples = self._create_samples()
        print(f"Loaded {len(self.samples)} samples from {images_dir} (augment={augment})")

    def _create_samples(self):
        all_samples = []

        for img_name, data in self.annotations['images'].items():
            if data.get('status') != 'completed':
                continue

            img_path = self.images_dir / img_name
            if not img_path.exists():
                print(f"Warning: {img_name} not found in {self.images_dir}, skipping")
                continue

            orig_w = data['original_width']
            orig_h = data['original_height']

            for leg in ['left_leg', 'right_leg']:
                if leg not in data:
                    continue

                keypoints = self._scale_keypoints(data[leg], orig_w, orig_h, leg)

                all_samples.append({
                    'image_name': img_name,
                    'leg': leg,
                    'keypoints': keypoints,
                    'orig_width': orig_w,
                    'orig_height': orig_h
                })

        return all_samples

    def _scale_keypoints(self, leg_data, orig_w, orig_h, leg):
        target_w, target_h = self.input_size
        half_w = orig_w / 2

        keypoints = []
        for name in KEYPOINT_NAMES:
            point = leg_data[name]

            if leg == 'right_leg':
                scaled_x = point['x'] * (target_w / half_w)
            else:
                scaled_x = (point['x'] - half_w) * (target_w / half_w)

            scaled_y = point['y'] * (target_h / orig_h)
            keypoints.append((scaled_x, scaled_y))

        return keypoints

    def _generate_heatmaps(self, keypoints):
        hm_w, hm_h = self.heatmap_size
        heatmaps = np.zeros((len(keypoints), hm_h, hm_w), dtype=np.float32)
        scale = self.heatmap_scale
        hm_sigma = self.sigma / scale

        for i, (x, y) in enumerate(keypoints):
            hm_x = x / scale
            hm_y = y / scale
            heatmaps[i] = self._gaussian_heatmap(hm_x, hm_y, hm_w, hm_h, hm_sigma)

        return heatmaps

    def _gaussian_heatmap(self, cx, cy, width, height, sigma):
        x = np.arange(0, width, 1, dtype=np.float32)
        y = np.arange(0, height, 1, dtype=np.float32)
        xx, yy = np.meshgrid(x, y)
        heatmap = np.exp(-((xx - cx)**2 + (yy - cy)**2) / (2 * sigma**2))
        return heatmap

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]
        img_path = self.images_dir / sample['image_name']
        image = Image.open(img_path).convert('L')
        image = np.array(image)

        h, w = image.shape
        half_w = w // 2
        if sample['leg'] == 'right_leg':
            image = image[:, :half_w]
        else:
            image = image[:, half_w:]

        target_w, target_h = self.input_size
        image = Image.fromarray(image).resize((target_w, target_h), Image.BILINEAR)

        keypoints = sample['keypoints']

        # Normalize orientation - flip left legs to look like right legs
        if self.normalize_orientation and sample['leg'] == 'left_leg':
            image = image.transpose(Image.FLIP_LEFT_RIGHT)
            keypoints = [(target_w - 1 - x, y) for x, y in keypoints]

        # Apply augmentation if enabled
        if self.augmentation is not None:
            image, keypoints = self.augmentation(image, keypoints, self.input_size)
        else:
            image = np.array(image).astype(np.float32) / 255.0

        # Clamp keypoints to valid range after augmentation
        keypoints = [
            (max(0, min(target_w - 1, x)), max(0, min(target_h - 1, y)))
            for x, y in keypoints
        ]

        heatmaps = self._generate_heatmaps(keypoints)

        image_tensor = torch.from_numpy(image).unsqueeze(0)
        heatmaps_tensor = torch.from_numpy(heatmaps)
        keypoints_tensor = torch.tensor(keypoints, dtype=torch.float32)

        return {
            'image': image_tensor,
            'heatmaps': heatmaps_tensor,
            'keypoints': keypoints_tensor
        }


# ============================================================================
# Sub-pixel keypoint extraction
# ============================================================================

def soft_argmax(heatmaps, beta=100.0):
    """
    Differentiable soft-argmax for sub-pixel keypoint accuracy.

    Args:
        heatmaps: (B, K, H, W) tensor
        beta: temperature parameter (higher = sharper, closer to argmax)

    Returns:
        keypoints: (B, K, 2) tensor of (x, y) coordinates
    """
    B, K, H, W = heatmaps.shape
    device = heatmaps.device

    # Softmax over spatial dimensions
    heatmaps_flat = heatmaps.view(B, K, -1)
    softmax = F.softmax(heatmaps_flat * beta, dim=-1).view(B, K, H, W)

    # Create coordinate grids
    x = torch.arange(W, device=device, dtype=torch.float32)
    y = torch.arange(H, device=device, dtype=torch.float32)

    # Expected x: sum over y, then weighted sum over x
    expected_x = (softmax.sum(dim=2) * x).sum(dim=-1)  # (B, K)
    # Expected y: sum over x, then weighted sum over y
    expected_y = (softmax.sum(dim=3) * y).sum(dim=-1)  # (B, K)

    return torch.stack([expected_x, expected_y], dim=-1)  # (B, K, 2)


def extract_keypoints_subpixel(heatmaps, scale=1, beta=100.0):
    """
    Extract keypoints with sub-pixel accuracy and scale to input resolution.

    Args:
        heatmaps: (B, K, H, W) tensor
        scale: factor to scale coordinates to input resolution
        beta: soft-argmax temperature

    Returns:
        keypoints: (B, K, 2) tensor in input resolution
    """
    keypoints = soft_argmax(heatmaps, beta=beta)
    return keypoints * scale


# ============================================================================
# Loss function
# ============================================================================

# Per-keypoint loss weights (indices match KEYPOINT_NAMES order)
# Higher weights for the problematic knee region keypoints
DEFAULT_KEYPOINT_WEIGHTS = [
    1.0,  # 0: femoral_head_center
    1.0,  # 1: knee_center_femoral
    1.0,  # 2: knee_center_tibial
    1.0,  # 3: ankle_center
    2.0,  # 4: inner_upper (problematic - close to inner_lower)
    2.0,  # 5: outer_upper (problematic - close to outer_lower)
    1.5,  # 6: inner_lower
    1.5,  # 7: outer_lower
]


class PeakAwareLoss(nn.Module):
    def __init__(self, alpha=10.0, peak_weight=1.0, keypoint_weights=None):
        super().__init__()
        self.alpha = alpha
        self.peak_weight = peak_weight

        # Per-keypoint weights (None means equal weights)
        if keypoint_weights is not None:
            self.register_buffer('keypoint_weights', torch.tensor(keypoint_weights, dtype=torch.float32))
        else:
            self.keypoint_weights = None

    def forward(self, pred, target):
        B, K, H, W = target.shape

        # Base weight from target intensity
        weight = 1.0 + self.alpha * target

        # Apply per-keypoint weights if specified
        if self.keypoint_weights is not None:
            # Reshape to (1, K, 1, 1) for broadcasting
            kp_weight = self.keypoint_weights.view(1, K, 1, 1).to(pred.device)
            weight = weight * kp_weight

        mse_loss = (weight * (pred - target) ** 2).mean()

        # Peak loss with per-keypoint weighting
        target_flat = target.view(B, K, -1)
        peak_indices = target_flat.argmax(dim=2)
        pred_flat = pred.view(B, K, -1)
        peak_preds = pred_flat.gather(2, peak_indices.unsqueeze(2)).squeeze(2)

        peak_errors = (1.0 - peak_preds) ** 2  # (B, K)

        if self.keypoint_weights is not None:
            kp_weight = self.keypoint_weights.to(pred.device)
            peak_loss = (peak_errors * kp_weight).mean()
        else:
            peak_loss = peak_errors.mean()

        return mse_loss + self.peak_weight * peak_loss


# ============================================================================
# Training functions
# ============================================================================

def train_one_epoch(model, dataloader, criterion, optimizer, device, aux_weight=0.3, max_grad_norm=1.0):
    model.train()
    total_loss = 0
    num_batches = 0

    for batch in dataloader:
        images = batch['image'].to(device)
        heatmaps = batch['heatmaps'].to(device)

        optimizer.zero_grad()
        outputs, aux4, aux2 = model(images, return_aux=True)
        loss = criterion(outputs, heatmaps)

        # Auxiliary loss from deepest decoder (always present)
        aux4_target = F.interpolate(heatmaps, size=aux4.shape[2:], mode='bilinear', align_corners=False)
        loss_aux4 = criterion(aux4, aux4_target)
        loss = loss + aux_weight * loss_aux4

        # Auxiliary loss from second decoder (only for output_scale <= 2)
        if aux2 is not None:
            aux2_target = F.interpolate(heatmaps, size=aux2.shape[2:], mode='bilinear', align_corners=False)
            loss_aux2 = criterion(aux2, aux2_target)
            loss = loss + aux_weight * 0.5 * loss_aux2  # Lower weight for shallower aux

        loss.backward()

        # Gradient clipping for stability
        if max_grad_norm > 0:
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=max_grad_norm)

        optimizer.step()

        total_loss += loss.item()
        num_batches += 1

    return total_loss / num_batches


def validate(model, dataloader, criterion, device):
    model.eval()
    total_loss = 0
    num_batches = 0

    with torch.no_grad():
        for batch in dataloader:
            images = batch['image'].to(device)
            heatmaps = batch['heatmaps'].to(device)
            outputs = model(images, return_aux=False)
            loss = criterion(outputs, heatmaps)
            total_loss += loss.item()
            num_batches += 1

    return total_loss / num_batches


# ============================================================================
# Main training function
# ============================================================================

def train(args):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")

    # SageMaker paths
    data_dir = Path(args.data_dir)
    model_dir = Path(args.model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)

    # Expected directory structure:
    # data_dir/
    #   train/
    #     images/
    #     annotations.json
    #   val/
    #     images/
    #     annotations.json
    #   test/
    #     images/
    #     annotations.json
    train_annotations = data_dir / "train" / "annotations.json"
    train_images = data_dir / "train" / "images"
    val_annotations = data_dir / "val" / "annotations.json"
    val_images = data_dir / "val" / "images"
    test_annotations = data_dir / "test" / "annotations.json"
    test_images = data_dir / "test" / "images"

    print(f"Data directory: {data_dir}")
    print(f"Train annotations: {train_annotations}")
    print(f"Train images: {train_images}")
    print(f"Val annotations: {val_annotations}")
    print(f"Val images: {val_images}")
    print(f"Test annotations: {test_annotations}")
    print(f"Test images: {test_images}")
    print(f"Model output: {model_dir}")

    # Create dataloaders (with augmentation for training)
    train_dataset = LegKeypointDataset(
        train_annotations, train_images,
        input_size=(args.width, args.height),
        sigma=args.sigma, heatmap_scale=args.heatmap_scale,
        augment=True  # Enable augmentation for training
    )
    val_dataset = LegKeypointDataset(
        val_annotations, val_images,
        input_size=(args.width, args.height),
        sigma=args.sigma, heatmap_scale=args.heatmap_scale,
        augment=False  # No augmentation for validation
    )

    pin_memory = torch.cuda.is_available()
    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=4, pin_memory=pin_memory)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=4, pin_memory=pin_memory)

    # Model - 8 keypoints with configurable output scale
    model = UNetWithIntermediateSupervision(
        in_channels=1,
        out_channels=8,
        base_channels=args.base_channels,
        output_scale=args.heatmap_scale
    )
    model = model.to(device)
    print(f"Model parameters: {sum(p.numel() for p in model.parameters() if p.requires_grad):,}")

    # Loss and optimizer (with per-keypoint weighting for problematic keypoints)
    keypoint_weights = DEFAULT_KEYPOINT_WEIGHTS if args.use_keypoint_weights else None
    criterion = PeakAwareLoss(
        alpha=args.loss_alpha,
        peak_weight=args.peak_weight,
        keypoint_weights=keypoint_weights
    )
    if keypoint_weights:
        print(f"Using per-keypoint loss weights: {keypoint_weights}")
    optimizer = optim.Adam(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)

    # Cosine annealing with warm restarts for better convergence
    scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer, T_0=args.cosine_t0, T_mult=2, eta_min=args.lr * 0.01
    )

    # Training loop
    best_val_loss = float('inf')
    patience_counter = 0

    for epoch in range(args.epochs):
        start_time = time.time()

        train_loss = train_one_epoch(model, train_loader, criterion, optimizer, device,
                                      args.aux_weight, max_grad_norm=args.max_grad_norm)
        val_loss = validate(model, val_loader, criterion, device)
        scheduler.step(epoch)  # Cosine annealing steps by epoch

        elapsed = time.time() - start_time
        print(f"Epoch {epoch+1:3d}/{args.epochs} | "
              f"Train Loss: {train_loss:.6f} | "
              f"Val Loss: {val_loss:.6f} | "
              f"LR: {optimizer.param_groups[0]['lr']:.2e} | "
              f"Time: {elapsed:.1f}s")

        # SageMaker-parseable metrics for hyperparameter tuning
        print(f"train_loss={train_loss:.6f};")
        print(f"val_loss={val_loss:.6f};")

        # Save best model
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            checkpoint = {
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': val_loss,
                'args': vars(args)
            }
            torch.save(checkpoint, model_dir / 'best_model.pt')
            print(f"  -> Saved best model (val_loss: {val_loss:.6f})")
        else:
            patience_counter += 1

        # Early stopping
        if patience_counter >= args.patience:
            print(f"\nEarly stopping after {epoch+1} epochs")
            break

    # Save final model
    checkpoint = {
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'val_loss': val_loss,
        'args': vars(args)
    }
    torch.save(checkpoint, model_dir / 'final_model.pt')

    print(f"\nTraining complete!")
    print(f"Best validation loss: {best_val_loss:.6f}")
    print(f"final_val_loss={best_val_loss:.6f};")

# ============================================================================
# Evaluation 
# ============================================================================

    # Run evaluation on test set and upload report to S3
    print("\n" + "=" * 60)
    print("Running Evaluation on Test Set")
    print("=" * 60)

    # Create test dataloader
    test_dataset = LegKeypointDataset(
        test_annotations, test_images,
        input_size=(args.width, args.height),
        sigma=args.sigma, heatmap_scale=args.heatmap_scale
    )
    test_loader = DataLoader(test_dataset, batch_size=args.batch_size, shuffle=False, num_workers=4, pin_memory=pin_memory)

    # Load best model for evaluation
    best_checkpoint = torch.load(model_dir / 'best_model.pt', map_location=device)
    model.load_state_dict(best_checkpoint['model_state_dict'])

    results = evaluate_model(
        model, test_loader, device,
        args.heatmap_scale, args.width, args.height
    )

    # Upload HTML report to S3
    job_name = os.environ.get('TRAINING_JOB_NAME',
                              os.environ.get('SAGEMAKER_JOB_NAME', 'local-training'))
    output_bucket = args.output_bucket

    # Pass hyperparameters to report
    hyperparameters = {
        'learning_rate': args.lr,
        'batch_size': args.batch_size,
        'weight_decay': args.weight_decay,
        'epochs': args.epochs,
        'patience': args.patience,
        'sigma': args.sigma,
        'heatmap_scale': args.heatmap_scale,
        'base_channels': args.base_channels,
        'loss_alpha': args.loss_alpha,
        'peak_weight': args.peak_weight,
        'aux_weight': args.aux_weight,
        'max_grad_norm': args.max_grad_norm,
        'cosine_t0': args.cosine_t0,
        'input_size': f"{args.width}x{args.height}",
    }

    upload_report_to_s3(results, job_name, output_bucket, best_checkpoint.get('epoch', 0), hyperparameters)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    # Data paths (SageMaker will set these)
    parser.add_argument('--data-dir', type=str, default=os.environ.get('SM_CHANNEL_TRAINING', '/opt/ml/input/data/training'))
    parser.add_argument('--model-dir', type=str, default=os.environ.get('SM_MODEL_DIR', '/opt/ml/model'))

    # Model hyperparameters
    parser.add_argument('--width', type=int, default=384)
    parser.add_argument('--height', type=int, default=2688)
    parser.add_argument('--sigma', type=float, default=10.0)
    parser.add_argument('--heatmap-scale', type=int, default=2)
    parser.add_argument('--base-channels', type=int, default=16)

    # Loss hyperparameters
    parser.add_argument('--loss-alpha', type=float, default=10.0)
    parser.add_argument('--peak-weight', type=float, default=0.1)
    parser.add_argument('--aux-weight', type=float, default=0.3)
    parser.add_argument('--use-keypoint-weights', type=lambda x: str(x).lower() in ('true', '1', 'yes'),
                        default=True, help='Use per-keypoint loss weights (higher for inner/outer_upper)')

    # Training hyperparameters
    parser.add_argument('--epochs', type=int, default=100)
    parser.add_argument('--batch-size', type=int, default=2)
    parser.add_argument('--lr', type=float, default=3e-4)
    parser.add_argument('--weight-decay', type=float, default=1e-5)
    parser.add_argument('--patience', type=int, default=20)
    parser.add_argument('--max-grad-norm', type=float, default=1.0, help='Max gradient norm for clipping (0 to disable)')
    parser.add_argument('--cosine-t0', type=int, default=20, help='Cosine annealing T_0 (restart period)')

    # S3 bucket for report upload
    parser.add_argument('--output-bucket', type=str, default='cpak2', help='S3 bucket for uploading evaluation report')

    args = parser.parse_args()

    print("=" * 60)
    print("CPAK Keypoint Detection - SageMaker Training")
    print("=" * 60)
    print(f"\nConfiguration:")
    for key, value in vars(args).items():
        print(f"  {key}: {value}")

    train(args)