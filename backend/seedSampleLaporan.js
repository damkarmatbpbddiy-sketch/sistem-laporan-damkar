const db = require('./config/db');

async function seedSampleLaporan() {
  console.log('🔄 Seeding historical incident occurrences into `laporan` table...');

  const checkLaporan = await db.query('SELECT COUNT(*) as count FROM laporan');
  const existingCount = parseInt(checkLaporan.rows[0]?.count || 0, 10);

  if (existingCount >= 20) {
    console.log(`ℹ️ Tabel laporan sudah berisi ${existingCount} data kejadian.`);
    return;
  }

  const sampleIncidents = [
    // Kejadian Kebakaran
    { judul: 'Kebakaran Rumah Permukiman', pelapor: 'Budi Santoso', hp: '081234567890', alamat: 'Jl. Kaliurang Km 5, Depok, Sleman', kab: 'Sleman', kec: 'Depok', jenis: 'Kebakaran Permukiman', desc: 'Kebakaran disebabkan korsleting listrik pada dapur rumah.', date: '2024-03-15 14:30:00', status: 'Selesai' },
    { judul: 'Kebakaran Lahan Kering', pelapor: 'Siti Rahma', hp: '081987654321', alamat: 'Kapanewon Playen, Gunungkidul', kab: 'Gunungkidul', kec: 'Playen', jenis: 'Kebakaran Lahan', desc: 'Api membesar membakar ilalang kering di pinggir jalan.', date: '2024-08-20 11:15:00', status: 'Selesai' },
    { judul: 'Kebakaran Ruko Sembako', pelapor: 'Agus Wijaya', hp: '085712345678', alamat: 'Jl. Parangtritis Km 4, Sewon, Bantul', kab: 'Bantul', kec: 'Sewon', jenis: 'Kebakaran Gedung', desc: 'Kebakaran di toko kelontong, 2 unit armada dikerahkan.', date: '2025-01-10 03:45:00', status: 'Selesai' },
    { judul: 'Kebakaran Gudang Kayu', pelapor: 'Hendra Prasetya', hp: '082134567891', alamat: 'Godean, Sleman', kab: 'Sleman', kec: 'Godean', jenis: 'Kebakaran Gedung', desc: 'Gudang pengolahan kayu terbakar pukul 22:00.', date: '2025-05-18 22:10:00', status: 'Selesai' },
    { judul: 'Kebakaran Mobil Mini Bus', pelapor: 'Eko Nugroho', hp: '081398765432', alamat: 'Jl. Solo Km 9, Kalasan, Sleman', kab: 'Sleman', kec: 'Kalasan', jenis: 'Kebakaran Kendaraan', desc: 'Mobil terbakar di bahu jalan akibat kebocoran bahan bakar.', date: '2026-02-04 16:20:00', status: 'Selesai' },
    { judul: 'Kebakaran Restoran', pelapor: 'Rina Kartika', hp: '087812345678', alamat: 'Umbulharjo, Kota Yogyakarta', kab: 'Kota Yogyakarta', kec: 'Umbulharjo', jenis: 'Kebakaran Gedung', desc: 'Kebakaran akibat tabung gas elpiji bocor di dapur restoran.', date: '2026-06-12 18:05:00', status: 'Selesai' },
    { judul: 'Kebakaran Lahan Pertanian', pelapor: 'Bambang Utomo', hp: '085298765432', alamat: 'Pengasih, Kulon Progo', kab: 'Kulon Progo', kec: 'Pengasih', jenis: 'Kebakaran Lahan', desc: 'Pembakaran sampah merembet ke area pertanian.', date: '2026-08-01 13:00:00', status: 'Diproses' },
    { judul: 'Kebakaran Pasar Tradisional', pelapor: 'Tri Mulyani', hp: '081823456789', alamat: 'Wates, Kulon Progo', kab: 'Kulon Progo', kec: 'Wates', jenis: 'Kebakaran Gedung', desc: 'Kios sembako terbakar pada pagi hari.', date: '2026-08-10 05:30:00', status: 'Selesai' },

    // Kejadian Non-Kebakaran / Rescue
    { judul: 'Evakuasi Sarang Tawon Vespa', pelapor: 'Dewi Lestari', hp: '085612345678', alamat: 'Tegalrejo, Kota Yogyakarta', kab: 'Kota Yogyakarta', kec: 'Tegalrejo', jenis: 'Non-Kebakaran / Rescue', desc: 'Sarang tawon vespa membahayakan warga di atap rumah.', date: '2024-04-10 19:30:00', status: 'Selesai' },
    { judul: 'Penyelamatan Sapi Terperosok Sumur', pelapor: 'Pak Marto', hp: '081298765432', alamat: 'Imogiri, Bantul', kab: 'Bantul', kec: 'Imogiri', jenis: 'Non-Kebakaran / Rescue', desc: 'Sapi milik warga masuk ke sumur tua kedalaman 4 meter.', date: '2024-09-05 08:00:00', status: 'Selesai' },
    { judul: 'Pelepasan Cincin Macet di Jari', pelapor: 'Anisa Putri', hp: '087712345678', alamat: 'Mlati, Sleman', kab: 'Sleman', kec: 'Mlati', jenis: 'Non-Kebakaran / Rescue', desc: 'Cincin membengkak pada jari korban, dipotong dengan mini grinder.', date: '2025-03-22 10:15:00', status: 'Selesai' },
    { judul: 'Evakuasi Ular Kobra Masuk Rumah', pelapor: 'Dedi Kurniawan', hp: '082298765432', alamat: 'Banguntapan, Bantul', kab: 'Bantul', kec: 'Banguntapan', jenis: 'Non-Kebakaran / Rescue', desc: 'Ular kobra sepanjang 1.5 meter berada di bawah tempat tidur.', date: '2025-07-14 21:40:00', status: 'Selesai' },
    { judul: 'Evakuasi Pohon Tumbang Menutup Jalan', pelapor: 'Suparno', hp: '081312345678', alamat: 'Wonosari, Gunungkidul', kab: 'Gunungkidul', kec: 'Wonosari', jenis: 'Non-Kebakaran / Rescue', desc: 'Pohon mendoan besar tumbang menimpa kabel dan menutup jalan utama.', date: '2026-01-25 15:10:00', status: 'Selesai' },
    { judul: 'Penyelamatan Kucing Terjebak di Tiang Listrik', pelapor: 'Maya Sari', hp: '085398765432', alamat: 'Kasihan, Bantul', kab: 'Bantul', kec: 'Kasihan', jenis: 'Non-Kebakaran / Rescue', desc: 'Kucing terjebak di puncak tiang listrik selama 2 hari.', date: '2026-08-08 09:20:00', status: 'Selesai' },
    { judul: 'Evakuasi Cincin Tersangkut pada Anak', pelapor: 'Nurul Huda', hp: '081712345678', alamat: 'Prambanan, Sleman', kab: 'Sleman', kec: 'Prambanan', jenis: 'Non-Kebakaran / Rescue', desc: 'Petugas melepas cincin dari jari anak tanpa cedera.', date: '2026-08-14 11:00:00', status: 'Selesai' }
  ];

  let addedCount = 0;
  for (const item of sampleIncidents) {
    const sql = `
      INSERT INTO laporan (judul_kejadian, nama_pelapor, nomor_hp, alamat, latitude, longitude, kabupaten, kecamatan, kalurahan, jenis_kejadian, deskripsi, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;
    await db.query(sql, [
      item.judul,
      item.pelapor,
      item.hp,
      item.alamat,
      '-7.7978',
      '110.3688',
      item.kab,
      item.kec,
      item.kec,
      item.jenis,
      item.desc,
      item.status,
      item.date
    ]);
    addedCount++;
  }

  console.log(`🎉 Seeding Laporan Selesai! ${addedCount} data insiden kejadian ditambahkan.`);
}

if (require.main === module) {
  seedSampleLaporan().then(() => process.exit(0)).catch(err => {
    console.error('❌ Error seeding sample laporan:', err);
    process.exit(1);
  });
}

module.exports = seedSampleLaporan;
