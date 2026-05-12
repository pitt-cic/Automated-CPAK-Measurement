import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import { Construct } from 'constructs';
import * as path from 'path';

export class CpakStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ===========================================
    // S3 Bucket for training data and reports
    // ===========================================
    // Bucket name is auto-generated to ensure global uniqueness
    // The actual name will be in stack outputs (e.g., cpakinfrastack-cpakbucket-abc123)
    const bucket = new s3.Bucket(this, 'CpakBucket', {
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // ===========================================
    // SageMaker Execution Role
    // ===========================================
    const sagemakerRole = new iam.Role(this, 'SageMakerExecutionRole', {
      roleName: 'SageMakerCPAKRole',
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      description: 'Execution role for CPAK SageMaker training jobs',
    });

    // S3 permissions for training data and model artifacts
    sagemakerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:ListBucket',
        ],
        resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
      })
    );

    // CloudWatch Logs permissions
    sagemakerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogStreams',
        ],
        resources: ['arn:aws:logs:*:*:log-group:/aws/sagemaker/*'],
      })
    );

    // ECR permissions for pulling PyTorch container images
    sagemakerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage',
        ],
        resources: ['*'],
      })
    );

    // CloudWatch metrics permissions
    sagemakerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'cloudwatch:namespace': '/aws/sagemaker/TrainingJobs',
          },
        },
      })
    );

    // ===========================================
    // Lambda Function for Reports API
    // ===========================================
    const reportsLambda = new lambda.Function(this, 'ReportsApiLambda', {
      functionName: 'cpak-reports-api',
      runtime: lambda.Runtime.PYTHON_3_10,
      handler: 'lambda_api.lambda_handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/reports-api')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      description: 'API for listing and retrieving CPAK evaluation reports',
      environment: {
        S3_BUCKET: bucket.bucketName,
        S3_PREFIX: 'reports',
      },
    });

    // Grant Lambda read access to reports prefix
    bucket.grantRead(reportsLambda, 'reports/*');

    // ===========================================
    // API Gateway HTTP API
    // ===========================================
    const httpApi = new apigwv2.HttpApi(this, 'ReportsHttpApi', {
      apiName: 'cpak-reports-api',
      description: 'HTTP API for CPAK evaluation reports',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type'],
      },
    });

    const lambdaIntegration = new apigwv2_integrations.HttpLambdaIntegration(
      'LambdaIntegration',
      reportsLambda
    );

    // GET /reports - List all reports
    httpApi.addRoutes({
      path: '/reports',
      methods: [apigwv2.HttpMethod.GET],
      integration: lambdaIntegration,
    });

    // GET /report/{filename} - Get specific report content
    httpApi.addRoutes({
      path: '/report/{filename}',
      methods: [apigwv2.HttpMethod.GET],
      integration: lambdaIntegration,
    });

    // ===========================================
    // Amplify App for Frontend Dashboard
    // ===========================================
    const amplifyApp = new amplify.App(this, 'ReportsAmplifyApp', {
      appName: 'cpak-reports',
      description: 'CPAK Evaluation Reports Dashboard',
    });

    const mainBranch = amplifyApp.addBranch('main', {
      branchName: 'main',
      autoBuild: false,
    });

    // ===========================================
    // Stack Outputs
    // ===========================================
    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
      description: 'S3 bucket for training data and reports',
      exportName: 'CpakBucketName',
    });

    new cdk.CfnOutput(this, 'SageMakerRoleArn', {
      value: sagemakerRole.roleArn,
      description: 'SageMaker execution role ARN (use this in launch_training.py)',
      exportName: 'CpakSageMakerRoleArn',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.url!,
      description: 'API Gateway URL for reports API',
      exportName: 'CpakApiUrl',
    });

    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: amplifyApp.appId,
      description: 'Amplify App ID',
      exportName: 'CpakAmplifyAppId',
    });

    new cdk.CfnOutput(this, 'AmplifyUrl', {
      value: `https://main.${amplifyApp.appId}.amplifyapp.com`,
      description: 'Amplify website URL (available after frontend deployment)',
      exportName: 'CpakAmplifyUrl',
    });
  }
}
