# CPAK X-Ray Annotation Tools

Tools for annotating keypoints on lower limb X-ray images.

## Setup

### 1. Create a Python virtual environment

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

## Directory Structure

Before running the tools, create the following directory structure:

```
annotate/
├── data/
│   ├── toBeAnnotated/    # Place your PNG images here
│   ├── output/           # Completed annotations moved here
│   └── skipped/          # Skipped images moved here
├── model/
│   ├── best_model.pt     # Place your trained model here (for V3 only)
│   └── model.py          # Model definition (for V3 only)
├── annotate.py
├── annotate_v3_perf_only.py
├── requirements.txt
└── README.md
```

Create the data directories:
```bash
mkdir -p data/toBeAnnotated data/output data/skipped
```

## Tool 1: Manual Annotation (`annotate.py`)

Use this tool when you don't have a trained model yet. You manually click to place each keypoint.

### Usage

1. Place your PNG X-ray images in `data/toBeAnnotated/`
2. Run the tool:
   ```bash
   python annotate.py
   ```
3. For each image:
   - Click to place each of the 8 keypoints in order (right leg first, then left leg)
   - Drag placed points to adjust their position
   - Right-click + drag to pan the image
   - Use mouse wheel or zoom buttons to zoom in/out
   - Press **Enter** to confirm each leg
   - Press **S** to skip an image
   - Press **U** to undo the last placed point
   - Press **R** to reset all points on the current leg

### Keypoints (8 per leg)

1. Femoral Head Center
2. Knee Center (Femoral)
3. Knee Center (Tibial)
4. Ankle Center
5. Inner Upper (knee joint line - medial side)
6. Outer Upper (knee joint line - lateral side)
7. Inner Lower (knee joint line - medial side)
8. Outer Lower (knee joint line - lateral side)

## Tool 2: Model-Assisted Annotation (`annotate_v3_perf_only.py`)

Use this tool after you have trained a model. The model predicts keypoint positions, and you drag to refine them.

### Prerequisites

1. Train a keypoint detection model
2. Place the trained model checkpoint at:
   ```
   model/best_model.pt
   ```
3. Ensure `model/model.py` contains the `UNetWithIntermediateSupervision` class

### Usage

1. Place your PNG X-ray images in `data/toBeAnnotated/`
2. Run the tool:
   ```bash
   python annotate_v3_perf_only.py
   ```
3. For each image:
   - The model automatically predicts all 8 keypoints
   - Drag points to refine their positions
   - Right-click + drag to pan the image
   - Use mouse wheel or zoom buttons to zoom in/out
   - Press **Enter** to confirm each leg
   - Press **S** to skip an image
   - Press **R** to reset points to model prediction

## Output

Annotations are saved to `data/annotations.json` in the following format:

```json
{
  "metadata": {
    "version": "2.0",
    "created": "2024-01-01T12:00:00",
    "point_names": ["femoral_head_center", "knee_center_femoral", ...]
  },
  "images": {
    "image001.png": {
      "original_width": 1024,
      "original_height": 2048,
      "annotated_at": "2024-01-01T12:05:00",
      "status": "completed",
      "left_leg": {
        "femoral_head_center": {"x": 512, "y": 100},
        ...
      },
      "right_leg": {
        "femoral_head_center": {"x": 256, "y": 100},
        ...
      }
    }
  }
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Confirm current leg / Save and next |
| S | Skip current image |
| R | Reset points (manual: clear all, V3: re-predict) |
| U | Undo last point (manual mode only) |

## Mouse Controls

| Action | Effect |
|--------|--------|
| Left-click | Place point (manual) / Start dragging point |
| Left-drag | Drag point to adjust position |
| Right-drag | Pan the image |
| Scroll wheel | Zoom in/out |
