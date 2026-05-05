import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as path from 'path';
import {Construct} from 'constructs';

export class InfraStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const helloWorldFunction = new lambda.Function(this, 'HelloWorldFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'handler.handler',
            code: lambda.Code.fromAsset(
                path.join(__dirname, '../../backend/lambda/hello_world'),
                {
                    bundling: {
                        image: lambda.Runtime.PYTHON_3_13.bundlingImage,
                        platform: 'linux/arm64',
                        command: [
                            'bash', '-c',
                            'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output',
                        ],
                    },
                }
            ),
            functionName: 'hello-world',
        });

        const api = new apigateway.RestApi(this, 'TemplateAPI', {
            restApiName: 'Template API',
            description: 'API Gateway',
        });

        const helloResource = api.root.addResource('hello');
        helloResource.addMethod('GET', new apigateway.LambdaIntegration(helloWorldFunction));

        new cdk.CfnOutput(this, 'ApiUrl', {
            value: api.url,
            description: 'API Gateway URL',
        });

        // Cognito User Pool for authentication
        const userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: 'template-user-pool',
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
            userPoolClientName: 'template-app-client',
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

        // Amplify App (ready for Git connection)
        const amplifyApp = new amplify.CfnApp(this, 'AmplifyApp', {
            name: 'template-frontend',
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
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/dist
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*`,
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
