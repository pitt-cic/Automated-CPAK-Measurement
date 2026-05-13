# CPAK Infrastructure CDK

AWS CDK stack for the CPAK SageMaker training pipeline infrastructure.

## Resources Created

- **S3 Bucket** (dynamically named) - Training data, model outputs, and evaluation reports  
- **SageMaker IAM Role** (`SageMakerCPAKRole`) - Execution role for training jobs
- **Lambda Function** (`cpak-reports-api`) - API for listing/retrieving reports
- **API Gateway HTTP API** (`cpak-reports-api`) - REST endpoints for the reports API
- **Amplify App** (`cpak-reports`) - Frontend dashboard hosting

## Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate credentials
- AWS CDK CLI: `npm install -g aws-cdk`

## Deployment

### 1. Install dependencies

```bash
cd sagemaker/cdk
npm install
```

### 2. Bootstrap CDK (first time only)

```bash
cdk bootstrap
```

### 3. Deploy infrastructure

```bash
cdk deploy
```

This creates all AWS resources. Note the outputs, especially `SageMakerRoleArn`.

### 4. Deploy frontend

After CDK deploy completes, run:

```bash
./deploy-frontend.sh
```

This injects the API URL into the frontend and deploys it to Amplify.

## Stack Outputs

After deployment, the stack exports:

| Output | Description |
|--------|-------------|
| `BucketName` | S3 bucket name |
| `SageMakerRoleArn` | Use this ARN in `launch_training.py --role` |
| `ApiUrl` | API Gateway endpoint URL |
| `AmplifyAppId` | Amplify application ID |
| `AmplifyUrl` | Frontend dashboard URL |

## Updating Training Scripts

After deploying, update your training scripts to use the new role ARN:

```bash
# Get the role ARN
aws cloudformation describe-stacks --stack-name CPAKTrainingStack \
  --query "Stacks[0].Outputs[?OutputKey=='SageMakerRoleArn'].OutputValue" \
  --output text

# Use it in training
python launch_training.py --role "arn:aws:iam::ACCOUNT:role/SageMakerCPAKRole" ...
```

## Useful Commands

- `npm run build` - Compile TypeScript
- `npm run cdk diff` - Show pending changes
- `npm run cdk synth` - Generate CloudFormation template
- `npm run cdk deploy` - Deploy stack
- `npm run deploy-frontend` - Deploy Amplify frontend

## Cleanup

To destroy all resources (except S3 bucket which has RETAIN policy):

```bash
cdk destroy
```
