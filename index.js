require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Jangan membuat instance OpenAI saat cold start.
// Dengan demikian, konfigurasi OpenAI yang bermasalah tidak mematikan
// endpoint Deepgram yang tidak membutuhkan OpenAI.
let openaiClient;

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY belum dikonfigurasi di Vercel.");
    error.statusCode = 503;
    throw error;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}

// Endpoint pemeriksaan konfigurasi. Tidak pernah mengirim nilai secret.
app.get("/health", (_req, res) => {
  res.set("Cache-Control", "no-store");
  return res.status(200).json({
    ok: true,
    service: "um-transcriptor-api",
    deepgramConfigured: Boolean(process.env.DG_KEY),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
  });
});

// Endpoint kompatibel dengan frontend lama yang mengharapkan { key }.
// Catatan: DG_KEY adalah secret permanen. Untuk aplikasi publik, sebaiknya
// ganti mekanisme ini dengan temporary Deepgram key yang berumur pendek.
app.get("/deepgram-token", (_req, res) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });

  const key = process.env.DG_KEY;
  if (!key) {
    console.error("[deepgram-token] Environment variable DG_KEY tidak tersedia.");
    return res.status(503).json({
      error: "DG_KEY belum tersedia pada environment deployment ini.",
    });
  }

  return res.status(200).json({ key });
});

// Endpoint memperbaiki tanda baca dan kapitalisasi.
app.post("/punctuate", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a text formatter. Add punctuation and proper capitalization to spoken Indonesian text. If sentence structure is incorrect, fix it. Output only the corrected text without commentary. If the text is shorter than three words, return it unchanged.",
        },
        { role: "user", content: text },
      ],
      temperature: 0.3,
    });

    const formattedText =
      response.choices?.[0]?.message?.content?.trim() || text;

    return res.status(200).json({ formattedText });
  } catch (error) {
    console.error("[punctuate]", error?.message || error);
    return res.status(error.statusCode || 500).json({
      error:
        error.statusCode === 503
          ? error.message
          : "Failed to punctuate text",
    });
  }
});

// Endpoint ringkasan notulen.
app.post("/api/summarize-text", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) {
    return res
      .status(400)
      .json({ error: "Teks tidak boleh kosong untuk diringkas." });
  }

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Anda adalah asisten yang sangat baik dalam membuat ringkasan teks dalam Bahasa Indonesia. Buat ringkasan yang jelas, padat, dan menangkap poin-poin utama.",
        },
        {
          role: "user",
          content: `Tolong buatkan ringkasan dari teks berikut:\n\n${text}`,
        },
      ],
      temperature: 0.5,
    });

    const summary = response.choices?.[0]?.message?.content?.trim() || "";
    return res.status(200).json({ summary });
  } catch (error) {
    console.error("[api/summarize-text]", error?.message || error);
    return res.status(error.statusCode || 500).json({
      error:
        error.statusCode === 503
          ? error.message
          : "Gagal membuat ringkasan di server.",
    });
  }
});

// Endpoint identifikasi topik pembahasan.
app.post("/api/get-topic", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) {
    return res.status(400).json({
      error: "Teks tidak boleh kosong untuk diidentifikasi topiknya.",
    });
  }

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Anda adalah seorang analis ahli. Berdasarkan keseluruhan teks diskusi, identifikasi topik utama yang dibahas dalam satu kalimat singkat.",
        },
        {
          role: "user",
          content: `Identifikasi topik utama dari teks berikut:\n\n${text}`,
        },
      ],
      temperature: 0.3,
    });

    const topic = response.choices?.[0]?.message?.content?.trim() || "";
    return res.status(200).json({ topic });
  } catch (error) {
    console.error("[api/get-topic]", error?.message || error);
    return res.status(error.statusCode || 500).json({
      error:
        error.statusCode === 503
          ? error.message
          : "Gagal mengidentifikasi topik di server.",
    });
  }
});

// Vercel menjalankan Express sebagai serverless function.
// Jangan memanggil app.listen() pada deployment Vercel.
module.exports = app;

// Tetap mendukung `npm start` untuk pengujian lokal.
if (require.main === module && !process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}
