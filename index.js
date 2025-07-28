require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const OpenAI = require("openai");
const { createClient } = require("@deepgram/sdk");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static files from /public
app.use(express.static(path.join(__dirname, "public")));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 1) Endpoint untuk memperbaiki tanda baca
app.post("/api/punctuate", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a text formatter. Your job is to add punctuation and proper capitalization to spoken Indonesian text. Do not add any commentary.",
        },
        { role: "user", content: text },
      ],
      temperature: 0.3,
    });
    res.json({ formattedText: response.choices[0].message.content.trim() });
  } catch (err) {
    console.error("Error in /api/punctuate:", err);
    res.status(500).json({ error: "Failed to punctuate text" });
  }
});

// 2) Endpoint untuk ringkasan teks
app.post("/api/summarize-text", async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: "Teks tidak boleh kosong" });
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Buat ringkasan yang jelas dan padat dalam Bahasa Indonesia." },
        { role: "user", content: `Tolong buatkan ringkasan dari teks berikut:\n\n${text}` },
      ],
      temperature: 0.5,
    });
    res.json({ summary: response.choices[0].message.content.trim() });
  } catch (err) {
    console.error("Error in /api/summarize-text:", err);
    res.status(500).json({ error: "Gagal membuat ringkasan" });
  }
});

// 3) Endpoint untuk mendapatkan topik pembahasan
app.post("/api/get-topic", async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: "Teks tidak boleh kosong" });
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Anda adalah analis ahli. Identifikasi topik utama dari teks berikut dalam satu kalimat singkat.",
        },
        { role: "user", content: `Identifikasi topik utama dari teks berikut:\n\n${text}` },
      ],
      temperature: 0.3,
    });
    res.json({ topic: response.choices[0].message.content.trim() });
  } catch (err) {
    console.error("Error in /api/get-topic:", err);
    res.status(500).json({ error: "Gagal mengidentifikasi topik" });
  }
});

app.get("/deepgram-token", async (req, res) => {
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

  if (!deepgramApiKey) {
    return res.status(500).json({ error: "DEEPGRAM_API_KEY tidak diatur di server." });
  }

  const deepgram = createClient(deepgramApiKey);

  try {
    // Buat token sementara yang berlaku 1 jam
    const newKey = await deepgram.keys.create(
      "Kunci sementara untuk notula", // Deskripsi
      ["usage:write"],                 // Izin yang diperlukan
      { timeToLive: 60 * 60 }           // Waktu berlaku dalam detik
    );

    // Kirim token sementara yang baru dibuat ke browser
    res.json({ key: newKey.key });

  } catch (error) {
    console.error("Error creating Deepgram key:", error);
    res.status(500).json({ error: "Gagal membuat token Deepgram." });
  }
});
// 5) Catch-all untuk SPA Vue
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
