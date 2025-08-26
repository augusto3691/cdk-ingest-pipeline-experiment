import { processAllFiles } from './logic';

interface StepFunctionInput {
  uuid: string;
  [key: string]: any;
}

export const handler = async (event: StepFunctionInput) => {
  try {
    console.log('Process Lambda input:', event);
    const { bucket, outputKey } = await processAllFiles(event.uuid);
    console.log('Process completed, output at:', `s3://${bucket}/${outputKey}`);
    return { bucket, outputKey };
  } catch (error) {
    console.error('Error in process Lambda:', error);
    throw error;
  }
};
