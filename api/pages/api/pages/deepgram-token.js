
// File: api/deepgram-token.js

import { createClient } from "@deepgram/sdk";

export default async function handler(req, res) {
  // Ambil API key rahasia dari environment variables
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

  if (!deepgramApiKey) {
    return res.status(500).json({ error: "DEEPGRAM_API_KEY tidak diatur." });
  }

  // Inisialisasi client Deepgram
  const deepgram = createClient(deepgramApiKey);

  try {
    // Buat kunci sementara yang berlaku selama 1 jam
    const result = await deepgram.keys.create(
      "Kunci sementara untuk notula", // Komentar
      ["usage:write"], // Izin yang diberikan
      { timeToLive: 60 * 60 } // Waktu berlaku dalam detik (1 jam)
    );

    // Kirim kunci/token yang baru dibuat sebagai respons
    res.status(200).json({ key: result.key });
  } catch (error) {
    console.error("Error creating Deepgram key:", error);
    res.status(500).json({ error: "Gagal membuat token Deepgram." });
  }
}
