"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CpakStack = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const iam = require("aws-cdk-lib/aws-iam");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigwv2 = require("aws-cdk-lib/aws-apigatewayv2");
const apigwv2_integrations = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const amplify = require("@aws-cdk/aws-amplify-alpha");
const path = require("path");
class CpakStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // ===========================================
        // S3 Bucket for training data and reports
        // ===========================================
        const bucket = new s3.Bucket(this, 'CpakBucket', {
            bucketName: 'cpak2',
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
        sagemakerRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket',
            ],
            resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
        }));
        // CloudWatch Logs permissions
        sagemakerRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogStreams',
            ],
            resources: ['arn:aws:logs:*:*:log-group:/aws/sagemaker/*'],
        }));
        // ECR permissions for pulling PyTorch container images
        sagemakerRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ecr:GetAuthorizationToken',
                'ecr:BatchCheckLayerAvailability',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
            ],
            resources: ['*'],
        }));
        // CloudWatch metrics permissions
        sagemakerRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['cloudwatch:PutMetricData'],
            resources: ['*'],
            conditions: {
                StringEquals: {
                    'cloudwatch:namespace': '/aws/sagemaker/TrainingJobs',
                },
            },
        }));
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
        const lambdaIntegration = new apigwv2_integrations.HttpLambdaIntegration('LambdaIntegration', reportsLambda);
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
            value: httpApi.url,
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
exports.CpakStack = CpakStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Bhay1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9jcGFrLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyx5Q0FBeUM7QUFDekMsMkNBQTJDO0FBQzNDLGlEQUFpRDtBQUNqRCx3REFBd0Q7QUFDeEQsa0ZBQWtGO0FBQ2xGLHNEQUFzRDtBQUV0RCw2QkFBNkI7QUFFN0IsTUFBYSxTQUFVLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDdEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qiw4Q0FBOEM7UUFDOUMsMENBQTBDO1FBQzFDLDhDQUE4QztRQUM5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUMvQyxVQUFVLEVBQUUsT0FBTztZQUNuQixTQUFTLEVBQUUsS0FBSztZQUNoQixVQUFVLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVU7WUFDMUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTTtZQUN2QyxpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxJQUFJLEVBQUU7Z0JBQ0o7b0JBQ0UsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUM7b0JBQ3BDLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQztvQkFDckIsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDO2lCQUN0QjthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsOENBQThDO1FBQzlDLDJCQUEyQjtRQUMzQiw4Q0FBOEM7UUFDOUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNqRSxRQUFR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QUksRUFBRSxZQUFZLEVBQUU7WUFDcEMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxVQUFVO1lBQ3hCLFdBQVcsRUFBRSx5Q0FBeUM7WUFDdEQsVUFBVSxFQUFFLGdCQUFnQjtTQUM3QixDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzFDLEtBQUssRUFBRSxhQUFhLENBQUMsT0FBTztZQUM1QixXQUFXLEVBQUUsK0RBQStEO1lBQzVFLFVBQVUsRUFBRSxzQkFBc0I7U0FDbkMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDaEMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxHQUFJO1lBQ25CLFdBQVcsRUFBRSxpQ0FBaUM7WUFDOUMsVUFBVSxFQUFFLFlBQVk7U0FDekIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDdEMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLO1lBQ3ZCLFdBQVcsRUFBRSxnQkFBZ0I7WUFDN0IsVUFBVSxFQUFFLGtCQUFrQjtTQUMvQixDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNwQyxLQUFLLEVBQUUsZ0JBQWdCLFVBQVUsQ0FBQyxLQUFLLGlCQUFpQjtZQUN4RCxXQUFXLEVBQUUsMkRBQTJEO1lBQ3hFLFVBQVUsRUFBRSxnQkFBZ0I7U0FDN0IsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBNUxELDhCQTRMQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgYXBpZ3d2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJztcbmltcG9ydCAqIGFzIGFwaWd3djJfaW50ZWdyYXRpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcbmltcG9ydCAqIGFzIGFtcGxpZnkgZnJvbSAnQGF3cy1jZGsvYXdzLWFtcGxpZnktYWxwaGEnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgY2xhc3MgQ3Bha1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFMzIEJ1Y2tldCBmb3IgdHJhaW5pbmcgZGF0YSBhbmQgcmVwb3J0c1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBjb25zdCBidWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdDcGFrQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogJ2NwYWsyJyxcbiAgICAgIHZlcnNpb25lZDogZmFsc2UsXG4gICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgY29yczogW1xuICAgICAgICB7XG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtzMy5IdHRwTWV0aG9kcy5HRVRdLFxuICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSxcbiAgICAgICAgICBhbGxvd2VkSGVhZGVyczogWycqJ10sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFNhZ2VNYWtlciBFeGVjdXRpb24gUm9sZVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBjb25zdCBzYWdlbWFrZXJSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdTYWdlTWFrZXJFeGVjdXRpb25Sb2xlJywge1xuICAgICAgcm9sZU5hbWU6ICdTYWdlTWFrZXJDUEFLUm9sZScsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnc2FnZW1ha2VyLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRXhlY3V0aW9uIHJvbGUgZm9yIENQQUsgU2FnZU1ha2VyIHRyYWluaW5nIGpvYnMnLFxuICAgIH0pO1xuXG4gICAgLy8gUzMgcGVybWlzc2lvbnMgZm9yIHRyYWluaW5nIGRhdGEgYW5kIG1vZGVsIGFydGlmYWN0c1xuICAgIHNhZ2VtYWtlclJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdzMzpHZXRPYmplY3QnLFxuICAgICAgICAgICdzMzpQdXRPYmplY3QnLFxuICAgICAgICAgICdzMzpEZWxldGVPYmplY3QnLFxuICAgICAgICAgICdzMzpMaXN0QnVja2V0JyxcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbYnVja2V0LmJ1Y2tldEFybiwgYCR7YnVja2V0LmJ1Y2tldEFybn0vKmBdLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gQ2xvdWRXYXRjaCBMb2dzIHBlcm1pc3Npb25zXG4gICAgc2FnZW1ha2VyUm9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nR3JvdXAnLFxuICAgICAgICAgICdsb2dzOkNyZWF0ZUxvZ1N0cmVhbScsXG4gICAgICAgICAgJ2xvZ3M6UHV0TG9nRXZlbnRzJyxcbiAgICAgICAgICAnbG9nczpEZXNjcmliZUxvZ1N0cmVhbXMnLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFsnYXJuOmF3czpsb2dzOio6Kjpsb2ctZ3JvdXA6L2F3cy9zYWdlbWFrZXIvKiddLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gRUNSIHBlcm1pc3Npb25zIGZvciBwdWxsaW5nIFB5VG9yY2ggY29udGFpbmVyIGltYWdlc1xuICAgIHNhZ2VtYWtlclJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdlY3I6R2V0QXV0aG9yaXphdGlvblRva2VuJyxcbiAgICAgICAgICAnZWNyOkJhdGNoQ2hlY2tMYXllckF2YWlsYWJpbGl0eScsXG4gICAgICAgICAgJ2VjcjpHZXREb3dubG9hZFVybEZvckxheWVyJyxcbiAgICAgICAgICAnZWNyOkJhdGNoR2V0SW1hZ2UnLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gQ2xvdWRXYXRjaCBtZXRyaWNzIHBlcm1pc3Npb25zXG4gICAgc2FnZW1ha2VyUm9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbJ2Nsb3Vkd2F0Y2g6UHV0TWV0cmljRGF0YSddLFxuICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgICBjb25kaXRpb25zOiB7XG4gICAgICAgICAgU3RyaW5nRXF1YWxzOiB7XG4gICAgICAgICAgICAnY2xvdWR3YXRjaDpuYW1lc3BhY2UnOiAnL2F3cy9zYWdlbWFrZXIvVHJhaW5pbmdKb2JzJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIExhbWJkYSBGdW5jdGlvbiBmb3IgUmVwb3J0cyBBUElcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgY29uc3QgcmVwb3J0c0xhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1JlcG9ydHNBcGlMYW1iZGEnLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6ICdjcGFrLXJlcG9ydHMtYXBpJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEwLFxuICAgICAgaGFuZGxlcjogJ2xhbWJkYV9hcGkubGFtYmRhX2hhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9sYW1iZGEvcmVwb3J0cy1hcGknKSksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBmb3IgbGlzdGluZyBhbmQgcmV0cmlldmluZyBDUEFLIGV2YWx1YXRpb24gcmVwb3J0cycsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTM19CVUNLRVQ6IGJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgICBTM19QUkVGSVg6ICdyZXBvcnRzJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBMYW1iZGEgcmVhZCBhY2Nlc3MgdG8gcmVwb3J0cyBwcmVmaXhcbiAgICBidWNrZXQuZ3JhbnRSZWFkKHJlcG9ydHNMYW1iZGEsICdyZXBvcnRzLyonKTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBBUEkgR2F0ZXdheSBIVFRQIEFQSVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBjb25zdCBodHRwQXBpID0gbmV3IGFwaWd3djIuSHR0cEFwaSh0aGlzLCAnUmVwb3J0c0h0dHBBcGknLCB7XG4gICAgICBhcGlOYW1lOiAnY3Bhay1yZXBvcnRzLWFwaScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0hUVFAgQVBJIGZvciBDUEFLIGV2YWx1YXRpb24gcmVwb3J0cycsXG4gICAgICBjb3JzUHJlZmxpZ2h0OiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogWycqJ10sXG4gICAgICAgIGFsbG93TWV0aG9kczogW1xuICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuR0VULFxuICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuT1BUSU9OUyxcbiAgICAgICAgXSxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZSddLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGxhbWJkYUludGVncmF0aW9uID0gbmV3IGFwaWd3djJfaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbihcbiAgICAgICdMYW1iZGFJbnRlZ3JhdGlvbicsXG4gICAgICByZXBvcnRzTGFtYmRhXG4gICAgKTtcblxuICAgIC8vIEdFVCAvcmVwb3J0cyAtIExpc3QgYWxsIHJlcG9ydHNcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL3JlcG9ydHMnLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IGxhbWJkYUludGVncmF0aW9uLFxuICAgIH0pO1xuXG4gICAgLy8gR0VUIC9yZXBvcnQve2ZpbGVuYW1lfSAtIEdldCBzcGVjaWZpYyByZXBvcnQgY29udGVudFxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvcmVwb3J0L3tmaWxlbmFtZX0nLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IGxhbWJkYUludGVncmF0aW9uLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEFtcGxpZnkgQXBwIGZvciBGcm9udGVuZCBEYXNoYm9hcmRcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgY29uc3QgYW1wbGlmeUFwcCA9IG5ldyBhbXBsaWZ5LkFwcCh0aGlzLCAnUmVwb3J0c0FtcGxpZnlBcHAnLCB7XG4gICAgICBhcHBOYW1lOiAnY3Bhay1yZXBvcnRzJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ1BBSyBFdmFsdWF0aW9uIFJlcG9ydHMgRGFzaGJvYXJkJyxcbiAgICB9KTtcblxuICAgIGNvbnN0IG1haW5CcmFuY2ggPSBhbXBsaWZ5QXBwLmFkZEJyYW5jaCgnbWFpbicsIHtcbiAgICAgIGJyYW5jaE5hbWU6ICdtYWluJyxcbiAgICAgIGF1dG9CdWlsZDogZmFsc2UsXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gU3RhY2sgT3V0cHV0c1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiBidWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgYnVja2V0IGZvciB0cmFpbmluZyBkYXRhIGFuZCByZXBvcnRzJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdDcGFrQnVja2V0TmFtZScsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU2FnZU1ha2VyUm9sZUFybicsIHtcbiAgICAgIHZhbHVlOiBzYWdlbWFrZXJSb2xlLnJvbGVBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ1NhZ2VNYWtlciBleGVjdXRpb24gcm9sZSBBUk4gKHVzZSB0aGlzIGluIGxhdW5jaF90cmFpbmluZy5weSknLFxuICAgICAgZXhwb3J0TmFtZTogJ0NwYWtTYWdlTWFrZXJSb2xlQXJuJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlVcmwnLCB7XG4gICAgICB2YWx1ZTogaHR0cEFwaS51cmwhLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBVUkwgZm9yIHJlcG9ydHMgQVBJJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdDcGFrQXBpVXJsJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBbXBsaWZ5QXBwSWQnLCB7XG4gICAgICB2YWx1ZTogYW1wbGlmeUFwcC5hcHBJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQW1wbGlmeSBBcHAgSUQnLFxuICAgICAgZXhwb3J0TmFtZTogJ0NwYWtBbXBsaWZ5QXBwSWQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FtcGxpZnlVcmwnLCB7XG4gICAgICB2YWx1ZTogYGh0dHBzOi8vbWFpbi4ke2FtcGxpZnlBcHAuYXBwSWR9LmFtcGxpZnlhcHAuY29tYCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQW1wbGlmeSB3ZWJzaXRlIFVSTCAoYXZhaWxhYmxlIGFmdGVyIGZyb250ZW5kIGRlcGxveW1lbnQpJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdDcGFrQW1wbGlmeVVybCcsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==