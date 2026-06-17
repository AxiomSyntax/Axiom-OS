// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Simple health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Proxy to Ollama (assumes Ollama running on localhost:11434)
app.post("/api/ollama", async (req, res) => {
  try {
    const ollamaResponse = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await ollamaResponse.json();
    res.json(data);
  } catch (err) {
    console.error("Ollama proxy error:", err);
    res.status(500).json({ error: "Failed to contact Ollama" });
  }
});

// Placeholder for agents management
app.get("/api/agents", (req, res) => {
  res.json({ agents: [] });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
});
