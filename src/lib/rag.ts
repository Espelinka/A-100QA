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

// Generate embedding vector using OpenRouter (OpenAI text-embedding-3-small)
export const generateEmbedding = async (text: string): Promise<number[]> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://a-100qa.vercel.app", 
      "X-Title": "A-100 QA"
    },
    body: JSON.stringify({
      model: "text-embedding-3-small", // На OpenRouter иногда можно просто указать базовое имя для эмбеддингов
      input: text
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter Embeddings Error:", errorText);
    throw new Error(`Ошибка генерации вектора (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (!data.data || !data.data[0] || !data.data[0].embedding) {
    throw new Error("Неверный формат ответа от OpenRouter: " + JSON.stringify(data));
  }

  return data.data[0].embedding; // 1536 измерений
};

// Split large text into overlapping chunks
export const chunkText = (text: string, chunkSize = 1500, overlap = 300): string[] => {
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
    // OpenRouter limits embedding batch sizes, so we do it one by one (or batch if supported)
    // To avoid rate limits, we add a tiny delay
    await new Promise(r => setTimeout(r, 100)); 
    
    try {
      const embedding = await generateEmbedding(chunk);
      vectors.push({
        id: `${documentId}-chunk-${i}-${uuidv4()}`,
        values: embedding,
        metadata: {
          documentId: documentId,
          text: chunk
        }
      });
    } catch (e) {
      console.warn(`[RAG] Chunk ${i} failed to embed, skipping...`, e);
    }
  }

  console.log(`[RAG] Upserting ${vectors.length} vectors to Pinecone...`);
  // Pinecone recommends upserting in batches of 100
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    try {
      // @ts-ignore
      await index.upsert({ records: batch });
    } catch(e) {
      // @ts-ignore
      await index.upsert(batch);
    }
  }
  console.log(`[RAG] Successfully upserted document ${documentId} to Pinecone.`);
};

// Query Pinecone for relevant chunks
export const queryRelevantChunks = async (documentId: string, query: string, topK = 10): Promise<string[]> => {
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

