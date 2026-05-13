#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CpakStack } from '../lib/cpak-stack';

const app = new cdk.App();

new CpakStack(app, 'CPAKTrainingStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'CPAK SageMaker training pipeline infrastructure',
});
