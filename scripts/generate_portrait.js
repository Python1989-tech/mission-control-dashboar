const fs = require("fs");
const path = require("path");
const { enqueue } = require("../openaiQueue");

async function main() {
  const [, , agentId, role] = process.argv;
  if (!agentId || !role) {
    console.error("Usage: node scripts/generate_portrait.js <agentId> <role>");
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set");
    process.exit(1);
  }

  const prompt = `Ultra detailed futuristic AI agent portrait of ${agentId.replace(/_/g, " ")}, representing ${role}. Cybernetic intelligence with glowing circuitry armor, cinematic sci-fi lighting, holographic data streams surrounding the figure, dark command center background, hyper realistic digital art, sharp focus, 4K concept art.`;

  const requestBody = {
    model: "gpt-image-1",
    prompt,
    size: "1024x1024"
  };

  const assetDir = path.join(__dirname, "..", "dashboard", "public", "assets");
  if (!fs.existsSync(assetDir)) {
    fs.mkdirSync(assetDir, { recursive: true });
  }
  const outputPath = path.join(assetDir, `${agentId}.png`);

  const response = await enqueue(async () => {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const error = new Error(`OpenAI request failed (${res.status})`);
      error.status = res.status;
      error.body = await res.text();
      throw error;
    }

    return res.json();
  });

  const base64 = response?.data?.[0]?.b64_json;
  if (!base64) {
    console.error("OpenAI response missing image data");
    process.exit(1);
  }

  fs.writeFileSync(outputPath, Buffer.from(base64, "base64"));
  console.log(`Generated portrait => ${outputPath}`);
}

main().catch((err) => {
  console.error("Portrait generation failed", err);
  process.exit(1);
});
