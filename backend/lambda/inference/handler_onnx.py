"""
Lambda handler for CPAK landmark inference using ONNX Runtime.

Takes a base64-encoded full leg radiograph, splits it down the center,
runs inference on both halves (flipping the left leg to normalize orientation),
and returns 16 x,y landmark points (8 per leg) in original image coordinates.
"""

import base64
import json
import os
from io import BytesIO

import numpy as np
import onnxruntime as ort
from PIL import Image

# Configuration
MODEL_PATH = os.environ.get("MODEL_PATH", "./models/unet.onnx")
NUM_KEYPOINTS = 8

# Model input dimensions (must match training)
INPUT_WIDTH = 384
INPUT_HEIGHT = 2688
HEATMAP_SCALE = 2

KEYPOINT_NAMES = [
    "femoral_head_center",
    "knee_center_femoral",
    "knee_center_tibial",
    "ankle_center",
    "inner_upper",
    "outer_upper",
    "inner_lower",
    "outer_lower",
]

# Load ONNX model at module level (stays warm between invocations)
session = None


def load_model():
    """Load ONNX model once and cache it."""
    global session
    if session is None:
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        session = ort.InferenceSession(MODEL_PATH, sess_options, providers=["CPUExecutionProvider"])
    return session


def extract_keypoints_from_heatmaps(heatmaps: np.ndarray, scale: int = 1) -> np.ndarray:
    """
    Extract (x, y) coordinates from heatmaps using argmax.
    Matches the training script's extract_keypoints_from_heatmaps function.

    Args:
        heatmaps: (B, K, H, W) array
        scale: multiplier to apply to coordinates (heatmap_scale)

    Returns:
        keypoints: (B, K, 2) array of (x, y) coordinates in input space
    """
    B, K, H, W = heatmaps.shape

    heatmaps_flat = heatmaps.reshape(B, K, -1)
    max_indices = np.argmax(heatmaps_flat, axis=-1)  # (B, K)

    y = max_indices // W
    x = max_indices % W

    return np.stack([x * scale, y * scale], axis=-1).astype(np.float32)  # (B, K, 2)


def preprocess_half(half_image: Image.Image, flip: bool) -> np.ndarray:
    """
    Preprocess a half-image for model input.

    Args:
        half_image: PIL Image of one leg half
        flip: Whether to horizontally flip (for left leg normalization)

    Returns:
        Array of shape (1, 1, H, W)
    """
    if flip:
        half_image = half_image.transpose(Image.FLIP_LEFT_RIGHT)

    # Resize to model input size
    half_image = half_image.resize((INPUT_WIDTH, INPUT_HEIGHT), Image.Resampling.BILINEAR)

    # Convert to array and normalize
    img_array = np.array(half_image, dtype=np.float32) / 255.0
    return img_array.reshape(1, 1, INPUT_HEIGHT, INPUT_WIDTH)


def run_inference_on_half(
    session: ort.InferenceSession,
    half_array: np.ndarray,
    orig_half_width: int,
    orig_height: int,
    flip_back: bool,
) -> list[dict]:
    """
    Run inference on a single leg half and return keypoints in original coordinates.
    """
    # Run ONNX inference
    input_name = session.get_inputs()[0].name
    heatmaps = session.run(None, {input_name: half_array})[0]  # (1, 8, H/scale, W/scale)
    heatmaps = np.clip(heatmaps, 0, 1)

    # Extract keypoints using hard argmax (matches training script)
    # Returns coordinates already scaled to input space
    keypoints_input = extract_keypoints_from_heatmaps(heatmaps, scale=HEATMAP_SCALE)  # (1, 8, 2)
    keypoints_input = keypoints_input[0]  # (8, 2)

    # Scale from input coordinates to original half coordinates
    scale_x = orig_half_width / INPUT_WIDTH
    scale_y = orig_height / INPUT_HEIGHT

    points = []
    for i, (x, y) in enumerate(keypoints_input):
        # Unflip left leg predictions (matches training script)
        if flip_back:
            x = INPUT_WIDTH - 1 - x

        # Scale to original image coordinates
        orig_x = x * scale_x
        orig_y = y * scale_y

        points.append(
            {
                "x": float(orig_x),
                "y": float(orig_y),
                "label": KEYPOINT_NAMES[i],
            }
        )

    return points


def handler(event, _context):
    """Lambda entry point."""
    try:
        # Parse request body
        body = event.get("body", "{}")
        if isinstance(body, str):
            body = json.loads(body)

        image_b64 = body.get("image")
        if not image_b64:
            return error_response(400, "Missing 'image' field in request body")

        # Decode base64 image
        try:
            image_bytes = base64.b64decode(image_b64)
        except Exception:
            return error_response(400, "Invalid base64 encoding")

        # Load and convert to grayscale
        image = Image.open(BytesIO(image_bytes)).convert("L")
        orig_width, orig_height = image.size
        half_width = orig_width // 2

        # Split image down the center
        right_half = image.crop((half_width, 0, orig_width, orig_height))  # Left leg
        left_half = image.crop((0, 0, half_width, orig_height))  # Right leg

        # Load ONNX model
        session = load_model()

        # Process right leg (left half of image) - no flip needed
        right_leg_array = preprocess_half(left_half, flip=False)
        right_leg_points = run_inference_on_half(
            session, right_leg_array, half_width, orig_height, flip_back=False
        )
        for p in right_leg_points:
            p["leg"] = "right"

        # Process left leg (right half of image) - flip to normalize, then flip back
        left_leg_array = preprocess_half(right_half, flip=True)
        left_leg_points = run_inference_on_half(
            session, left_leg_array, half_width, orig_height, flip_back=True
        )
        for p in left_leg_points:
            p["x"] = p["x"] + half_width
            p["leg"] = "left"

        # Combine all 16 points
        all_points = right_leg_points + left_leg_points

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Type": "application/json",
            },
            "body": json.dumps(
                {
                    "points": all_points,
                    "metadata": {
                        "originalWidth": orig_width,
                        "originalHeight": orig_height,
                    },
                }
            ),
        }

    except Exception as e:
        import traceback
        return error_response(500, f"Inference failed: {str(e)}\n{traceback.format_exc()}")


def error_response(status_code: int, message: str) -> dict:
    """Build error response with CORS headers."""
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Content-Type": "application/json",
        },
        "body": json.dumps({"error": message}),
    }
