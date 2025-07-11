
export default function handler(request, response) {
  // 1. Pastikan hanya method POST yang diizinkan, sesuai permintaan dari client
  if (request.method !== 'POST') {
    response.setHeader('Allow', ['POST']);
    return response.status(405).end(`Method ${request.method} Not Allowed`);
  }

  try {
    // 2. Untuk sementara, kita kirim data contoh (dummy data)
    // Nantinya, Anda bisa menambahkan logika yang lebih kompleks di sini
    const topicData = {
      topic: "Topik berhasil didapatkan dari server.",
      summary: "Ini adalah ringkasan awal yang dibuat oleh endpoint /api/get-topic."
    };

    // 3. Kirim balasan SUKSES (status 200) dengan data dalam format JSON
    // Ini akan memperbaiki error "is not valid JSON" di browser
    return response.status(200).json(topicData);

  } catch (error) {
    // Jika ada error tak terduga di server, kirim balasan error 500
    console.error(error);
    return response.status(500).json({ message: 'Terjadi kesalahan di server.' });
  }
}
