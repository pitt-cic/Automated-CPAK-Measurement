"""
U-Net model for keypoint heatmap regression.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class ConvBlock(nn.Module):
    """Double convolution block."""

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
    """Encoder block: ConvBlock + MaxPool."""

    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.conv = ConvBlock(in_channels, out_channels)
        self.pool = nn.MaxPool2d(2)

    def forward(self, x):
        features = self.conv(x)
        pooled = self.pool(features)
        return features, pooled


class DecoderBlock(nn.Module):
    """Decoder block: Upsample + Concat + ConvBlock."""

    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.upsample = nn.ConvTranspose2d(in_channels, out_channels, kernel_size=2, stride=2)
        self.conv = ConvBlock(out_channels * 2, out_channels)

    def forward(self, x, skip):
        x = self.upsample(x)

        # Handle size mismatch due to odd dimensions
        if x.shape != skip.shape:
            x = F.interpolate(x, size=skip.shape[2:], mode='bilinear', align_corners=False)

        x = torch.cat([x, skip], dim=1)
        return self.conv(x)


class UNet(nn.Module):
    """U-Net for keypoint heatmap prediction."""

    def __init__(self, in_channels=1, out_channels=8, base_channels=64):
        """
        Args:
            in_channels: Number of input channels (1 for grayscale)
            out_channels: Number of output heatmaps (8 keypoints)
            base_channels: Number of channels in first layer
        """
        super().__init__()

        # Encoder
        self.enc1 = EncoderBlock(in_channels, base_channels)
        self.enc2 = EncoderBlock(base_channels, base_channels * 2)
        self.enc3 = EncoderBlock(base_channels * 2, base_channels * 4)
        self.enc4 = EncoderBlock(base_channels * 4, base_channels * 8)

        # Bottleneck
        self.bottleneck = ConvBlock(base_channels * 8, base_channels * 16)

        # Decoder
        self.dec4 = DecoderBlock(base_channels * 16, base_channels * 8)
        self.dec3 = DecoderBlock(base_channels * 8, base_channels * 4)
        self.dec2 = DecoderBlock(base_channels * 4, base_channels * 2)
        self.dec1 = DecoderBlock(base_channels * 2, base_channels)

        # Output
        self.out_conv = nn.Conv2d(base_channels, out_channels, kernel_size=1)

    def forward(self, x):
        # Encoder
        skip1, x = self.enc1(x)
        skip2, x = self.enc2(x)
        skip3, x = self.enc3(x)
        skip4, x = self.enc4(x)

        # Bottleneck
        x = self.bottleneck(x)

        # Decoder
        x = self.dec4(x, skip4)
        x = self.dec3(x, skip3)
        x = self.dec2(x, skip2)
        x = self.dec1(x, skip1)

        # Output
        x = self.out_conv(x)
        x = torch.sigmoid(x)  # Heatmaps in [0, 1]

        return x


class SmallUNet(nn.Module):
    """Smaller U-Net for faster training on limited data."""

    def __init__(self, in_channels=1, out_channels=8, base_channels=32):
        super().__init__()

        # Encoder (3 levels instead of 4)
        self.enc1 = EncoderBlock(in_channels, base_channels)
        self.enc2 = EncoderBlock(base_channels, base_channels * 2)
        self.enc3 = EncoderBlock(base_channels * 2, base_channels * 4)

        # Bottleneck
        self.bottleneck = ConvBlock(base_channels * 4, base_channels * 8)

        # Decoder
        self.dec3 = DecoderBlock(base_channels * 8, base_channels * 4)
        self.dec2 = DecoderBlock(base_channels * 4, base_channels * 2)
        self.dec1 = DecoderBlock(base_channels * 2, base_channels)

        # Output
        self.out_conv = nn.Conv2d(base_channels, out_channels, kernel_size=1)

    def forward(self, x):
        # Encoder
        skip1, x = self.enc1(x)
        skip2, x = self.enc2(x)
        skip3, x = self.enc3(x)

        # Bottleneck
        x = self.bottleneck(x)

        # Decoder
        x = self.dec3(x, skip3)
        x = self.dec2(x, skip2)
        x = self.dec1(x, skip1)

        # Output
        x = self.out_conv(x)
        x = torch.sigmoid(x)

        return x


class UNetWithIntermediateSupervision(nn.Module):
    """
    U-Net with improvements:
    - Output at 1/4 resolution (64x256 instead of 256x1024)
    - No sigmoid (better gradient flow)
    - Intermediate supervision at decoder stages
    """

    def __init__(self, in_channels=1, out_channels=8, base_channels=32):
        super().__init__()

        # Encoder
        self.enc1 = EncoderBlock(in_channels, base_channels)
        self.enc2 = EncoderBlock(base_channels, base_channels * 2)
        self.enc3 = EncoderBlock(base_channels * 2, base_channels * 4)
        self.enc4 = EncoderBlock(base_channels * 4, base_channels * 8)

        # Bottleneck
        self.bottleneck = ConvBlock(base_channels * 8, base_channels * 16)

        # Decoder - only go up to 1/4 resolution
        self.dec4 = DecoderBlock(base_channels * 16, base_channels * 8)
        self.dec3 = DecoderBlock(base_channels * 8, base_channels * 4)
        # Stop at dec3 - outputs at 1/4 resolution (same as skip2/enc2 output)

        # Main output head (at 1/4 resolution = skip2 level)
        self.out_conv = nn.Conv2d(base_channels * 4, out_channels, kernel_size=1)

        # Intermediate supervision head (at 1/8 resolution)
        self.aux_head4 = nn.Conv2d(base_channels * 8, out_channels, kernel_size=1)

    def forward(self, x, return_aux=False):
        # Encoder
        skip1, x = self.enc1(x)  # 1/2 res
        skip2, x = self.enc2(x)  # 1/4 res <- main output resolution
        skip3, x = self.enc3(x)  # 1/8 res
        skip4, x = self.enc4(x)  # 1/16 res

        # Bottleneck
        x = self.bottleneck(x)

        # Decoder with intermediate outputs
        x = self.dec4(x, skip4)  # 1/8 res
        aux4 = self.aux_head4(x) if return_aux else None

        x = self.dec3(x, skip3)  # 1/4 res

        # Main output - NO sigmoid for better gradient flow
        out = self.out_conv(x)

        if return_aux:
            return out, aux4
        return out

    def forward_with_clamp(self, x):
        """For inference - clamp output to [0, 1]."""
        out = self.forward(x, return_aux=False)
        return torch.clamp(out, 0, 1)


def count_parameters(model):
    """Count trainable parameters."""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


if __name__ == "__main__":
    # Test the model
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")

    # Test UNet
    model = UNet(in_channels=1, out_channels=8, base_channels=64)
    model = model.to(device)
    print(f"\nUNet parameters: {count_parameters(model):,}")

    # Test forward pass
    x = torch.randn(2, 1, 1024, 256).to(device)  # (B, C, H, W)
    y = model(x)
    print(f"Input shape: {x.shape}")
    print(f"Output shape: {y.shape}")

    # Test SmallUNet
    small_model = SmallUNet(in_channels=1, out_channels=8, base_channels=32)
    small_model = small_model.to(device)
    print(f"\nSmallUNet parameters: {count_parameters(small_model):,}")

    y_small = small_model(x)
    print(f"SmallUNet output shape: {y_small.shape}")
