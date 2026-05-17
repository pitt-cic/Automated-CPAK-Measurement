import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import {Platform} from 'aws-cdk-lib/aws-ecr-assets';
import {Construct} from 'constructs';

export class InferenceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Cognito User Pool for authentication
        const userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: 'cpak-measurement-user-pool',
            selfSignUpEnabled: true,
            signInAliases: {
                email: true,
            },
            autoVerify: {
                email: true,
            },
            passwordPolicy: {
                minLength: 8,
                requireUppercase: true,
                requireLowercase: true,
                requireDigits: true,
                requireSymbols: false,
            },
            mfa: cognito.Mfa.OFF,
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // User Pool Client
        const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool,
            userPoolClientName: 'cpak-measurement-client',
            authFlows: {
                userSrp: true,
                userPassword: true,
            },
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
                callbackUrls: ['http://localhost:5173/', 'http://localhost:3000/'],
                logoutUrls: ['http://localhost:5173/', 'http://localhost:3000/'],
            },
            preventUserExistenceErrors: true,
        });

        // Log group for inference Lambda (auto-deleted with stack)
        const inferenceLogGroup = new logs.LogGroup(this, 'InferenceLogGroup', {
            logGroupName: '/aws/lambda/cpak-inference',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // CPAK Inference Lambda (container-based for PyTorch)
        const inferenceFunction = new lambda.DockerImageFunction(this, 'InferenceFunction', {
            code: lambda.DockerImageCode.fromImageAsset('../backend/lambda/inference', {
                platform: Platform.LINUX_AMD64,
            }),
            architecture: lambda.Architecture.X86_64,
            memorySize: 4096,
            timeout: cdk.Duration.seconds(29),
            functionName: 'cpak-inference',
            logGroup: inferenceLogGroup,
        });

        const api = new apigateway.RestApi(this, 'CpakApi', {
            restApiName: 'CPAK API',
            description: 'CPAK Measurement API',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: ['GET', 'POST', 'OPTIONS'],
                allowHeaders: ['Content-Type', 'Authorization'],
            },
        });

        // Cognito Authorizer for API Gateway
        const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CpakAuthorizer', {
            cognitoUserPools: [userPool],
            authorizerName: 'CpakCognitoAuthorizer',
        });

        const inferenceResource = api.root.addResource('inference');
        inferenceResource.addMethod('POST', new apigateway.LambdaIntegration(inferenceFunction), {
            authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        new cdk.CfnOutput(this, 'ApiUrl', {
            value: api.url,
            description: 'API Gateway URL',
        });

        // Amplify App (ready for Git connection)
        const amplifyApp = new amplify.CfnApp(this, 'AmplifyApp', {
            name: 'cpak-measurement-frontend',
            environmentVariables: [
                {name: 'VITE_USER_POOL_ID', value: userPool.userPoolId},
                {name: 'VITE_USER_POOL_CLIENT_ID', value: userPoolClient.userPoolClientId},
                {name: 'VITE_API_URL', value: api.url},
                {name: 'VITE_AWS_REGION', value: this.region},
            ],
            buildSpec: `version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend/inference
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/inference/dist
    files:
      - '**/*'
  cache:
    paths:
      - frontend/inference/node_modules/**/*`,
            customRules: [
                {
                    source: '</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>',
                    target: '/index.html',
                    status: '200',
                },
            ],
        });

        // Cognito Outputs
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: userPool.userPoolId,
            description: 'Cognito User Pool ID',
        });

        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
        });

        new cdk.CfnOutput(this, 'CognitoRegion', {
            value: this.region,
            description: 'AWS Region for Cognito',
        });

        // Amplify Output
        new cdk.CfnOutput(this, 'AmplifyAppId', {
            value: amplifyApp.attrAppId,
            description: 'Amplify App ID',
        });
    }
}
