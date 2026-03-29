const { Pinecone } = require('@pinecone-database/pinecone');
const fs = require('fs');

async function testPinecone() {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  let key = "";
  for (const line of envContent.split('\n')) {
    if (line.startsWith('PINECONE_API_KEY=')) {
      key = line.split('=')[1].trim();
      break;
    }
  }

  const pc = new Pinecone({ apiKey: key });
  const index = pc.Index('a100-qa');

  const dummyVector = {
    id: "test-vector",
    values: new Array(1536).fill(0.1),
    metadata: { text: "test" }
  };

  try {
    console.log("Upserting array...");
    await index.upsert([dummyVector]);
    console.log("Success array");
  } catch (e) {
    console.error("Failed array:", e.message);
  }

  try {
    console.log("Upserting object...");
    await index.upsert({ records: [dummyVector] });
    console.log("Success object");
  } catch (e) {
    console.error("Failed object:", e.message);
  }
}

testPinecone();
