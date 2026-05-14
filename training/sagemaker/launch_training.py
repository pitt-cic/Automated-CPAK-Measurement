"""
Launch SageMaker training job for CPAK keypoint detection.

Prerequisites:
1. AWS credentials configured (aws configure)
2. SageMaker execution role with S3 access
3. Data uploaded to s3://{CPAK BUCKET}/ with structure:
   ├── output/
            train/
                images/
                annotations.json
            val/
                images/
                annotations.json
            test/
                images/
                annotations.json
4. SAGEMAKER PYTHON SDK VERSION 2, NOT 3 (e.g. pip install sagemaker==2.257.1)

Usage:
    python launch_training.py --role <your-sagemaker-role-arn>
"""


import argparse
import sagemaker
from sagemaker.pytorch import PyTorch


def launch_training(args):
    # Create SageMaker session
    session = sagemaker.Session()

    print(f"SageMaker session region: {session.boto_region_name}")
    print(f"Using role: {args.role}")
    print(f"S3 data path: {args.s3_data}")

    # Define the PyTorch estimator
    estimator = PyTorch(
        entry_point='train_sagemaker.py',
        source_dir='.',  # Current directory (sagemaker/)
        role=args.role,
        instance_count=1,
        instance_type=args.instance_type,
        framework_version='2.1.0',
        py_version='py310',
        hyperparameters={
            'epochs': args.epochs,
            'batch-size': args.batch_size,
            'lr': args.lr,
            'heatmap-scale': args.heatmap_scale,
            'base-channels': args.base_channels,
            'width': args.width,
            'height': args.height,
            'sigma': args.sigma,
            'loss-alpha': args.loss_alpha,
            'peak-weight': args.peak_weight,
            'aux-weight': args.aux_weight,
            'weight-decay': args.weight_decay,
            'patience': args.patience,
            'max-grad-norm': args.max_grad_norm,
            'cosine-t0': args.cosine_t0,
            'use-keypoint-weights': args.use_keypoint_weights,
        },
        output_path=f's3://{args.s3_bucket}/model-output',
        code_location=f's3://{args.s3_bucket}/code',
        max_run=args.max_run * 3600,  # Convert hours to seconds
    )

    # Start training
    print("\nStarting training job...")
    estimator.fit({'training': args.s3_data}, job_name=args.job_name)

    print(f"\nTraining complete!")
    print(f"Model artifacts: {estimator.model_data}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Launch SageMaker training job")

    # Required
    parser.add_argument('--role', type=str, required=True,
                        help='SageMaker execution role ARN (e.g., arn:aws:iam::123456789:role/SageMakerRole)')

    # S3 paths
    parser.add_argument('--s3-bucket', type=str, default='cpak',
                        help='S3 bucket name (default: cpak)')
    parser.add_argument('--s3-data', type=str, default='s3://cpak/',
                        help='S3 path to training data (default: s3://cpak/)')

    # Instance
    parser.add_argument('--instance-type', type=str, default='ml.g4dn.xlarge',
                        help='SageMaker instance type (default: ml.g4dn.xlarge)')
    parser.add_argument('--job-name', type=str, default=None,
                        help='Custom training job name (default: pytorch-training-{timestamp})')

    # Training params
    parser.add_argument('--epochs', type=int, default=100)
    parser.add_argument('--batch-size', type=int, default=2)
    parser.add_argument('--lr', type=float, default=3e-4)
    parser.add_argument('--weight-decay', type=float, default=1e-5)
    parser.add_argument('--patience', type=int, default=20,
                        help='Early stopping patience (default: 20)')
    parser.add_argument('--max-run', type=int, default=4,
                        help='Max runtime in hours (default: 4)')
    parser.add_argument('--max-grad-norm', type=float, default=1.0,
                        help='Max gradient norm for clipping (default: 1.0)')
    parser.add_argument('--cosine-t0', type=int, default=20,
                        help='Cosine annealing restart period (default: 20)')

    # Model params
    parser.add_argument('--heatmap-scale', type=int, default=2)
    parser.add_argument('--base-channels', type=int, default=16)
    parser.add_argument('--width', type=int, default=384)
    parser.add_argument('--height', type=int, default=2688)
    parser.add_argument('--sigma', type=float, default=10.0,
                        help='Gaussian heatmap spread (default: 10.0)')

    # Loss params
    parser.add_argument('--loss-alpha', type=float, default=10.0,
                        help='Weighting for peak regions in loss (default: 10.0)')
    parser.add_argument('--peak-weight', type=float, default=0.10,
                        help='Weight for explicit peak penalty (default: 0.10)')
    parser.add_argument('--aux-weight', type=float, default=0.3,
                        help='Weight for auxiliary head loss (default: 0.3)')
    parser.add_argument('--use-keypoint-weights', action='store_true',
                        help='Use per-keypoint loss weights (higher for inner/outer_upper)')

    args = parser.parse_args()

    print("=" * 60)
    print("CPAK SageMaker Training Launcher")
    print("=" * 60)

    launch_training(args)
