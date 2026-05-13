import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();

// Correct CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://textsumrizer.netlify.app",
    ],
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// Load API Key
const API_KEY = process.env.GROQ_API_KEY;

console.log("🔑 BACKEND API KEY =", API_KEY ? "Loaded" : "NOT Loaded");

// Init Groq client
const groq = new Groq({ apiKey: API_KEY });

// Test Route
app.get("/", (req, res) => {
  res.send("Groq Backend is running! 🚀");
});

// Summarizer API
app.post("/summarize", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) return res.status(400).json({ error: "No text provided" });

  const completion = await groq.chat.completions.create({
 model: "llama-3.1-8b-instant",   // UPDATED MODEL
  messages: [
    {
      role: "user",
      content: `Summarize this text concisely:\n\n${text}`,
    },
  ],
});

    const summary = completion.choices[0]?.message?.content;

    if (!summary) {
      return res.status(500).json({ error: "AI returned empty response." });
    }

    res.json({ summary });
  } catch (error) {
    console.error("❌ BACKEND ERROR:", error);

    res.status(500).json({
      error: "Backend error",
      details: error.message,
    });
  }
});

// Render dynamic port support
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🔥 Groq Server running on port ${PORT}`);
});