# CPAK User Guide

This guide covers how to use the CPAK (Coronal Plane Alignment of the Knee) system, including training your own model and deploying the inference application.

---

## Table of Contents

- [Training Pipeline](#training-pipeline)
  - [Setup](#setup)
  - [1. Get Data from NIH](#1-get-data-from-nih)
  - [2. Annotate Data](#2-annotate-data)
  - [3. Deploy Training Infrastructure](#3-deploy-training-infrastructure)
  - [4. Upload Data to S3](#4-upload-data-to-s3)
  - [5. Run Training](#5-run-training)
  - [6. Convert Model to ONNX](#6-convert-model-to-onnx)
- [Application Pipeline](#application-pipeline)
  - [1. Place the Model](#1-place-the-model)
  - [2. Deploy Infrastructure](#2-deploy-infrastructure)
  - [3. Deploy Frontend](#3-deploy-frontend)
  - [4. Invite Users](#4-invite-users)
  - [5. Access the Application](#5-access-the-application)

---

# Training Pipeline

## Setup

Before starting, set up the Python environment for all training tools:

```bash
cd training

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# OR: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

This environment covers annotation, model conversion, and SageMaker job launching.

## 1. Get Data from NIH

Training data comes from the NIH Osteoarthritis Initiative (OAI) dataset. To access this data:

1. Visit the NIMH Data Archive: https://nda.nih.gov/oai
2. Request access to the OAI dataset
3. Download long-leg radiograph images (PNG format recommended)
4. Place images in the annotation folder structure (see next step)

## 2. Annotate Data

The repository includes annotation tools for labeling keypoints on X-ray images.

### Place Your Images

Put your PNG X-ray images in:
```
training/annotate/data/toBeAnnotated/
```

### Choose an Annotation Tool

**Option A: Manual Annotation (`annotate.py`)**

Use this when you don't have a trained model yet:

```bash
python annotate.py
```

- Click to place each of the 8 keypoints per leg
- Drag placed points to adjust positions
- Press **Enter** to confirm each leg
- Press **S** to skip an image
- Press **U** to undo the last point
- Press **R** to reset all points

**Option B: Model-Assisted Annotation (`annotate_with_model.py`)**

Use this after you have a trained model to speed up annotation:

```bash
python annotate_with_model.py
```

Prerequisites:
- Place your trained model at `training/annotate/checkpoints/best_model.pt`
- The model predicts keypoints automatically; you drag to refine

Controls:
- Drag points to adjust positions
- Right-click + drag to pan
- Mouse wheel to zoom
- Press **Enter** to confirm each leg
- Press **S** to skip an image
- Press **R** to reset to model prediction

### Keypoints (8 per leg)

| # | Name | Description |
|---|------|-------------|
| 1 | Femoral Head Center | Center of the femoral head |
| 2 | Knee Center (Femoral) | Femoral side of knee joint |
| 3 | Knee Center (Tibial) | Tibial side of knee joint |
| 4 | Ankle Center | Center of the ankle |
| 5 | Inner Upper | Medial side of upper knee joint line |
| 6 | Outer Upper | Lateral side of upper knee joint line |
| 7 | Inner Lower | Medial side of lower knee joint line |
| 8 | Outer Lower | Lateral side of lower knee joint line |

### Output

Annotations are saved to `training/annotate/data/annotations.json`. Completed images move to `data/output/`.

## 3. Deploy Training Infrastructure

Deploy the training stack (S3 bucket, SageMaker permissions, training reports frontend):

```bash
./deploy.sh
```

Select option **2) Training (infrastructure + frontend)**

Or deploy manually:

```bash
cd infra
npm install
npm run build
npx cdk deploy -c mode=training
```

## 4. Upload Data to S3

After annotating, organize your data in the following structure:

```
your-data-folder/
└── output/
    ├── train/
    │   ├── images/
    │   │   ├── image001.png
    │   │   └── ...
    │   └── annotations.json
    ├── val/
    │   ├── images/
    │   │   └── ...
    │   └── annotations.json
    └── test/
        ├── images/
        │   └── ...
        └── annotations.json
```

Split your annotated data into train/val/test sets (recommended: 70/15/15).

### Upload Using deploy.sh

```bash
./deploy.sh
```

Select option **4) Upload training data to S3**. Enter the path to your data folder when prompted.

The script will:
1. Check that the training stack is deployed
2. Get the S3 bucket name from CloudFormation outputs
3. Sync your data to `s3://{bucket-name}/`

### Manual Upload

Alternatively, upload directly with AWS CLI:

```bash
aws s3 cp /path/to/your-data-folder s3://{bucket-name}/ --recursive 
```

## 5. Run Training

**Note:** Your AWS account may have zero quota for GPU training instances by default. Before running training, you may need to request a quota increase:
> 1. Go to [Service Quotas Console](https://console.aws.amazon.com/servicequotas/home/services/sagemaker/quotas)
> 2. Search for "ml.g4dn.xlarge for training job usage"
> 3. Click on the quota and select "Request increase at account level"
> 4. Request a value of at least 1
> 5. Wait for approval

Launch a SageMaker training job (ensure the training venv is activated):

```bash
cd training/sagemaker

python launch_training.py \
    --role arn:aws:iam::YOUR_ACCOUNT:role/YOUR_SAGEMAKER_ROLE \
    --output-bucket OUTPUT_BUCKET_NAME \
    --training-data-uri s3://DATA_BUCKET_NAME/output/
```

### Training Parameters

**Required:**

| Parameter | Description |
|-----------|-------------|
| `--role` | SageMaker execution role ARN (e.g., `arn:aws:iam::123456789:role/SageMakerRole`) |

**S3 Paths:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--output-bucket` | `cpak` | S3 bucket for training outputs <br> (can be the same as data bucket)|
| `--training-data-uri` | `s3://cpak/` | S3 URI to training data |

**Instance:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--instance-type` | `ml.g4dn.xlarge` | SageMaker instance type |
| `--job-name` | Auto-generated | Custom training job name |
| `--max-run` | 4 | Max runtime in hours |

**Training:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--epochs` | 100 | Number of training epochs |
| `--batch-size` | 2 | Batch size |
| `--lr` | 3e-4 | Learning rate |
| `--weight-decay` | 1e-5 | Weight decay for regularization |
| `--patience` | 20 | Early stopping patience (epochs without improvement) |
| `--max-grad-norm` | 1.0 | Max gradient norm for clipping |
| `--cosine-t0` | 20 | Cosine annealing restart period |

**Model Architecture:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--width` | 384 | Input image width |
| `--height` | 2688 | Input image height |
| `--base-channels` | 16 | Base channel count for U-Net |
| `--heatmap-scale` | 2 | Heatmap downscale factor |
| `--sigma` | 10.0 | Gaussian heatmap spread |

**Loss Function:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--loss-alpha` | 10.0 | Weighting for peak regions in loss |
| `--peak-weight` | 0.1 | Weight for explicit peak penalty |
| `--aux-weight` | 0.3 | Weight for auxiliary head loss |
| `--use-keypoint-weights` | True | Use per-keypoint loss weights (flag) |

Model artifacts are saved to `s3://{bucket}/model-output/`.

## 6. Converting a Trained Model to ONNX
 
After training completes on SageMaker, you'll have a PyTorch checkpoint (`.pt` file) that needs to be converted to ONNX format for inference.
 
### 1. Download the model from SageMaker
 
1. Open the [S3 Console](https://console.aws.amazon.com/s3/)
2. Find your CPAK bucket (created by the training stack)
3. Navigate to `model-output/<job-name>/output/`
4. Download `model.tar.gz`
5. Extract it locally:
 
```bash
tar -xzf model.tar.gz
```
 
This extracts `best_model.pt`.
 
### 2. Place the model in the convert folder
 
```bash
cp best_model.pt training/convert/models/unet.pt
```
 
### 3. Run the conversion

Ensure the training venv is activated, then:

```bash
cd training/convert
python convert_to_onnx.py
```

The script reads hyperparameters (width, height, base_channels, heatmap_scale) from the checkpoint's saved args, so it will match your training configuration automatically.

Output: `training/convert/models/unet.onnx`

### 4. Deploy the ONNX model

Copy the converted model to the inference Lambda:

```bash
cp training/convert/models/unet.onnx backend/lambda/inference/models/unet.onnx
```

Then deploy the inference stack:

```bash
./deploy.sh
# Select option 1 (Inference)
```

## Important: Model Dimensions
 
The inference Lambda expects models trained with these specific parameters:
- `width`: 384
- `height`: 2688
- `heatmap-scale`: 2
 
These are the defaults in `train_sagemaker.py`. If you train with different dimensions, you'll need to update the constants in `backend/lambda/inference/handler_onnx.py` and redeploy.

---

# Application Pipeline

## 1. Place the Model

The ONNX model must be in place before deploying, as it's baked into the Lambda container image:

```
backend/lambda/inference/models/unet.onnx
```

If you trained your own model, follow the [conversion steps](#6-converting-a-trained-model-to-onnx) to generate this file.

## 2. Deploy Infrastructure

Deploy the inference stack (Lambda, API Gateway, Cognito, Amplify):

```bash
./deploy.sh
```

Select option **1) Inference (infrastructure + frontend)**

Or deploy manually:

```bash
cd infra
npm install
npm run build
npx cdk deploy -c mode=inference
```

This deploys:
- Lambda function for model inference (container-based, includes the ONNX model)
- API Gateway REST endpoint
- Cognito user pool for authentication
- Amplify hosting for the frontend

To update the model after initial deployment, replace the file and redeploy

## 3. Deploy Frontend

The frontend is automatically deployed with the infrastructure. To redeploy just the frontend:

```bash
./deploy.sh
```

Select option **1)** and the script will:
1. Fetch Cognito config from CloudFormation outputs
2. Update the frontend `.env` file
3. Build and deploy to Amplify

Or deploy manually:

```bash
cd frontend/inference
npm install
npm run build
./deploy-frontend.sh --skip-build
```

## 4. Invite Users

Users must be invited to access the application:

```bash
./deploy.sh
```

Select option **5) Invite user to inference app**

Enter the user's email address. They will receive:
- An email with a temporary password
- Instructions to set their own password on first login

## 5. Access the Application

Get the frontend URL:

```bash
./deploy.sh
```

Select option **6) Show frontend URLs**

The inference app URL will be displayed (format: `https://main.{app-id}.amplifyapp.com`).

### Using the Application

1. Log in with your credentials
2. Upload a long-leg radiograph (PNG, JPG, or DICOM)
3. Click **Analyze** to run inference
4. Review predicted landmarks overlaid on the image
5. Drag any landmark to refine its position
6. View LDFA, MPTA, and CPAK classification in the sidebar
7. Click **Export** to download an annotated image

---

## Destroy Stacks

To remove deployed resources:

```bash
./deploy.sh
```

Select option **7) Destroy stacks** and choose which stack(s) to destroy.

---

## Troubleshooting

### Prerequisites Check Failed

Run `./deploy.sh` to see which prerequisites are missing:
- Node.js 24+
- AWS CLI
- Docker (must be running)
- AWS credentials configured

### CDK Bootstrap Error

If CDK has never been used in your AWS account/region:

```bash
cd infra
npx cdk bootstrap
```

### Docker Build Timeout

The Lambda container image build can take several minutes on first run. Ensure Docker has sufficient resources allocated.
