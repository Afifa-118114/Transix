require("dotenv").config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`,
  );

  const data = await res.json();

  console.log(JSON.stringify(data, null, 2));
}

listModels();
