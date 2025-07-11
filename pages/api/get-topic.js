// pages/api/get-topic.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text } = req.body;
    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Text is required" });
    }

    // Layanan dummy untuk mengekstrak topik (contoh: ambil kalimat pertama)
    const topic = text.split(".")[0] || "Topik tidak ditemukan";

    res.status(200).json({ topic });
  } catch (error) {
    console.error("TOPIC ERROR:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
