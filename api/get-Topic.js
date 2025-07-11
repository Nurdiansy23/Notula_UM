// File: api/get-topic.js

export default function handler(request, response) {
  // 1. Pastikan request yang masuk menggunakan metode POST
  if (request.method !== 'POST') {
    // Jika bukan POST, kirim error 405 Method Not Allowed
    response.setHeader('Allow', ['POST']);
    return response.status(405).json({
      message: `Metode ${request.method} tidak diizinkan. Gunakan POST.`
    });
  }

  // Blok try...catch untuk menangani jika ada error tak terduga
  try {
    // Di sini Anda bisa menambahkan logika yang lebih kompleks nanti.
    // Untuk sekarang, kita hanya akan mengirim data contoh (dummy data).
    const dataToSend = {
      topic: "Topik berhasil diambil dari server via /api/get-topic",
      notes: "Ini adalah catatan awal dari server."
    };

    // 2. Kirim balasan SUKSES (status 200) dengan data dalam format JSON
    return response.status(200).json(dataToSend);

  } catch (error) {
    // Jika terjadi error di dalam blok try, kirim balasan error server (500)
    console.error("Error pada /api/get-topic:", error);
    return response.status(500).json({
      message: "Terjadi kesalahan internal pada server."
    });
  }
}
