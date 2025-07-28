export default function handler(request, response) {
  // Ambil Kunci API Deepgram Anda dari Environment Variable
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

  // Jika Kunci API belum diatur di server (misal di Vercel),
  // kirim pesan error.
  if (!deepgramApiKey) {
    return response.status(500).json({ 
      error: 'Kunci API Deepgram belum diatur di server.' 
    });
  }

  // Kirim Kunci API sebagai balasan dalam format JSON
  response.status(200).json({ key: deepgramApiKey });
}
