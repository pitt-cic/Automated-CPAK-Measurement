"""
Launch SageMaker Hyperparameter Tuning job for CPAK keypoint detection.

Uses Bayesian optimization to find optimal hyperparameters.

Prerequisites:
1. AWS credentials configured (aws configure)
2. SageMaker execution role with S3 access
3. Data uploaded to S3 with structure:
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
    python launch_tuning.py --role <your-sagemaker-role-arn>
    python launch_tuning.py --role <arn> --max-jobs 30 --max-parallel-jobs 5
"""

import argparse
import sagemaker
from sagemaker.pytorch import PyTorch
from sagemaker.tuner import (
    HyperparameterTuner,
    ContinuousParameter,
    CategoricalParameter,
)


def get_hyperparameter_ranges():
    """Define tunable hyperparameter ranges for Bayesian optimization."""
    return {
        # Learning rate - narrower range, smaller dataset benefits from lower LR
        'lr': ContinuousParameter(1e-5, 5e-4, scaling_type='Logarithmic'),

        # Weight decay - stronger regularization for small dataset
        'weight-decay': ContinuousParameter(1e-5, 1e-3, scaling_type='Logarithmic'),

        # Batch size - smaller batches for 176 training images
        'batch-size': CategoricalParameter([4, 8, 16]),

        # Loss function weights
        'loss-alpha': ContinuousParameter(5.0, 20.0),
        'peak-weight': ContinuousParameter(0.5, 2.0),
        'aux-weight': ContinuousParameter(0.1, 0.4),

        # Model architecture - stick with 32 to reduce overfitting risk
        'base-channels': CategoricalParameter([32, 64]),

        # Heatmap generation - tighter range around default
        'sigma': ContinuousParameter(10.0, 16.0),
    }


def get_metric_definitions():
    """Define metrics for SageMaker to extract from training logs."""
    return [
        {'Name': 'train_loss', 'Regex': r'train_loss=([0-9\.]+);'},
        {'Name': 'val_loss', 'Regex': r'val_loss=([0-9\.]+);'},
        {'Name': 'final_val_loss', 'Regex': r'final_val_loss=([0-9\.]+);'},
    ]


def get_static_hyperparameters(args):
    """Return hyperparameters that are NOT tuned (fixed values)."""
    return {
        'epochs': args.epochs,
        'patience': args.patience,
        'heatmap-scale': args.heatmap_scale,
        'width': args.width,
        'height': args.height,
        'max-grad-norm': args.max_grad_norm,
        'cosine-t0': args.cosine_t0,
    }


def launch_tuning(args):
    """Launch the SageMaker hyperparameter tuning job."""
    session = sagemaker.Session()

    print(f"SageMaker session region: {session.boto_region_name}")
    print(f"Using role: {args.role}")
    print(f"S3 data path: {args.s3_data}")
    print(f"Max jobs: {args.max_jobs}, Max parallel: {args.max_parallel_jobs}")

    # Create base PyTorch estimator
    estimator = PyTorch(
        entry_point='train_sagemaker.py',
        source_dir='.',  # Current directory (sagemaker/)
        role=args.role,
        instance_count=1,
        instance_type=args.instance_type,
        framework_version='2.1.0',
        py_version='py310',
        hyperparameters=get_static_hyperparameters(args),
        output_path=f's3://{args.s3_bucket}/tuning-output',
        code_location=f's3://{args.s3_bucket}/code',
        max_run=args.max_run * 3600,  # Convert hours to seconds
        metric_definitions=get_metric_definitions(),
    )

    # Create HyperparameterTuner with Bayesian optimization
    tuner = HyperparameterTuner(
        estimator=estimator,
        objective_metric_name='val_loss',
        objective_type='Minimize',
        hyperparameter_ranges=get_hyperparameter_ranges(),
        metric_definitions=get_metric_definitions(),
        strategy='Bayesian',
        max_jobs=args.max_jobs,
        max_parallel_jobs=args.max_parallel_jobs,
        early_stopping_type='Auto',  # Stop poor trials early
        base_tuning_job_name='cpak-hpo',
    )

    print("\nStarting hyperparameter tuning job...")
    print(f"Tuning {len(get_hyperparameter_ranges())} hyperparameters")
    print(f"Objective: Minimize val_loss")

    tuner.fit({'training': args.s3_data})

    print(f"\nTuning job started: {tuner.latest_tuning_job.name}")
    print(f"\nMonitor at:")
    print(f"  https://{session.boto_region_name}.console.aws.amazon.com/sagemaker/home?region={session.boto_region_name}#/hyper-tuning-jobs")

    print(f"\nAfter completion, get best hyperparameters with:")
    print(f"  from sagemaker.tuner import HyperparameterTuner")
    print(f"  tuner = HyperparameterTuner.attach('{tuner.latest_tuning_job.name}')")
    print(f"  print(tuner.analytics().dataframe().sort_values('FinalObjectiveValue').head())")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Launch SageMaker HPO tuning job")

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

    # Tuning configuration
    parser.add_argument('--max-jobs', type=int, default=20,
                        help='Maximum total tuning jobs (default: 20)')
    parser.add_argument('--max-parallel-jobs', type=int, default=3,
                        help='Maximum parallel jobs (default: 3)')

    # Fixed hyperparameters (not tuned)
    parser.add_argument('--epochs', type=int, default=100,
                        help='Max epochs per trial (default: 100)')
    parser.add_argument('--patience', type=int, default=20,
                        help='Early stopping patience (default: 20)')
    parser.add_argument('--max-run', type=int, default=2,
                        help='Max runtime per job in hours (default: 2)')

    # Model architecture (fixed)
    parser.add_argument('--heatmap-scale', type=int, default=4)
    parser.add_argument('--width', type=int, default=256)
    parser.add_argument('--height', type=int, default=1024)

    # Training stability (fixed)
    parser.add_argument('--max-grad-norm', type=float, default=1.0,
                        help='Max gradient norm for clipping')
    parser.add_argument('--cosine-t0', type=int, default=20,
                        help='Cosine annealing restart period')

    args = parser.parse_args()

    print("=" * 60)
    print("CPAK SageMaker Hyperparameter Tuning (Bayesian)")
    print("=" * 60)
    print(f"\nConfiguration:")
    print(f"  Max jobs: {args.max_jobs}")
    print(f"  Max parallel: {args.max_parallel_jobs}")
    print(f"  Instance: {args.instance_type}")
    print(f"  Epochs per trial: {args.epochs}")
    print(f"  Max runtime per job: {args.max_run}h")

    launch_tuning(args)
