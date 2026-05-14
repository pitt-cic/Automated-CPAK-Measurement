"""
Convert PyTorch U-Net model to ONNX format.

Run this locally once:
    python convert_to_onnx.py

Requires torch installed locally.
"""

import sys
from pathlib import Path

# Add training folder to path for model import
sys.path.insert(0, str(Path(__file__).parent.parent))

import torch
from model import UNetWithIntermediateSupervision

MODEL_PATH = "./models/unet.pt"
ONNX_PATH = "./models/unet.onnx"

# Load checkpoint and extract args
checkpoint = torch.load(MODEL_PATH, map_location="cpu")
args = checkpoint.get("args", {})

width = args.get("width", 384)
height = args.get("height", 2688)
base_channels = args.get("base_channels", 16)
heatmap_scale = args.get("heatmap_scale", 2)
num_keypoints = 8

print(f"Model config: {width}x{height}, base_channels={base_channels}, heatmap_scale={heatmap_scale}")

# Build model and load weights
model = UNetWithIntermediateSupervision(
    in_channels=1,
    out_channels=num_keypoints,
    base_channels=base_channels,
    output_scale=heatmap_scale,
)

if "model_state_dict" in checkpoint:
    model.load_state_dict(checkpoint["model_state_dict"])
else:
    model.load_state_dict(checkpoint)

model.eval()

# Create dummy input matching expected shape
dummy_input = torch.randn(1, 1, height, width)

# Export to ONNX
torch.onnx.export(
    model,
    dummy_input,
    ONNX_PATH,
    export_params=True,
    opset_version=14,
    do_constant_folding=True,
    input_names=["image"],
    output_names=["heatmaps"],
    dynamic_axes={
        "image": {0: "batch_size"},
        "heatmaps": {0: "batch_size"},
    },
)

print(f"Exported to {ONNX_PATH}")

# Verify the export
import onnx
onnx_model = onnx.load(ONNX_PATH)
onnx.checker.check_model(onnx_model)
print("ONNX model verified successfully")
