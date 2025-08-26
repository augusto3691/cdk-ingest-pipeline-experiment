import { ingestAllPages } from "./logic";

export const handler = async () => {
  try {
    const uuid = await ingestAllPages();
    console.log('Ingest completed, UUID:', uuid);
    return { uuid };
  } catch (error) {
    console.error('Error in ingest Lambda:', error);
    throw error;
  }
};