"""
Lambda function for CPAK Reports API.

Endpoints:
- GET /reports - List all reports
- GET /report/{filename} - Get report HTML content

Deploy this as a Lambda function with API Gateway (HTTP API).
"""

import boto3
import json
import os

s3 = boto3.client('s3')

BUCKET = os.environ.get('S3_BUCKET', 'cpak2')
PREFIX = os.environ.get('S3_PREFIX', 'reports')


def lambda_handler(event, context):
    """Handle API Gateway requests."""
    print(f"Event: {json.dumps(event)}")

    # Get path and method
    path = event.get('rawPath', event.get('path', '/'))
    method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')

    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }

    # Handle CORS preflight
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        # Route: GET /reports
        if path == '/reports' or path == '/api/reports':
            return list_reports(headers)

        # Route: GET /report/{filename}
        if path.startswith('/report/') or path.startswith('/api/report/'):
            filename = path.split('/')[-1]
            return get_report(filename, headers)

        # 404
        return {
            'statusCode': 404,
            'headers': headers,
            'body': json.dumps({'error': 'Not found'})
        }

    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }


def list_reports(headers):
    """List all HTML reports in the S3 bucket."""
    reports = []

    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=BUCKET, Prefix=PREFIX):
        for obj in page.get('Contents', []):
            key = obj['Key']
            if key.endswith('.html') and 'index' not in key:
                name = key.split('/')[-1]
                reports.append({
                    'name': name,
                    'key': key,
                    'date': obj['LastModified'].isoformat(),
                    'size': obj['Size']
                })

    # Sort by date descending
    reports.sort(key=lambda x: x['date'], reverse=True)

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({'reports': reports, 'count': len(reports)})
    }


def get_report(filename, headers):
    """Get the HTML content of a specific report."""
    key = f'{PREFIX}/{filename}'

    try:
        response = s3.get_object(Bucket=BUCKET, Key=key)
        content = response['Body'].read().decode('utf-8')

        return {
            'statusCode': 200,
            'headers': {
                **headers,
                'Content-Type': 'text/html'
            },
            'body': content
        }
    except s3.exceptions.NoSuchKey:
        return {
            'statusCode': 404,
            'headers': headers,
            'body': json.dumps({'error': 'Report not found'})
        }
