const db = require('../config/db');
const fss = require('fs');
const path = require('path');

const fallbackSilakarData = [
  { id: 1, tanggal_kejadian: '2026-08-28', waktu_laporan: '14:30:00', kabupaten_kota: 'Kabupaten Sleman', kapanewon: 'Depok', kalurahan: 'Caturtunggal', alamat_lokasi: 'Jl. Kaliurang Km 5, Depok, Sleman', jenis_kejadian: 'Kebakaran Pemukiman', objek_terbakar: 'Rumah Tinggal', dugaan_penyebab: 'Korsleting Listrik', korban_meninggal: 0, korban_luka: 1, jumlah_terdampak: 4, unit_damkarmat: 'Pos Damkar Sleman', jumlah_armada: 2, status_penanganan: 'Selesai', perkiraan_kerugian: 45000000, keterangan: 'Penanganan selesai dengan aman.' },
  { id: 2, tanggal_kejadian: '2026-08-25', waktu_laporan: '11:15:00', kabupaten_kota: 'Kabupaten Gunungkidul', kapanewon: 'Playen', kalurahan: 'Logandeng', alamat_lokasi: 'Jl. Jogja-Wonosari Km 22, Playen', jenis_kejadian: 'Kebakaran Lahan', objek_terbakar: 'Lalang Kering', dugaan_penyebab: 'Pembakaran Sampah', korban_meninggal: 0, korban_luka: 0, jumlah_terdampak: 0, unit_damkarmat: 'Pos Damkar Gunungkidul', jumlah_armada: 1, status_penanganan: 'Selesai', perkiraan_kerugian: 5000000, keterangan: 'Api berhasil dilokalisir.' },
  { id: 3, tanggal_kejadian: '2026-08-20', waktu_laporan: '03:45:00', kabupaten_kota: 'Kabupaten Bantul', kapanewon: 'Sewon', kalurahan: 'Panggungharjo', alamat_lokasi: 'Jl. Parangtritis Km 4.5, Sewon, Bantul', jenis_kejadian: 'Kebakaran Pemukiman', objek_terbakar: 'Ruko Sembako', dugaan_penyebab: 'Tabung Gas Bocor', korban_meninggal: 0, korban_luka: 0, jumlah_terdampak: 2, unit_damkarmat: 'Pos Damkar Bantul', jumlah_armada: 3, status_penanganan: 'Selesai', perkiraan_kerugian: 120000000, keterangan: 'Kerugian material ruko sembako.' },
  { id: 4, tanggal_kejadian: '2026-08-15', waktu_laporan: '22:10:00', kabupaten_kota: 'Kabupaten Sleman', kapanewon: 'Godean', kalurahan: 'Sidoagung', alamat_lokasi: 'Jl. Godean Km 8, Sleman', jenis_kejadian: 'Kebakaran Pemukiman', objek_terbakar: 'Gudang Kayu', dugaan_penyebab: 'Gesekan Mesin', korban_meninggal: 0, korban_luka: 0, jumlah_terdampak: 0, unit_damkarmat: 'Pos Damkar Godean', jumlah_armada: 2, status_penanganan: 'Selesai', perkiraan_kerugian: 85000000, keterangan: 'Berhasil dipadamkan total.' },
  { id: 5, tanggal_kejadian: '2026-08-10', waktu_laporan: '16:20:00', kabupaten_kota: 'Kota Yogyakarta', kapanewon: 'Umbulharjo', kalurahan: 'Pandeyan', alamat_lokasi: 'Jl. Glagahsari, Umbulharjo, Kota Jogja', jenis_kejadian: 'Penyelamatan', objek_terbakar: 'Mobil Mini Bus', dugaan_penyebab: 'Kebocoran Selang Bensin', korban_meninggal: 0, korban_luka: 0, jumlah_terdampak: 1, unit_damkarmat: 'Pos Damkar Pusat Yogyakarta', jumlah_armada: 1, status_penanganan: 'Selesai', perkiraan_kerugian: 35000000, keterangan: 'Tidak ada korban jiwa.' },
  { id: 6, tanggal_kejadian: '2026-08-05', waktu_laporan: '09:10:00', kabupaten_kota: 'Kabupaten Kulon Progo', kapanewon: 'Wates', kalurahan: 'Giripeni', alamat_lokasi: 'Jl. Wates-Purworejo, Wates, Kulon Progo', jenis_kejadian: 'Kebakaran Hutan', objek_terbakar: 'Kios Sembako Pasar', dugaan_penyebab: 'Korsleting Listrik', korban_meninggal: 0, korban_luka: 0, jumlah_terdampak: 3, unit_damkarmat: 'Pos Damkar Kulon Progo', jumlah_armada: 2, status_penanganan: 'Dalam Penanganan', perkiraan_kerugian: 25000000, keterangan: 'Petugas masih melakukan pendinginan.' }
];

let isTableReady = false;

async function ensureSilakarReady() {
  if (isTableReady) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS kejadian_silakar (
        id SERIAL PRIMARY KEY,
        tanggal_kejadian DATE NOT NULL,
        waktu_laporan TIME NULL,
        waktu_berangkat TIME NULL,
        waktu_tiba TIME NULL,
        kabupaten_kota VARCHAR(100) NULL,
        kapanewon VARCHAR(100) NULL,
        kalurahan VARCHAR(100) NULL,
        alamat_lokasi TEXT NULL,
        koordinat VARCHAR(100) NULL,
        sumber_pengaduan VARCHAR(100) NULL,
        nama_pelapor VARCHAR(150) NULL,
        nomor_kontak VARCHAR(30) NULL,
        jenis_kejadian VARCHAR(100) NULL,
        objek_terbakar VARCHAR(255) NULL,
        dugaan_penyebab VARCHAR(255) NULL,
        korban_meninggal INT DEFAULT 0,
        korban_luka INT DEFAULT 0,
        jumlah_terdampak INT DEFAULT 0,
        unit_damkarmat VARCHAR(255) NULL,
        jumlah_armada INT DEFAULT 0,
        sumber_air VARCHAR(255) NULL,
        status_penanganan VARCHAR(100) DEFAULT 'Dalam Penanganan',
        waktu_selesai TIME NULL,
        perkiraan_kerugian BIGINT DEFAULT 0,
        dokumentasi VARCHAR(255) NULL,
        keterangan TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrasi otomatis kategori lama ke 4 kategori resmi
    await db.query("UPDATE kejadian_silakar SET jenis_kejadian = 'Kebakaran Pemukiman' WHERE jenis_kejadian IN ('Kebakaran', 'Kebakaran Gedung', 'Kebakaran Bangunan', 'Kebakaran Rumah')");
    await db.query("UPDATE kejadian_silakar SET jenis_kejadian = 'Penyelamatan' WHERE jenis_kejadian IN ('Kebakaran Kendaraan', 'Evakuasi', 'Pohon Tumbang', 'Sarang Tawon', 'Non Kebakaran', 'Kecelakaan', 'Bencana Alam', 'Hazmat', 'Lainnya')");

    // Jika tabel masih kosong, masukkan sample records resmi ke database
    const countRes = await db.query('SELECT COUNT(*) as count FROM kejadian_silakar');
    const totalCount = parseInt(countRes.rows?.[0]?.count || 0, 10);
    if (totalCount === 0) {
      for (const item of fallbackSilakarData) {
        await db.query(`
          INSERT INTO kejadian_silakar (
            tanggal_kejadian, waktu_laporan, kabupaten_kota, kapanewon, kalurahan, alamat_lokasi,
            jenis_kejadian, objek_terbakar, dugaan_penyebab, korban_meninggal, korban_luka,
            jumlah_terdampak, unit_damkarmat, jumlah_armada, status_penanganan, perkiraan_kerugian, keterangan
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `, [
          item.tanggal_kejadian, item.waktu_laporan, item.kabupaten_kota, item.kapanewon, item.kalurahan, item.alamat_lokasi,
          item.jenis_kejadian, item.objek_terbakar, item.dugaan_penyebab, item.korban_meninggal, item.korban_luka,
          item.jumlah_terdampak, item.unit_damkarmat, item.jumlah_armada, item.status_penanganan, item.perkiraan_kerugian, item.keterangan
        ]);
      }
      console.log('✅ Inisialisasi data SILATKAR ke database berhasil.');
    }

    isTableReady = true;
  } catch (err) {
    console.warn('⚠️ Inisialisasi kejadian_silakar notice:', err.message);
  }
}

const getAllSilakar = async (req, res) => {
  try {
    await ensureSilakarReady();

    const { search, status, startDate, endDate, kabupaten, jenis } = req.query;
    let queryText = 'SELECT * FROM kejadian_silakar WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      queryText += ' AND (nama_pelapor LIKE $' + paramIndex + ' OR alamat_lokasi LIKE $' + paramIndex + ' OR objek_terbakar LIKE $' + paramIndex + ' OR jenis_kejadian LIKE $' + paramIndex + ' OR dugaan_penyebab LIKE $' + paramIndex + ')';
      params.push('%' + search + '%');
      paramIndex++;
    }
    if (status && status !== 'Semua') {
      queryText += ' AND status_penanganan = $' + paramIndex;
      params.push(status);
      paramIndex++;
    }
    if (startDate) {
      queryText += ' AND tanggal_kejadian >= $' + paramIndex;
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      queryText += ' AND tanggal_kejadian <= $' + paramIndex;
      params.push(endDate);
      paramIndex++;
    }
    if (kabupaten) {
      queryText += ' AND kabupaten_kota LIKE $' + paramIndex;
      params.push('%' + kabupaten + '%');
      paramIndex++;
    }
    if (jenis) {
      queryText += ' AND jenis_kejadian LIKE $' + paramIndex;
      params.push('%' + jenis + '%');
      paramIndex++;
    }
    queryText += ' ORDER BY tanggal_kejadian DESC, id DESC';

    let rowsData = [];
    try {
      const result = await db.query(queryText, params);
      rowsData = result.rows || [];
    } catch (dbErr) {
      console.warn('⚠️ db.query kejadian_silakar error:', dbErr.message);
    }

    // Fallback jika database masih kosong dan tidak sedang difilter
    if (rowsData.length === 0 && !search && !status && !startDate && !endDate && !kabupaten && !jenis) {
      rowsData = fallbackSilakarData;
    }

    const stats = rowsData.reduce((acc, row) => {
      acc.total++;
      acc.total_meninggal += Number(row.korban_meninggal) || 0;
      acc.total_luka += Number(row.korban_luka) || 0;
      acc.total_terdampak += Number(row.jumlah_terdampak) || 0;
      if (row.status_penanganan === 'Selesai') acc.selesai++;
      if (row.status_penanganan === 'Dalam Penanganan') acc.dalam_penanganan++;
      return acc;
    }, { total: 0, total_meninggal: 0, total_luka: 0, total_terdampak: 0, selesai: 0, dalam_penanganan: 0 });

    return res.status(200).json({
      success: true,
      stats: {
        total: stats.total,
        total_meninggal: stats.total_meninggal,
        total_luka: stats.total_luka,
        total_terdampak: stats.total_terdampak,
        selesai: stats.selesai,
        dalam_penanganan: stats.dalam_penanganan
      },
      data: rowsData
    });
  } catch (error) {
    console.error('Error getAllSilakar:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal membaca data SILAKAR.'
    });
  }
};

const getSilakarById = async (req, res) => {
  try {
    await ensureSilakarReady();
    const { id } = req.params;
    const result = await db.query('SELECT * FROM kejadian_silakar WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Data kejadian tidak ditemukan.' });
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil detail data kejadian.' });
  }
};

const createSilakar = async (req, res) => {
  try {
    await ensureSilakarReady();
    const { tanggal_kejadian, waktu_laporan, waktu_berangkat, waktu_tiba, kabupaten_kota, kapanewon, kalurahan, alamat_lokasi, koordinat, sumber_pengaduan, nama_pelapor, nomor_kontak, jenis_kejadian, objek_terbakar, dugaan_penyebab, korban_meninggal, korban_luka, jumlah_terdampak, unit_damkarmat, jumlah_armada, sumber_air, status_penanganan, waktu_selesai, perkiraan_kerugian, keterangan } = req.body;
    if (!tanggal_kejadian) { if (req.file) fss.unlinkSync(req.file.path); return res.status(400).json({ success: false, message: 'Tanggal kejadian wajib diisi.' }); }
    const dokumentasi = req.file ? req.file.filename : null;
    const q = 'INSERT INTO kejadian_silakar (tanggal_kejadian, waktu_laporan, waktu_berangkat, waktu_tiba, kabupaten_kota, kapanewon, kalurahan, alamat_lokasi, koordinat, sumber_pengaduan, nama_pelapor, nomor_kontak, jenis_kejadian, objek_terbakar, dugaan_penyebab, korban_meninggal, korban_luka, jumlah_terdampak, unit_damkarmat, jumlah_armada, sumber_air, status_penanganan, waktu_selesai, perkiraan_kerugian, dokumentasi, keterangan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26) RETURNING *';
    const values = [tanggal_kejadian, waktu_laporan||null, waktu_berangkat||null, waktu_tiba||null, kabupaten_kota||null, kapanewon||null, kalurahan||null, alamat_lokasi||null, koordinat||null, sumber_pengaduan||null, nama_pelapor||null, nomor_kontak||null, jenis_kejadian||null, objek_terbakar||null, dugaan_penyebab||null, parseInt(korban_meninggal)||0, parseInt(korban_luka)||0, parseInt(jumlah_terdampak)||0, unit_damkarmat||null, parseInt(jumlah_armada)||0, sumber_air||null, status_penanganan||'Dalam Penanganan', waktu_selesai||null, parseInt(perkiraan_kerugian)||0, dokumentasi, keterangan||null];
    const result = await db.query(q, values);
    return res.status(201).json({ success: true, message: 'Data kejadian SILAKAR berhasil disimpan ke database.', data: result.rows[0] });
  } catch (error) {
    console.error('Error createSilakar:', error);
    if (req.file && fss.existsSync(req.file.path)) fss.unlinkSync(req.file.path);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan data kejadian.' });
  }
};

const updateSilakar = async (req, res) => {
  try {
    await ensureSilakarReady();
    const { id } = req.params;
    const check = await db.query('SELECT * FROM kejadian_silakar WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, message: 'Data kejadian tidak ditemukan.' });
    const current = check.rows[0];
    const { tanggal_kejadian, waktu_laporan, waktu_berangkat, waktu_tiba, kabupaten_kota, kapanewon, kalurahan, alamat_lokasi, koordinat, sumber_pengaduan, nama_pelapor, nomor_kontak, jenis_kejadian, objek_terbakar, dugaan_penyebab, korban_meninggal, korban_luka, jumlah_terdampak, unit_damkarmat, jumlah_armada, sumber_air, status_penanganan, waktu_selesai, perkiraan_kerugian, keterangan } = req.body;
    let dokumentasi = current.dokumentasi;
    if (req.file) { if (current.dokumentasi) { const op = path.join(__dirname, '../uploads', current.dokumentasi); if (fss.existsSync(op)) fss.unlinkSync(op); } dokumentasi = req.file.filename; }
    const uq = 'UPDATE kejadian_silakar SET tanggal_kejadian=$1, waktu_laporan=$2, waktu_berangkat=$3, waktu_tiba=$4, kabupaten_kota=$5, kapanewon=$6, kalurahan=$7, alamat_lokasi=$8, koordinat=$9, sumber_pengaduan=$10, nama_pelapor=$11, nomor_kontak=$12, jenis_kejadian=$13, objek_terbakar=$14, dugaan_penyebab=$15, korban_meninggal=$16, korban_luka=$17, jumlah_terdampak=$18, unit_damkarmat=$19, jumlah_armada=$20, sumber_air=$21, status_penanganan=$22, waktu_selesai=$23, perkiraan_kerugian=$24, dokumentasi=$25, keterangan=$26, updated_at=NOW() WHERE id=$27';
    await db.query(uq, [tanggal_kejadian||current.tanggal_kejadian, waktu_laporan!==undefined?(waktu_laporan||null):current.waktu_laporan, waktu_berangkat!==undefined?(waktu_berangkat||null):current.waktu_berangkat, waktu_tiba!==undefined?(waktu_tiba||null):current.waktu_tiba, kabupaten_kota||current.kabupaten_kota, kapanewon!==undefined?kapanewon:current.kapanewon, kalurahan!==undefined?kalurahan:current.kalurahan, alamat_lokasi||current.alamat_lokasi, koordinat!==undefined?koordinat:current.koordinat, sumber_pengaduan!==undefined?sumber_pengaduan:current.sumber_pengaduan, nama_pelapor!==undefined?nama_pelapor:current.nama_pelapor, nomor_kontak!==undefined?nomor_kontak:current.nomor_kontak, jenis_kejadian||current.jenis_kejadian, objek_terbakar!==undefined?objek_terbakar:current.objek_terbakar, dugaan_penyebab!==undefined?dugaan_penyebab:current.dugaan_penyebab, parseInt(korban_meninggal)>=0?parseInt(korban_meninggal):current.korban_meninggal, parseInt(korban_luka)>=0?parseInt(korban_luka):current.korban_luka, parseInt(jumlah_terdampak)>=0?parseInt(jumlah_terdampak):current.jumlah_terdampak, unit_damkarmat!==undefined?unit_damkarmat:current.unit_damkarmat, parseInt(jumlah_armada)>=0?parseInt(jumlah_armada):current.jumlah_armada, sumber_air!==undefined?sumber_air:current.sumber_air, status_penanganan||current.status_penanganan, waktu_selesai!==undefined?(waktu_selesai||null):current.waktu_selesai, parseInt(perkiraan_kerugian)>=0?parseInt(perkiraan_kerugian):current.perkiraan_kerugian, dokumentasi, keterangan!==undefined?keterangan:current.keterangan, id]);
    const updated = await db.query('SELECT * FROM kejadian_silakar WHERE id = $1', [id]);
    return res.status(200).json({ success: true, message: 'Data kejadian berhasil diperbarui di database.', data: updated.rows[0] });
  } catch (error) {
    console.error('Error updateSilakar:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui data kejadian.' });
  }
};

const deleteSilakar = async (req, res) => {
  try {
    await ensureSilakarReady();
    const { id } = req.params;
    const check = await db.query('SELECT * FROM kejadian_silakar WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, message: 'Data kejadian tidak ditemukan.' });
    const record = check.rows[0];
    if (record.dokumentasi) { const fp = path.join(__dirname, '../uploads', record.dokumentasi); if (fss.existsSync(fp)) fss.unlinkSync(fp); }
    await db.query('DELETE FROM kejadian_silakar WHERE id = $1', [id]);
    return res.status(200).json({ success: true, message: 'Data kejadian berhasil dihapus dari database.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus data kejadian.' });
  }
};

module.exports = { getAllSilakar, getSilakarById, createSilakar, updateSilakar, deleteSilakar };