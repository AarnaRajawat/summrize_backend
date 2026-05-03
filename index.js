import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();

// ✅ Correct CORS (works for laptop + mobile + netlify)
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://textsumrizer.netlify.app",
  ],
  methods: ["GET", "POST"],
}));

app.use(express.json());

// Load API Key
const API_KEY = process.env.GEMINI_API_KEY;

console.log("🔑 BACKEND API KEY =", API_KEY ? "Loaded" : "NOT Loaded");

// Test Route
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Summarizer API
app.post("/summarize", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`;

    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [{ text: `Summarize this text concisely:\n\n${text}` }],
          },
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const result =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!result) {
      return res.status(500).json({ error: "AI returned an empty response." });
    }

    res.json({ summary: result });
  } catch (error) {
    console.error("❌ BACKEND ERROR:", error.response?.data || error.message);

    res.status(500).json({
      error: "Backend error",
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

// Render dynamic port support
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});