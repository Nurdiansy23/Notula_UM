
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
        { role: "system", content: "Anda adalah seorang notulis rapat yang cerdas dan efisien." },
        { role: "user", content: `Buatlah ringkasan atau simpulan utama dari keseluruhan transkrip rapat berikut dalam satu paragraf yang padat dan jelas:\n\n"${text}"` }
      ],
      temperature: 0.5,
    });

    const summary = completion.choices[0].message.content;
    res.status(200).json({ summary: summary });

  } catch (error) {
    console.error('OpenAI Summary Error:', error);
    res.status(500).json({ message: 'Gagal membuat ringkasan dengan AI.' });
  }
}
