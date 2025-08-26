import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';

export class IngestSalesforceCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1️⃣ Bucket S3
    const tempBucket = new s3.Bucket(this, 'TempS3Bucket');

    // 2️⃣ Lambdas
    const ingestLambda = new lambdaNodejs.NodejsFunction(this, 'IngestLambda', {
      entry: 'lambda/ingest.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TEMP_BUCKET: tempBucket.bucketName,
      },
      timeout: cdk.Duration.minutes(5),
    });

    const processLambda = new lambdaNodejs.NodejsFunction(this, 'ProcessLambda', {
      entry: 'lambda/process.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TEMP_BUCKET: tempBucket.bucketName,
      },
      timeout: cdk.Duration.minutes(5),
    });

    // 3️⃣ Permissões
    tempBucket.grantReadWrite(ingestLambda);
    tempBucket.grantReadWrite(processLambda);
  }
}
