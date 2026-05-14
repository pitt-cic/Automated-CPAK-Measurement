"""
U-Net model for CPAK keypoint detection.
Architecture matches the SageMaker training script.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class ConvBlock(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
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
        self.upsample = nn.ConvTranspose2d(
            in_channels, out_channels, kernel_size=2, stride=2
        )
        self.conv = ConvBlock(out_channels * 2, out_channels)

    def forward(self, x, skip):
        x = self.upsample(x)
        if x.shape != skip.shape:
            x = F.interpolate(x, size=skip.shape[2:], mode="bilinear", align_corners=False)
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

    def __init__(self, in_channels=1, out_channels=8, base_channels=32, output_scale=4):
        super().__init__()
        self.output_scale = output_scale

        # Encoder (4 levels, each halves resolution)
        self.enc1 = EncoderBlock(in_channels, base_channels)
        self.enc2 = EncoderBlock(base_channels, base_channels * 2)
        self.enc3 = EncoderBlock(base_channels * 2, base_channels * 4)
        self.enc4 = EncoderBlock(base_channels * 4, base_channels * 8)
        self.bottleneck = ConvBlock(base_channels * 8, base_channels * 16)

        # Decoder - number of levels depends on output_scale
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
