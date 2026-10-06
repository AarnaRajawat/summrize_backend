import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config(); // Also check current working directory

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

const API_KEY = process.env.GROQ_API_KEY;

console.log(
  "🔑 BACKEND API KEY =",
  API_KEY ? "Loaded" : "NOT Loaded"
);

if (!API_KEY) {
  console.warn("⚠️ GROQ_API_KEY is not set in environment variables.");
}

const groq = new Groq({
  apiKey: API_KEY || "",
});

app.get("/", (req, res) => {
  res.json({
    message: "Groq Backend is running 🚀",
  });
});

app.post("/summarize", async (req, res) => {
  try {
    console.log("📥 Summarize request received");

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "GROQ_API_KEY is missing on server",
        details: "Please add a valid GROQ_API_KEY in your environment variables on Render.",
      });
    }

    const { text, mode = "concise" } = req.body || {};

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        error: "No text provided",
        details: "Please enter some text to summarize.",
      });
    }

    const requestedModel = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
    const candidateModels = [
      requestedModel,
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-120b",
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    let promptInstruction = "Summarize this text concisely and clearly";
    if (mode === "bullets") {
      promptInstruction = "Summarize this text into clear, key bullet points";
    } else if (mode === "detailed") {
      promptInstruction = "Provide a comprehensive, well-structured summary of this text";
    } else if (mode === "short") {
      promptInstruction = "Summarize this text in 1-2 powerful sentences";
    }

    let summary = null;
    let lastError = null;

    for (const model of candidateModels) {
      try {
        console.log(`🤖 Attempting summarization with model: ${model} (mode: ${mode})`);
        const completion = await groq.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: "You are an expert text summarizer AI. Provide clean, well-formatted summaries without unnecessary filler or meta-commentary.",
            },
            {
              role: "user",
              content: `${promptInstruction}:\n\n${text.trim()}`,
            },
          ],
        });

        summary = completion.choices?.[0]?.message?.content;
        if (summary) {
          console.log(`✅ Summary generated successfully using model: ${model}`);
          break;
        }
      } catch (err) {
        console.warn(`⚠️ Model ${model} failed:`, err.message || err);
        lastError = err;
        // If 401 or auth error, don't keep retrying other models
        if (err.status === 401) break;
      }
    }

    if (!summary) {
      throw lastError || new Error("Failed to generate summary with available AI models.");
    }

    return res.json({
      summary,
    });
  } catch (error) {
    console.error("❌ BACKEND ERROR:", error);

    const status = error.status && Number.isInteger(error.status) ? error.status : 500;
    let details = error.message || "Unknown backend error";

    // Handle common Groq API authentication and rate limit issues
    if (status === 401 || details.includes("Invalid API Key") || details.includes("expired_api_key")) {
      details = "Groq API key is invalid or expired. Please generate a new key at https://console.groq.com/keys and update GROQ_API_KEY in Render environment variables.";
    } else if (status === 429) {
      details = "Groq API rate limit reached. Please wait a moment and try again.";
    }

    return res.status(status).json({
      error: "Backend error",
      details,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🔥 Groq Server running on port ${PORT}`);
});