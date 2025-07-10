import OpenAI from 'openai';

// Inisialisasi OpenAI di sini
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Bungkus logika Anda dalam 'export default'
export default async function handler(req, res) {
  // --- MULAI KODE DARI INDEX.JS ---
  const { text } = req.body;
  if (!text || text.trim() === "") {
    return res.status(400).json({ error: "Teks tidak boleh kosong untuk diidentifikasi topiknya." });
  }
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Anda adalah seorang analis ahli. Berdasarkan keseluruhan teks diskusi berikut, identifikasi dan sebutkan topik utama atau persoalan yang sedang dibahas dalam satu kalimat singkat."
        },
        {
          role: "user",
          content: `Identifikasi topik utama dari teks berikut:\n\n${text}`
        }
      ],
      temperature: 0.3,
    });
    const topic = response.choices[0].message.content.trim();
    res.status(200).json({ topic }); // Mengirim kembali objek dengan properti 'topic'
  } catch (error) {
    console.error("Error in /api/get-topic:", error);
    res.status(500).json({ error: "Gagal mengidentifikasi topik di server." });
  }
  // --- AKHIR KODE DARI INDEX.JS ---
}
