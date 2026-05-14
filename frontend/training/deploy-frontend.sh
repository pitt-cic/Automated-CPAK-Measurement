#!/bin/bash
# Deploy Amplify frontend with API URL injected
#
# This script should be run after `cdk deploy --mode training` completes.
# It reads the API URL from CloudFormation outputs and deploys
# the frontend to Amplify with the config injected.
#
# Usage: ./deploy-frontend.sh [--region us-east-1] [--stack CpakTrainingStack]

set -e

REGION="${AWS_DEFAULT_REGION:-us-east-1}"
STACK_NAME="CpakTrainingStack"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --region)
            REGION="$2"
            shift 2
            ;;
        --stack)
            STACK_NAME="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "=============================================="
echo "CPAK Reports Frontend Deployment"
echo "=============================================="
echo "Region: $REGION"
echo "Stack: $STACK_NAME"
echo ""

# Get outputs from CloudFormation stack
echo "[1/4] Getting stack outputs..."
API_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
    --output text)

AMPLIFY_APP_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='AmplifyAppId'].OutputValue" \
    --output text)

if [ -z "$API_URL" ] || [ -z "$AMPLIFY_APP_ID" ]; then
    echo "Error: Could not get stack outputs. Make sure 'cd infra && npm run deploy -- --mode training' has completed."
    exit 1
fi

echo "  API URL: $API_URL"
echo "  Amplify App ID: $AMPLIFY_APP_ID"

# Get the frontend directory (relative to this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR"

if [ ! -f "$FRONTEND_DIR/index.html" ]; then
    echo "Error: Frontend not found at $FRONTEND_DIR/index.html"
    exit 1
fi

# Create temp directory for deployment
echo "[2/4] Preparing frontend..."
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy and inject API URL into index.html
CONFIG_SCRIPT="<script>window.CONFIG = { API_URL: \"$API_URL\" };</script>"
sed "s|<head>|<head>\n    $CONFIG_SCRIPT|" "$FRONTEND_DIR/index.html" > "$TEMP_DIR/index.html"

# Create zip file
cd "$TEMP_DIR"
zip -q deployment.zip index.html

# Create deployment
echo "[3/4] Creating Amplify deployment..."
DEPLOYMENT=$(aws amplify create-deployment \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name main \
    --region "$REGION" \
    --output json)

JOB_ID=$(echo "$DEPLOYMENT" | python3 -c "import sys, json; print(json.load(sys.stdin)['jobId'])")
UPLOAD_URL=$(echo "$DEPLOYMENT" | python3 -c "import sys, json; print(json.load(sys.stdin)['zipUploadUrl'])")

# Upload zip to presigned URL
echo "[4/4] Uploading frontend..."
curl -s -X PUT -H "Content-Type: application/zip" --data-binary "@deployment.zip" "$UPLOAD_URL"

# Start deployment
aws amplify start-deployment \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name main \
    --job-id "$JOB_ID" \
    --region "$REGION" > /dev/null

AMPLIFY_URL="https://main.$AMPLIFY_APP_ID.amplifyapp.com"

echo ""
echo "=============================================="
echo "Deployment started successfully!"
echo "=============================================="
echo ""
echo "Website URL (available in ~2 minutes):"
echo "  $AMPLIFY_URL"
echo ""
echo "API Endpoints:"
echo "  - List reports: ${API_URL}reports"
echo "  - Get report:   ${API_URL}report/{filename}"
echo ""
