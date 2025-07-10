// File: api/get-topic.js

import OpenAI from 'openai';

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
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Anda adalah seorang analis yang mampu mengidentifikasi pokok permasalahan." },
        { role: "user", content: `Identifikasi satu topik atau persoalan utama dari transkrip rapat berikut. Jawab hanya dengan topiknya dalam satu kalimat singkat, padat, dan jelas.:\n\n"${text}"` }
      ],
      temperature: 0.3,
    });

    const topic = completion.choices[0].message.content;
    res.status(200).json({ topic: topic });

  } catch (error) {
    console.error('OpenAI Topic Error:', error);
    res.status(500).json({ message: 'Gagal mengidentifikasi topik dengan AI.' });
  }
}
