const fs = require('fs');

async function test() {
  // Read key from .env.local
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  let key = "";
  for (const line of envContent.split('\n')) {
    if (line.startsWith('OPENROUTER_API_KEY=')) {
      key = line.split('=')[1].trim();
      break;
    }
  }

  console.log("Using key:", key.substring(0, 10) + "...");

  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://a-100qa.vercel.app", 
      "X-Title": "A-100 QA"
    },
    body: JSON.stringify({
      model: "text-embedding-3-small", 
      input: "test"
    })
  });

  const text = await response.text();
  console.log("Status:", response.status);
  console.log("Body:", text.substring(0, 200) + "...");
}

test();
