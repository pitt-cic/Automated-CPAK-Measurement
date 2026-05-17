#!/usr/bin/env bash
set -euo pipefail

#
# deploy.sh - Interactive deployment and management script for CPAK
#

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$REPO_ROOT/infra"

# Color output helpers
print_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# Get CloudFormation stack output
get_stack_output() {
    local stack_name="$1"
    local output_key="$2"
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
        --output text 2>/dev/null
}

# Check if stack exists
stack_exists() {
    local stack_name="$1"
    aws cloudformation describe-stacks --stack-name "$stack_name" &>/dev/null
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    local failed=false

    # Node.js
    if command -v node &> /dev/null; then
        print_success "Node.js: $(node --version)"
    else
        print_error "Node.js is not installed. Install from https://nodejs.org/"
        failed=true
    fi

    # AWS CLI
    if command -v aws &> /dev/null; then
        print_success "AWS CLI: $(aws --version 2>&1 | cut -d' ' -f1)"
    else
        print_error "AWS CLI is not installed. Install from https://aws.amazon.com/cli/"
        failed=true
    fi

    # Docker (needed for inference Lambda container)
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            print_success "Docker: running"
        else
            print_error "Docker is installed but not running. Please start Docker."
            failed=true
        fi
    else
        print_error "Docker is not installed. Install from https://www.docker.com/"
        failed=true
    fi

    # AWS credentials
    if aws sts get-caller-identity &> /dev/null; then
        local account
        account=$(aws sts get-caller-identity --query 'Account' --output text)
        print_success "AWS credentials: Account $account"
    else
        print_error "AWS credentials not configured. Run 'aws configure' first."
        failed=true
    fi

    echo ""
    if [[ "$failed" == true ]]; then
        print_error "Please fix the issues above and try again."
        exit 1
    fi
}

# Deploy inference infrastructure
deploy_inference_infra() {
    print_info "Deploying inference infrastructure..."
    cd "$INFRA_DIR"
    npm install
    npm run build
    npx cdk deploy -c mode=inference
    print_success "Inference infrastructure deployed"
}

# Deploy training infrastructure
deploy_training_infra() {
    print_info "Deploying training infrastructure..."
    cd "$INFRA_DIR"
    npm install
    npm run build
    npx cdk deploy -c mode=training
    print_success "Training infrastructure deployed"
}

# Deploy inference frontend
deploy_inference_frontend() {
    print_info "Deploying inference frontend..."

    # Update .env with current stack outputs
    if stack_exists "CpakInferenceStack"; then
        print_info "Fetching Cognito config from stack..."
        local api_url user_pool_id client_id region
        api_url=$(get_stack_output "CpakInferenceStack" "ApiUrl")
        user_pool_id=$(get_stack_output "CpakInferenceStack" "UserPoolId")
        client_id=$(get_stack_output "CpakInferenceStack" "UserPoolClientId")
        region=$(get_stack_output "CpakInferenceStack" "CognitoRegion")

        cat > "$REPO_ROOT/frontend/inference/.env" << EOF
VITE_API_URL=$api_url
VITE_USER_POOL_ID=$user_pool_id
VITE_USER_POOL_CLIENT_ID=$client_id
VITE_AWS_REGION=$region
EOF
        print_success "Updated .env with stack outputs"
    fi

    cd "$REPO_ROOT/frontend/inference"
    npm install
    npm run build
    ./deploy-frontend.sh --skip-build
    print_success "Inference frontend deployed"
}

# Deploy training frontend
deploy_training_frontend() {
    print_info "Deploying training frontend..."
    cd "$REPO_ROOT/frontend/training"
    ./deploy-frontend.sh
    print_success "Training frontend deployed"
}

# Upload training data to S3
upload_training_data() {
    echo ""
    echo "Upload Training Data"
    echo ""

    if ! stack_exists "CpakTrainingStack"; then
        print_error "Training stack is not deployed. Deploy it first."
        return 1
    fi

    local bucket_name
    bucket_name=$(get_stack_output "CpakTrainingStack" "BucketName")

    if [[ -z "$bucket_name" ]]; then
        print_error "Could not get bucket name from stack outputs."
        return 1
    fi

    echo "Target bucket: $bucket_name"
    echo ""
    echo "Expected data structure:"
    echo "  your-folder/"
    echo "    output/"
    echo "      train/"
    echo "        images/"
    echo "        annotations.json"
    echo "      val/"
    echo "        images/"
    echo "        annotations.json"
    echo "      test/"
    echo "        images/"
    echo "        annotations.json"
    echo ""

    read -p "Enter path to your data folder: " data_path

    # Expand ~ if used
    data_path="${data_path/#\~/$HOME}"

    if [[ ! -d "$data_path" ]]; then
        print_error "Directory not found: $data_path"
        return 1
    fi

    echo ""
    print_info "Uploading $data_path to s3://$bucket_name/ ..."
    echo ""

    aws s3 sync "$data_path" "s3://$bucket_name/"

    echo ""
    print_success "Upload complete!"
    echo ""
    echo "Data uploaded to: s3://$bucket_name/"
}

# Invite user to Cognito
invite_user() {
    echo ""
    echo "Invite User to Inference App"
    echo ""

    if ! stack_exists "CpakInferenceStack"; then
        print_error "Inference stack is not deployed. Deploy it first."
        return 1
    fi

    local user_pool_id
    user_pool_id=$(get_stack_output "CpakInferenceStack" "UserPoolId")

    if [[ -z "$user_pool_id" ]]; then
        print_error "Could not get User Pool ID from stack outputs."
        return 1
    fi

    read -p "Enter the user's email address: " user_email

    # Basic email validation
    if [[ ! "$user_email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
        print_error "Invalid email format: $user_email"
        return 1
    fi

    echo ""
    print_info "Creating user in Cognito..."

    if aws cognito-idp admin-create-user \
        --user-pool-id "$user_pool_id" \
        --username "$user_email" \
        --user-attributes Name=email,Value="$user_email" Name=email_verified,Value=true \
        --desired-delivery-mediums EMAIL > /dev/null 2>&1; then

        echo ""
        print_success "User invited successfully!"
        echo ""
        echo "  Email: $user_email"
        echo "  A temporary password has been sent to their inbox."
        echo "  On first login, they will set their own password."
        echo ""
    else
        echo ""
        print_error "Failed to create user. The user may already exist."
        return 1
    fi
}

# Show frontend URLs
show_frontend_urls() {
    echo ""
    echo "Frontend URLs"
    echo ""

    # Inference frontend
    if stack_exists "CpakInferenceStack"; then
        local inference_app_id
        inference_app_id=$(get_stack_output "CpakInferenceStack" "AmplifyAppId")
        if [[ -n "$inference_app_id" ]]; then
            print_success "Inference App: https://main.$inference_app_id.amplifyapp.com"
        fi
    else
        echo "  Inference: (not deployed)"
    fi

    # Training frontend
    if stack_exists "CpakTrainingStack"; then
        local training_url
        training_url=$(get_stack_output "CpakTrainingStack" "AmplifyUrl")
        if [[ -n "$training_url" ]]; then
            print_success "Training Reports: $training_url"
        fi
    else
        echo "  Training: (not deployed)"
    fi

    echo ""
}

# Destroy stacks
destroy_stacks() {
    echo ""
    echo "Destroy Stacks"
    echo ""
    echo "  1) Destroy Inference stack"
    echo "  2) Destroy Training stack"
    echo "  3) Destroy both stacks"
    echo "  4) Cancel"
    echo ""
    read -p "Enter choice [1-4]: " destroy_choice
    echo ""

    cd "$INFRA_DIR"
    npm run build &>/dev/null

    case "$destroy_choice" in
        1)
            if stack_exists "CpakInferenceStack"; then
                print_info "Destroying inference stack..."
                npx cdk destroy -c mode=inference
                print_success "Inference stack destroyed"
            else
                print_error "Inference stack does not exist."
            fi
            ;;
        2)
            if stack_exists "CpakTrainingStack"; then
                print_info "Destroying training stack..."
                npx cdk destroy -c mode=training
                print_success "Training stack destroyed"
            else
                print_error "Training stack does not exist."
            fi
            ;;
        3)
            print_info "Destroying all stacks..."
            if stack_exists "CpakInferenceStack"; then
                npx cdk destroy -c mode=inference --force
            fi
            if stack_exists "CpakTrainingStack"; then
                npx cdk destroy -c mode=training --force
            fi
            print_success "All stacks destroyed"
            ;;
        4)
            echo "Cancelled."
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
}

# Show menu and get choice
show_menu() {
    echo ""
    echo "=================================="
    echo "  CPAK Management"
    echo "=================================="
    echo ""
    echo "  Deploy:"
    echo "    1) Inference (infrastructure + frontend)"
    echo "    2) Training (infrastructure + frontend)"
    echo "    3) Everything (both stacks + both frontends)"
    echo ""
    echo "  Manage:"
    echo "    4) Upload training data to S3"
    echo "    5) Invite user to inference app"
    echo "    6) Show frontend URLs"
    echo "    7) Destroy stacks"
    echo ""
    echo "    8) Exit"
    echo ""
    read -p "Enter choice [1-8]: " choice
    echo ""
}

# Main
main() {
    check_prerequisites
    show_menu

    case "$choice" in
        1)
            deploy_inference_infra
            echo ""
            deploy_inference_frontend
            ;;
        2)
            deploy_training_infra
            echo ""
            deploy_training_frontend
            ;;
        3)
            deploy_inference_infra
            echo ""
            deploy_training_infra
            echo ""
            deploy_inference_frontend
            echo ""
            deploy_training_frontend
            ;;
        4)
            upload_training_data
            ;;
        5)
            invite_user
            ;;
        6)
            show_frontend_urls
            ;;
        7)
            destroy_stacks
            ;;
        8)
            echo "Exiting."
            exit 0
            ;;
        *)
            print_error "Invalid choice: $choice"
            exit 1
            ;;
    esac

    echo ""
    echo "=================================="
    print_success "Done!"
    echo "=================================="
}

main
