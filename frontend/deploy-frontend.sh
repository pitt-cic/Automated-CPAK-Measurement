#!/usr/bin/env bash
set -euo pipefail

#
# deploy-frontend.sh - Deploy frontend to AWS Amplify
#
# Usage: npm run deploy [options]
#
# Options:
#   --branch NAME   Branch name for deployment (default: main)
#   --skip-build    Skip the build step (use existing dist/)
#   --no-wait       Don't wait for deployment to complete
#   --help          Show this help message
#

# Configuration
STACK_NAME="CpakInfraStack"
DEFAULT_BRANCH="main"
DIST_DIR="dist"
ZIP_FILE="/tmp/amplify-deploy-$$.zip"

# Output helper - all display output goes to stderr
out() {
    echo "$@" >&2
}

print_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1" >&2
}

print_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1" >&2
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1" >&2
}

print_warning() {
    echo -e "\033[0;33m[WARNING]\033[0m $1" >&2
}

# Show help message
show_help() {
    cat >&2 << 'EOF'
Usage: npm run deploy [-- options]

Deploys the frontend to AWS Amplify hosting.

Options:
  --branch NAME   Branch name for deployment (default: main)
  --skip-build    Skip the build step (use existing dist/)
  --no-wait       Don't wait for deployment to complete
  --help          Show this help message

Examples:
  npm run deploy                    # Build and deploy to main branch
  npm run deploy -- --skip-build    # Deploy existing build
  npm run deploy -- --branch dev    # Deploy to dev branch
EOF
    exit 0
}

# Cleanup function
cleanup() {
    if [[ -f "$ZIP_FILE" ]]; then
        rm -f "$ZIP_FILE"
    fi
}
trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed."
        out "  Install from: https://aws.amazon.com/cli/"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured or are invalid."
        out ""
        out "  Please configure your AWS credentials:"
        out "    aws configure"
        out ""
        exit 1
    fi

    # Check zip command
    if ! command -v zip &> /dev/null; then
        print_error "zip command is not installed."
        out "  Install with: sudo apt install zip (Ubuntu/Debian)"
        out "             or: brew install zip (macOS)"
        exit 1
    fi

    # Check curl command
    if ! command -v curl &> /dev/null; then
        print_error "curl command is not installed."
        exit 1
    fi

    print_success "Prerequisites check passed"
}

# Get CloudFormation output
get_cfn_output() {
    local output_key="$1"
    aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey==\`$output_key\`].OutputValue" \
        --output text 2>/dev/null
}

# Get Amplify App ID
get_amplify_app_id() {
    print_info "Fetching Amplify App ID from CloudFormation..."

    if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" &> /dev/null; then
        print_error "CloudFormation stack '$STACK_NAME' not found."
        out ""
        out "  The infrastructure stack must be deployed first."
        out "  To deploy the stack, run:"
        out ""
        out "    cd ../infra"
        out "    npm install"
        out "    cdk deploy"
        out ""
        exit 1
    fi

    AMPLIFY_APP_ID=$(get_cfn_output "AmplifyAppId")

    if [[ -z "$AMPLIFY_APP_ID" ]]; then
        print_error "Failed to get Amplify App ID from CloudFormation outputs."
        exit 1
    fi

    print_success "Amplify App ID: $AMPLIFY_APP_ID"
}

# Get AWS region
get_aws_region() {
    AWS_REGION=$(aws configure get region 2>/dev/null || echo "")
    if [[ -z "$AWS_REGION" ]]; then
        AWS_REGION=$(get_cfn_output "CognitoRegion")
    fi
    if [[ -z "$AWS_REGION" ]]; then
        AWS_REGION="us-east-1"
    fi
    print_info "Using AWS region: $AWS_REGION"
}

# Ensure branch exists
ensure_branch_exists() {
    local branch_name="$1"
    print_info "Checking if branch '$branch_name' exists..."

    # Check if branch exists
    if aws amplify get-branch --app-id "$AMPLIFY_APP_ID" --branch-name "$branch_name" &> /dev/null; then
        print_success "Branch '$branch_name' exists"
        return 0
    fi

    print_info "Creating branch '$branch_name'..."

    aws amplify create-branch \
        --app-id "$AMPLIFY_APP_ID" \
        --branch-name "$branch_name" \
        --stage PRODUCTION \
        --no-enable-auto-build \
        --output text > /dev/null

    print_success "Branch '$branch_name' created"
}

# Build frontend
build_frontend() {
    print_info "Building frontend..."

    # Check if .env exists
    if [[ ! -f ".env" ]]; then
        print_warning "No .env file found. Build may fail if environment variables are required."
        out "  Run 'npm run setup-dev' first to generate .env file."
    fi

    npm run build
    print_success "Frontend built successfully"
}

# Create deployment package
create_deployment_package() {
    print_info "Creating deployment package..."

    if [[ ! -d "$DIST_DIR" ]]; then
        print_error "Build directory '$DIST_DIR' not found."
        out "  Run 'npm run build' first or remove --skip-build flag."
        exit 1
    fi

    # Create zip file
    (cd "$DIST_DIR" && zip -r -q "$ZIP_FILE" .)

    local zip_size
    zip_size=$(du -h "$ZIP_FILE" | cut -f1)
    print_success "Deployment package created ($zip_size)"
}

# Deploy to Amplify
deploy_to_amplify() {
    local branch_name="$1"
    print_info "Creating Amplify deployment..."

    # Create deployment and get upload URL
    local deployment_response
    deployment_response=$(aws amplify create-deployment \
        --app-id "$AMPLIFY_APP_ID" \
        --branch-name "$branch_name" \
        --output json)

    local job_id
    local zip_upload_url
    job_id=$(echo "$deployment_response" | grep -o '"jobId"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4)
    zip_upload_url=$(echo "$deployment_response" | grep -o '"zipUploadUrl"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4)

    if [[ -z "$job_id" || -z "$zip_upload_url" ]]; then
        print_error "Failed to create deployment. Response:"
        out "$deployment_response"
        exit 1
    fi

    print_info "Job ID: $job_id"
    print_info "Uploading deployment package..."

    # Upload zip to presigned URL
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        --request PUT \
        --upload-file "$ZIP_FILE" \
        "$zip_upload_url")

    if [[ "$http_code" != "200" ]]; then
        print_error "Failed to upload deployment package. HTTP status: $http_code"
        exit 1
    fi

    print_success "Deployment package uploaded"

    # Start deployment
    print_info "Starting deployment..."
    aws amplify start-deployment \
        --app-id "$AMPLIFY_APP_ID" \
        --branch-name "$branch_name" \
        --job-id "$job_id" \
        --output text > /dev/null

    print_success "Deployment started"

    # Return job ID for status checking (stdout, will be captured)
    echo "$job_id"
}

# Wait for deployment to complete
wait_for_deployment() {
    local branch_name="$1"
    local job_id="$2"
    local max_attempts=60
    local attempt=0

    print_info "Waiting for deployment to complete..."

    while [[ $attempt -lt $max_attempts ]]; do
        local status
        status=$(aws amplify get-job \
            --app-id "$AMPLIFY_APP_ID" \
            --branch-name "$branch_name" \
            --job-id "$job_id" \
            --query 'job.summary.status' \
            --output text 2>/dev/null || echo "UNKNOWN")

        case "$status" in
            SUCCEED)
                out ""
                print_success "Deployment completed successfully!"
                return 0
                ;;
            FAILED)
                out ""
                print_error "Deployment failed."
                out ""
                out "  View logs in AWS Console:"
                out "  https://$AWS_REGION.console.aws.amazon.com/amplify/home?region=$AWS_REGION#/$AMPLIFY_APP_ID/$branch_name/$job_id"
                exit 1
                ;;
            CANCELLED)
                out ""
                print_error "Deployment was cancelled."
                exit 1
                ;;
            PENDING|PROVISIONING|RUNNING|UNKNOWN)
                printf "." >&2
                sleep 5
                ((++attempt))
                ;;
            *)
                printf "." >&2
                sleep 5
                ((++attempt))
                ;;
        esac
    done

    out ""
    print_warning "Timeout waiting for deployment to complete."
    out "  Check status in AWS Console:"
    out "  https://$AWS_REGION.console.aws.amazon.com/amplify/home?region=$AWS_REGION#/$AMPLIFY_APP_ID/$branch_name/$job_id"
}

# Get deployment URL
get_deployment_url() {
    local branch_name="$1"

    # Construct default Amplify URL
    local app_domain
    app_domain=$(aws amplify get-app \
        --app-id "$AMPLIFY_APP_ID" \
        --query 'app.defaultDomain' \
        --output text 2>/dev/null || echo "")

    if [[ -n "$app_domain" && "$app_domain" != "None" ]]; then
        echo "https://$branch_name.$app_domain"
    fi
}

# Main function
main() {
    local branch_name="$DEFAULT_BRANCH"
    local skip_build=false
    local wait_for_complete=true

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --branch)
                if [[ -n "${2:-}" ]]; then
                    branch_name="$2"
                    shift 2
                else
                    print_error "--branch requires a branch name"
                    exit 1
                fi
                ;;
            --skip-build)
                skip_build=true
                shift
                ;;
            --no-wait)
                wait_for_complete=false
                shift
                ;;
            --help|-h)
                show_help
                ;;
            *)
                print_error "Unknown option: $1"
                out "Use --help for usage information."
                exit 1
                ;;
        esac
    done

    out ""
    out "=================================="
    out "  Frontend Amplify Deployment"
    out "=================================="
    out ""

    # Check prerequisites
    check_prerequisites
    out ""

    # Get AWS region
    get_aws_region
    out ""

    # Get Amplify App ID
    get_amplify_app_id
    out ""

    # Ensure branch exists
    ensure_branch_exists "$branch_name"
    out ""

    # Build frontend (unless skipped)
    if [[ "$skip_build" == false ]]; then
        build_frontend
        out ""
    else
        print_info "Skipping build (--skip-build flag)"
        out ""
    fi

    # Create deployment package
    create_deployment_package
    out ""

    # Deploy to Amplify
    job_id=$(deploy_to_amplify "$branch_name")
    out ""

    # Wait for deployment
    if [[ "$wait_for_complete" == true ]]; then
        wait_for_deployment "$branch_name" "$job_id"
        out ""
    else
        print_info "Deployment in progress (--no-wait flag)"
        out "  Check status in AWS Console"
        out ""
    fi

    # Get and display deployment URL
    local deployment_url
    deployment_url=$(get_deployment_url "$branch_name")

    out "=================================="
    print_success "Deployment complete!"
    out "=================================="
    out ""
    if [[ -n "$deployment_url" ]]; then
        out "Your app is available at:"
        out ""
        out "  $deployment_url"
        out ""
    fi
}

# Run main
main "$@"
