#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import {InferenceStack} from '../lib/inference-stack';
import {TrainingStack} from '../lib/training-stack';

const app = new cdk.App();

const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const mode = app.node.tryGetContext('mode') || 'all';

if (mode === 'inference' || mode === 'all') {
    new InferenceStack(app, 'CpakInferenceStack', {
        env,
        description: 'CPAK Measurement Inference Infrastructure',
    });
}

if (mode === 'training' || mode === 'all') {
    new TrainingStack(app, 'CpakTrainingStack', {
        env,
        description: 'CPAK SageMaker Training Infrastructure',
    });
}
