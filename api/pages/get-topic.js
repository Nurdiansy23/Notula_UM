export default function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', ['POST']);
    return response.status(405).json({ message: `Metode ${request.method} tidak diizinkan.` });
  }
  try {
    const dataToSend = {
      topic: "Topik berhasil diambil dari server.",
      notes: "Proses dari GitHub berhasil."
    };
    return response.status(200).json(dataToSend);
  } catch (error) {
    console.error("Error pada /api/get-topic:", error);
    return response.status(500).json({ message: "Terjadi kesalahan internal pada server." });
  }
}
