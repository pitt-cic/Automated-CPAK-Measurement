#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import {InfraStack} from '../lib/infra-stack';

const app = new cdk.App();
new InfraStack(app, 'CpakInfraStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    description: 'CPAK Measurement Infrastructure',
});
