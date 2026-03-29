import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';

export const initPinecone = () => {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY is not set');
  }
  return new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
};

let pipelineInstance: any = null;

// Initialize the embedding pipeline
export const getEmbeddingPipeline = async () => {
  if (!pipelineInstance) {
    // Dynamically import to avoid Next.js build issues
    const { pipeline, env } = await import('@xenova/transformers');
    // Configure environment
    env.allowLocalModels = false;
    // Load the model
    pipelineInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return pipelineInstance;
};

// Generate embedding vector for a piece of text
export const generateEmbedding = async (text: string): Promise<number[]> => {
  const extractor = await getEmbeddingPipeline();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
};

// Split large text into overlapping chunks
export const chunkText = (text: string, chunkSize = 1000, overlap = 200): string[] => {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
};

// Upsert chunks into Pinecone
export const upsertDocumentToPinecone = async (documentId: string, text: string) => {
  console.log(`[RAG] Chunking document ${documentId}...`);
  const chunks = chunkText(text);
  console.log(`[RAG] Created ${chunks.length} chunks. Generating embeddings...`);
  
  const pc = initPinecone();
  const index = pc.Index('a100-qa');
  
  const vectors = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await generateEmbedding(chunk);
    vectors.push({
      id: `${documentId}-chunk-${i}-${uuidv4()}`,
      values: embedding,
      metadata: {
        documentId: documentId,
        text: chunk
      }
    });
  }

  console.log(`[RAG] Upserting ${vectors.length} vectors to Pinecone...`);
  // Pinecone recommends upserting in batches of 100
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    try {
      // @ts-ignore
      await index.upsert(batch); // For older pinecone
    } catch(e) {
      // @ts-ignore
      await index.upsert(batch); // For newer pinecone if it accepts array
    }
  }
  console.log(`[RAG] Successfully upserted document ${documentId} to Pinecone.`);
};

// Query Pinecone for relevant chunks
export const queryRelevantChunks = async (documentId: string, query: string, topK = 5): Promise<string[]> => {
  console.log(`[RAG] Generating embedding for query: "${query}"`);
  const queryEmbedding = await generateEmbedding(query);
  
  console.log(`[RAG] Querying Pinecone for document ${documentId}...`);
  const pc = initPinecone();
  const index = pc.Index('a100-qa');
  
  const results = await index.query({
    vector: queryEmbedding,
    topK: topK,
    filter: { documentId: { "$eq": documentId } },
    includeMetadata: true
  });

  if (!results.matches || results.matches.length === 0) {
    return [];
  }

  // Extract the text from the top matches
  return results.matches.map(match => match.metadata?.text as string).filter(Boolean);
};
