const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const pager = await ai.models.list();
  const models = [];
  for await (const m of pager) {
    models.push(m.name);
  }
  console.log(models.join('\n'));
}
run().catch(console.error);
