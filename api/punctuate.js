// File: api/punctuate.js

import OpenAI from 'openai';

// Inisialisasi client OpenAI dengan API Key dari environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: 'Teks tidak boleh kosong.' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Anda bisa ganti dengan model lain seperti "gpt-4o"
      messages: [
        { role: "system", content: "Anda adalah seorang editor yang handal." },
        { role: "user", content: `Perbaiki tanda baca dan huruf kapital pada teks berikut tanpa mengubah kata-katanya. Pastikan hasilnya tetap natural dan mudah dibaca:\n\n"${text}"` }
      ],
      temperature: 0.3,
    });

    const formattedText = completion.choices[0].message.content;
    res.status(200).json({ formattedText: formattedText });

  } catch (error) {
    console.error('OpenAI Punctuation Error:', error);
    res.status(500).json({ message: 'Gagal memproses teks dengan AI.' });
  }
}
