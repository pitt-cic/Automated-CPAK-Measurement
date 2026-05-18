"""
Convert PyTorch U-Net model to ONNX format.

Run from this directory:
    python convert_to_onnx.py

Requires torch and onnx installed (included in training/requirements.txt).
"""

import os
import sys
from pathlib import Path

# Add training folder to path for model import
sys.path.insert(0, str(Path(__file__).parent.parent))

import onnx
import torch
from model import UNetWithIntermediateSupervision

MODEL_PATH = "./models/unet.pt"
ONNX_PATH = "./models/unet.onnx"

# Load checkpoint and extract args
checkpoint = torch.load(MODEL_PATH, map_location="cpu", weights_only=False)
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

# Re-save as single file to avoid external data format issues
# (PyTorch 2.2+ with newer ONNX can split large models into .onnx + .onnx.data)
onnx_model = onnx.load(ONNX_PATH)
onnx.checker.check_model(onnx_model)
onnx.save_model(onnx_model, ONNX_PATH, save_as_external_data=False)

# Clean up any .data file that may have been created
data_file = ONNX_PATH + ".data"
if os.path.exists(data_file):
    os.remove(data_file)
    print(f"Removed external data file: {data_file}")

print("ONNX model exported and verified successfully")
