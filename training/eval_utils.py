"""
Evaluation utilities for CPAK keypoint detection.
"""

import torch
import torch.nn.functional as F
import numpy as np
import json
import boto3
from datetime import datetime

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


def extract_keypoints_from_heatmaps(heatmaps, scale=1, use_subpixel=True, beta=100.0):
    """
    Extract keypoints from heatmaps with optional sub-pixel accuracy.

    Args:
        heatmaps: (B, K, H, W) tensor
        scale: factor to scale coordinates to input resolution
        use_subpixel: if True, use soft-argmax; if False, use hard argmax
        beta: soft-argmax temperature

    Returns:
        keypoints: (B, K, 2) tensor in input resolution
    """
    if use_subpixel:
        keypoints = soft_argmax(heatmaps, beta=beta)
        return keypoints * scale
    else:
        B, K, H, W = heatmaps.shape
        heatmaps_flat = heatmaps.view(B, K, -1)
        max_indices = heatmaps_flat.argmax(dim=2)
        y = max_indices // W
        x = max_indices % W
        keypoints = torch.stack([x * scale, y * scale], dim=2).float()
        return keypoints


def compute_euclidean_distance(pred, gt):
    return torch.sqrt(((pred - gt) ** 2).sum(dim=2))


def compute_oks(pred, gt, scales, sigmas=None):
    K = pred.shape[1]
    if sigmas is None:
        sigmas = np.full(K, 0.05)
    sigmas = np.array(sigmas)

    d_sq = ((pred - gt) ** 2).sum(dim=2).numpy()
    scales = np.array(scales).reshape(-1, 1)
    var = 2 * (scales ** 2) * (sigmas ** 2)
    oks_per_keypoint = np.exp(-d_sq / (var + 1e-8))
    oks_per_sample = oks_per_keypoint.mean(axis=1)

    return oks_per_keypoint, oks_per_sample


def evaluate_model(model, val_loader, device, heatmap_scale, width, height, use_subpixel=True):
    """Run evaluation on validation set and return metrics."""
    model.eval()

    all_distances = []
    all_pred_keypoints = []
    all_gt_keypoints = []
    all_scales = []

    with torch.no_grad():
        for batch in val_loader:
            images = batch['image'].to(device)
            gt_keypoints = batch['keypoints']

            heatmaps = model(images, return_aux=False)
            heatmaps = torch.clamp(heatmaps, 0, 1)

            pred_keypoints = extract_keypoints_from_heatmaps(
                heatmaps, scale=heatmap_scale, use_subpixel=use_subpixel
            )
            pred_keypoints = pred_keypoints.cpu()

            distances = compute_euclidean_distance(pred_keypoints, gt_keypoints)
            all_distances.append(distances)
            all_pred_keypoints.append(pred_keypoints)
            all_gt_keypoints.append(gt_keypoints)

            for i in range(gt_keypoints.shape[0]):
                kps = gt_keypoints[i]
                x_min, x_max = kps[:, 0].min().item(), kps[:, 0].max().item()
                y_min, y_max = kps[:, 1].min().item(), kps[:, 1].max().item()
                bbox_area = (x_max - x_min) * (y_max - y_min)
                all_scales.append(np.sqrt(bbox_area) if bbox_area > 0 else 1.0)

    # Aggregate results
    all_distances = torch.cat(all_distances, dim=0).numpy()
    all_pred_keypoints = torch.cat(all_pred_keypoints, dim=0)
    all_gt_keypoints = torch.cat(all_gt_keypoints, dim=0)
    all_scales = np.array(all_scales)

    # Compute OKS
    oks_per_keypoint, oks_per_sample = compute_oks(
        all_pred_keypoints, all_gt_keypoints, all_scales
    )

    # Scale to original coordinates
    avg_orig_w, avg_orig_h = 1024, 3600
    x_scale = (avg_orig_w / 2) / width
    y_scale = avg_orig_h / height
    scale_factor = np.sqrt(x_scale**2 + y_scale**2) / np.sqrt(2)
    scaled_distances = all_distances * scale_factor

    # Compute metrics
    mean_error = float(scaled_distances.mean())
    median_error = float(np.median(scaled_distances))
    rmse = float(np.sqrt((scaled_distances ** 2).mean()))
    mean_oks = float(oks_per_sample.mean())

    pck_values = {}
    for threshold in [10, 20, 30, 50]:
        pck_values[threshold] = float((scaled_distances < threshold).mean() * 100)

    per_kp_error = {name: float(scaled_distances[:, i].mean()) for i, name in enumerate(KEYPOINT_NAMES)}
    per_kp_oks = {name: float(oks_per_keypoint[:, i].mean()) for i, name in enumerate(KEYPOINT_NAMES)}
    per_kp_pck = {name: float((scaled_distances[:, i] < 20).mean() * 100) for i, name in enumerate(KEYPOINT_NAMES)}

    # Print results
    print(f"\nMean Error: {mean_error:.2f} px")
    print(f"Median Error: {median_error:.2f} px")
    print(f"RMSE: {rmse:.2f} px")
    print(f"Mean OKS: {mean_oks:.4f}")
    for t, v in pck_values.items():
        print(f"PCK@{t}: {v:.1f}%")

    return {
        'mean_error': mean_error,
        'median_error': median_error,
        'rmse': rmse,
        'mean_oks': mean_oks,
        'pck': pck_values,
        'num_samples': len(all_scales),
        'per_keypoint_error': per_kp_error,
        'per_keypoint_oks': per_kp_oks,
        'per_keypoint_pck': per_kp_pck,
    }


def generate_html_report(results, training_job_name, best_epoch, hyperparameters=None):
    """Generate HTML report string."""
    def progress_bar(value, max_val=100, color='#4CAF50'):
        pct = min(value / max_val * 100, 100)
        return f'''
        <div class="progress-container">
            <div class="progress-bar" style="width: {pct}%; background: {color};"></div>
            <span class="progress-text">{value:.1f}{'%' if max_val == 100 else ''}</span>
        </div>
        '''

    def oks_bar(value):
        pct = value * 100
        if value >= 0.75:
            color = '#4CAF50'
        elif value >= 0.5:
            color = '#FFC107'
        else:
            color = '#f44336'
        return f'''
        <div class="progress-container">
            <div class="progress-bar" style="width: {pct}%; background: {color};"></div>
            <span class="progress-text">{value:.4f}</span>
        </div>
        '''

    def pck_color(pct):
        if pct >= 80:
            return '#4CAF50'
        elif pct >= 60:
            return '#8BC34A'
        elif pct >= 40:
            return '#FFC107'
        else:
            return '#f44336'

    pck_values = results['pck']
    per_kp_error = results['per_keypoint_error']
    per_kp_oks = results['per_keypoint_oks']
    per_kp_pck = results['per_keypoint_pck']

    # Generate hyperparameters section if provided
    if hyperparameters:
        hyperparam_items = ''
        for key, value in hyperparameters.items():
            # Format the value nicely
            if isinstance(value, float):
                if value < 0.001:
                    formatted_value = f"{value:.2e}"
                else:
                    formatted_value = f"{value:.4g}"
            else:
                formatted_value = str(value)

            # Convert key to display name
            display_name = key.replace('_', ' ').replace('-', ' ')

            hyperparam_items += f'''
                <div class="hyperparam-item">
                    <div class="param-name">{display_name}</div>
                    <div class="param-value">{formatted_value}</div>
                </div>
            '''

        hyperparam_section = f'''
        <div class="card">
            <h2>Hyperparameters</h2>
            <div class="hyperparam-grid">
                {hyperparam_items}
            </div>
        </div>
        '''
    else:
        hyperparam_section = ''

    keypoint_rows = ''
    for name in KEYPOINT_NAMES:
        error = per_kp_error[name]
        oks = per_kp_oks[name]
        pck = per_kp_pck[name]
        keypoint_rows += f'''
        <tr>
            <td class="keypoint-name">{name.replace('_', ' ').title()}</td>
            <td class="metric-value">{error:.2f} px</td>
            <td>{progress_bar(pck, 100, pck_color(pck))}</td>
            <td>{oks_bar(oks)}</td>
        </tr>
        '''

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CPAK Evaluation Report - {training_job_name}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            padding: 40px 20px;
            color: #e0e0e0;
        }}
        .container {{ max-width: 1000px; margin: 0 auto; }}
        .header {{ text-align: center; margin-bottom: 40px; }}
        .header h1 {{ font-size: 2.5rem; color: #fff; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }}
        .header .subtitle {{ color: #888; font-size: 1rem; }}
        .card {{
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }}
        .card h2 {{ font-size: 1.4rem; color: #fff; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid rgba(255,255,255,0.1); }}
        .metrics-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }}
        .metric-box {{ background: rgba(255,255,255,0.03); border-radius: 12px; padding: 20px; text-align: center; }}
        .metric-box .label {{ font-size: 0.85rem; color: #888; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }}
        .metric-box .value {{ font-size: 2rem; font-weight: 700; color: #fff; }}
        .metric-box .unit {{ font-size: 1rem; color: #666; }}
        .progress-container {{ background: rgba(255,255,255,0.1); border-radius: 10px; height: 28px; position: relative; overflow: hidden; }}
        .progress-bar {{ height: 100%; border-radius: 10px; transition: width 0.5s ease; }}
        .progress-text {{ position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-weight: 600; font-size: 0.9rem; color: #fff; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); }}
        .pck-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }}
        .pck-item {{ text-align: center; }}
        .pck-item .threshold {{ font-size: 0.9rem; color: #888; margin-bottom: 8px; }}
        table {{ width: 100%; border-collapse: collapse; }}
        th {{ text-align: left; padding: 15px 10px; color: #888; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid rgba(255,255,255,0.1); }}
        td {{ padding: 15px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }}
        .keypoint-name {{ font-weight: 500; color: #fff; }}
        .metric-value {{ color: #888; font-family: 'Courier New', monospace; }}
        .footer {{ text-align: center; margin-top: 40px; color: #666; font-size: 0.85rem; }}
        .oks-circle {{
            width: 120px; height: 120px; border-radius: 50%;
            background: conic-gradient(
                {'#4CAF50' if results['mean_oks'] >= 0.75 else '#FFC107' if results['mean_oks'] >= 0.5 else '#f44336'} {results['mean_oks'] * 360}deg,
                rgba(255,255,255,0.1) 0deg
            );
            display: flex; align-items: center; justify-content: center; position: relative; margin: 0 auto;
        }}
        .oks-circle::before {{ content: ''; position: absolute; width: 90px; height: 90px; background: #1a1a2e; border-radius: 50%; }}
        .oks-value {{ position: relative; z-index: 1; font-size: 1.5rem; font-weight: 700; color: #fff; }}
        .info-badge {{ display: inline-block; background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; margin-right: 10px; margin-bottom: 10px; }}
        .job-name {{ font-family: 'Courier New', monospace; font-size: 0.9rem; color: #4CAF50; word-break: break-all; }}
        .hyperparam-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; }}
        .hyperparam-item {{ background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px 15px; }}
        .hyperparam-item .param-name {{ font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }}
        .hyperparam-item .param-value {{ font-size: 1.1rem; color: #fff; font-family: 'Courier New', monospace; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CPAK Evaluation Report</h1>
            <p class="subtitle">Keypoint Detection Model Performance</p>
        </div>
        <div class="card">
            <h2>Model Information</h2>
            <div>
                <span class="info-badge">Epoch: {best_epoch}</span>
                <span class="info-badge">Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</span>
                <span class="info-badge">Samples: {results['num_samples']}</span>
            </div>
            <div style="margin-top: 15px;">
                <span style="color: #888;">Training Job:</span>
                <span class="job-name">{training_job_name}</span>
            </div>
        </div>
        <div class="card">
            <h2>Overall Metrics</h2>
            <div class="metrics-grid">
                <div class="metric-box">
                    <div class="label">Mean Error</div>
                    <div class="value">{results['mean_error']:.2f}<span class="unit"> px</span></div>
                </div>
                <div class="metric-box">
                    <div class="label">Median Error</div>
                    <div class="value">{results['median_error']:.2f}<span class="unit"> px</span></div>
                </div>
                <div class="metric-box">
                    <div class="label">RMSE</div>
                    <div class="value">{results['rmse']:.2f}<span class="unit"> px</span></div>
                </div>
                <div class="metric-box">
                    <div class="label">Mean OKS</div>
                    <div class="oks-circle">
                        <span class="oks-value">{results['mean_oks']:.3f}</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="card">
            <h2>Percentage of Correct Keypoints (PCK)</h2>
            <div class="pck-grid">
                <div class="pck-item">
                    <div class="threshold">PCK@10</div>
                    {progress_bar(pck_values[10], 100, pck_color(pck_values[10]))}
                </div>
                <div class="pck-item">
                    <div class="threshold">PCK@20</div>
                    {progress_bar(pck_values[20], 100, pck_color(pck_values[20]))}
                </div>
                <div class="pck-item">
                    <div class="threshold">PCK@30</div>
                    {progress_bar(pck_values[30], 100, pck_color(pck_values[30]))}
                </div>
                <div class="pck-item">
                    <div class="threshold">PCK@50</div>
                    {progress_bar(pck_values[50], 100, pck_color(pck_values[50]))}
                </div>
            </div>
        </div>
        <div class="card">
            <h2>Per-Keypoint Performance</h2>
            <table>
                <thead>
                    <tr>
                        <th>Keypoint</th>
                        <th>Mean Error</th>
                        <th>PCK@20</th>
                        <th>OKS</th>
                    </tr>
                </thead>
                <tbody>
                    {keypoint_rows}
                </tbody>
            </table>
        </div>
        {hyperparam_section}
        <div class="footer">
            <p>CPAK Automated Measurement System</p>
        </div>
    </div>
</body>
</html>
'''
    return html


def upload_report_to_s3(results, job_name, bucket, best_epoch, hyperparameters=None):
    """Generate HTML report and upload to S3."""
    print(f"\nUploading evaluation report to s3://{bucket}/reports/")

    try:
        s3 = boto3.client('s3')

        # Generate HTML
        html = generate_html_report(results, job_name, best_epoch, hyperparameters)

        # Upload HTML report
        report_key = f"reports/eval_{job_name}.html"
        s3.put_object(
            Bucket=bucket,
            Key=report_key,
            Body=html.encode('utf-8'),
            ContentType='text/html'
        )
        print(f"HTML report uploaded: s3://{bucket}/{report_key}")

        # Upload JSON results
        json_key = f"reports/eval_{job_name}.json"
        s3.put_object(
            Bucket=bucket,
            Key=json_key,
            Body=json.dumps(results, indent=2).encode('utf-8'),
            ContentType='application/json'
        )
        print(f"JSON results uploaded: s3://{bucket}/{json_key}")

    except Exception as e:
        print(f"Warning: Failed to upload report to S3: {e}")
        print("Evaluation results are still available in the training logs above.")