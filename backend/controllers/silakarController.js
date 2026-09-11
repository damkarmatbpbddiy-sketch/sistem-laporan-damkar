const db = require('../config/db');
const fss = require('fs');
const path = require('path');
const { parseFile } = require('../utils/fileParser');

function readRecordValue(record, names) {
  const normalized = Object.fromEntries(Object.entries(record || {}).map(([key, value]) => [
    key.toLowerCase().replace(/[^a-z0-9]+/g, '_'), value
  ]));
  const key = names.find(name => normalized[name] !== undefined && normalized[name] !== '');
  return key ? normalized[key] : null;
}

function normalizeDateValue(value) {
  if (!value) return null;
  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const localMatch = text.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})/);
  if (localMatch) return `${localMatch[3]}-${localMatch[2]}-${localMatch[1]}`;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
}

async function getUploadedSilakarRows() {
  const result = await db.query('SELECT id, nama_file, nama_asli, nama_folder, kategori, file_year, record_count, parsed_data, created_at FROM arsip_data ORDER BY created_at DESC');
  const rows = [];
  for (const file of result.rows || []) {
    let parsed = file.parsed_data;
    try {
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    } catch (error) {
      parsed = null;
    }

    const records = Array.isArray(parsed?.records) ? parsed.records : [];
    records.forEach((record, index) => {
      const jenis = readRecordValue(record, ['jenis_kejadian', 'jenis', 'kategori', 'kejadian', 'jenis_kebakaran']) || 'Kejadian dari Upload';
      rows.push({
        id: `upload-${file.id}-${index + 1}`,
        tanggal_kejadian: readRecordValue(record, ['tanggal_kejadian', 'tanggal', 'date']) || `${file.file_year || new Date(file.created_at).getFullYear()}-01-01`,
        kabupaten_kota: readRecordValue(record, ['kabupaten_kota', 'kabupaten', 'kab_kota', 'kota']) || '-',
        kapanewon: readRecordValue(record, ['kapanewon', 'kecamatan', 'district']) || '-',
        kalurahan: readRecordValue(record, ['kalurahan', 'kelurahan', 'desa']) || '-',
        alamat_lokasi: readRecordValue(record, ['alamat_lokasi', 'alamat', 'lokasi']) || '-',
        jenis_kejadian: jenis,
        objek_terbakar: readRecordValue(record, ['objek_terbakar', 'objek', 'object']) || '-',
        dugaan_penyebab: readRecordValue(record, ['dugaan_penyebab', 'penyebab', 'cause']) || '-',
        korban_meninggal: Number(readRecordValue(record, ['korban_meninggal', 'meninggal'])) || 0,
        korban_luka: Number(readRecordValue(record, ['korban_luka', 'luka'])) || 0,
        jumlah_terdampak: Number(readRecordValue(record, ['jumlah_terdampak', 'terdampak', 'jumlah_korban'])) || 0,
        status_penanganan: readRecordValue(record, ['status_penanganan', 'status']) || 'Dalam Penanganan',
        perkiraan_kerugian: Number(readRecordValue(record, ['perkiraan_kerugian', 'kerugian'])) || 0,
        sumber_upload: `${file.nama_folder || 'Umum'} / ${file.nama_asli}`,
        kategori_upload: file.kategori || '',
        source_type: 'upload'
      });
    });

    if (records.length === 0) {
      rows.push({
        id: `upload-${file.id}-1`,
        tanggal_kejadian: `${file.file_year || new Date(file.created_at).getFullYear()}-01-01`,
        kabupaten_kota: '-',
        kapanewon: '-',
        kalurahan: '-',
        alamat_lokasi: file.nama_folder || 'Umum',
        jenis_kejadian: file.kategori || 'Data Upload',
        objek_terbakar: file.nama_asli || file.nama_file,
        dugaan_penyebab: `Berkas upload (${file.record_count || 1} data)`,
        korban_meninggal: 0,
        korban_luka: 0,
        jumlah_terdampak: Number(file.record_count) || 0,
        status_penanganan: 'Data Upload',
        perkiraan_kerugian: 0,
        sumber_upload: `${file.nama_folder || 'Umum'} / ${file.nama_asli || file.nama_file}`,
        kategori_upload: file.kategori || '',
        source_type: 'upload'
      });
    }
  }
  return rows;
}

const fallbackSilakarData = [
  { id: 1, tanggal_kejadian: '2026-08-28', waktu_laporan: '14:30:00', kabupaten_kota: 'Kabupaten Sleman', kapanewon: 'Depok', kalurahan: 'Caturtunggal', alamat_lokasi: 'Jl. Kaliurang Km 5, Depok, Sleman', jenis_kejadian: 'Kebakaran Permukiman', objek_terbakar: 'Rumah Tinggal', dugaan_penyebab: 'Korsleting Listrik', korban_meninggal: 0, korban_luka: 1, jumlah_terdampak: 4, unit_damkarmat: 'Pos Damkar Sleman', jumlah_armada: 2, status_penanganan: 'Selesai', perkiraan_kerugian: 45000000, keterangan: 'Penanganan selesai dengan aman.' },
  { id: 2, tanggal_kejadian: '2026-08-25', waktu_laporan: '11:15:00', kabupaten_kota: 'Kabupaten Gunungkidul', kapanewon: 'Playen', kalurahan: 'Logandeng', alamat_lokasi: 'Jl. Jogja-Wonosari Km 22, Playen', jenis_kejadian: 'Kebakaran Lahan', objek_terbakar: 'Lalang Kering', dugaan_penyebab: 'Pembakaran Sampah', korban_meninggal: 0, korban_luka: 0, jumlah_terdampak: 0, unit_damkarmat: 'Pos Damkar Gunungkidul', jumlah_armada: 1, status_penanganan: 'Selesai', perkiraan_kerugian: 5000000, keterangan: 'Api berhasil dilokalisir.' },
  { id: 3, tanggal_kejadian: '2026-08-20', waktu_laporan: '03:45:00', kabupaten_kota: 'Kabupaten Bantul', kapanewon: 'Sewon', kalurahan: 'Panggungharjo', alamat_lokasi: 'Jl. Parangtritis Km 4.5, Sewon, Bantul', jenis_kejadian: 'Kebakaran Gedung', objek_terbakar: 'Ruko Sembako', dugaan_penyebab: 'Tabung Gas Bocor', korban_meninggal: 0, korban_luka: 0, jumlah_terdampak: 2, unit_damkarmat: 'Pos Damkar Bantul', jumlah_armada: 3, status_penanganan: 'Selesai', perkiraan_kerugian: 120000000, keterangan: 'Kerugian material ruko sembako.' },
  { id: 4, tanggal_kejadian: '2026-08-15', waktu_laporan: '22:10:00', kabupaten_kota: 'Kabupaten Sleman', kapanewon: 'Godean', kalurahan: 'Sidoagung', alamat_lokasi: 'Jl. Godean Km 8, Sleman', jenis_kejadian: 'Kebakaran Gedung', objek_terbakar: 'Gudang Kayu', dugaan_penyebab: 'Gesekan Mesin', korban_meninggal: 0, korban_luka: 0, jumlah_terdampak: 0, unit_damkarmat: 'Pos Damkar Godean', jumlah_armada: 2, status_penanganan: 'Selesai', perkiraan_kerugian: 85000000, keterangan: 'Berhasil dipadamkan total.' },
  { id: 5, tanggal_kejadian: '2026-08-10', waktu_laporan: '16:20:00', kabupaten_kota: 'Kota Yogyakarta', kapanewon: 'Umbulharjo', kalurahan: 'Pandeyan', alamat_lokasi: 'Jl. Glagahsari, Umbulharjo, Kota Jogja', jenis_kejadian: 'Kebakaran Kendaraan', objek_terbakar: 'Mobil Mini Bus', dugaan_penyebab: 'Kebocoran Selang Bensin', korban_meninggal: 0, korban_luka: 0, jumlah_terdampak: 1, unit_damkarmat: 'Pos Damkar Pusat Yogyakarta', jumlah_armada: 1, status_penanganan: 'Selesai', perkiraan_kerugian: 35000000, keterangan: 'Tidak ada korban jiwa.' },
  { id: 6, tanggal_kejadian: '2026-08-05', waktu_laporan: '09:10:00', kabupaten_kota: 'Kabupaten Kulon Progo', kapanewon: 'Wates', kalurahan: 'Giripeni', alamat_lokasi: 'Jl. Wates-Purworejo, Wates, Kulon Progo', jenis_kejadian: 'Kebakaran Gedung', objek_terbakar: 'Kios Sembako Pasar', dugaan_penyebab: 'Korsleting Listrik', korban_meninggal: 0, korban_luka: 0, jumlah_terdampak: 3, unit_damkarmat: 'Pos Damkar Kulon Progo', jumlah_armada: 2, status_penanganan: 'Dalam Penanganan', perkiraan_kerugian: 25000000, keterangan: 'Petugas masih melakukan pendinginan.' }
];

const getAllSilakar = async (req, res) => {
  try {
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
    queryText += ' ORDER BY tanggal_kejadian ASC, created_at ASC';
    
    try {
      const result = await db.query(queryText, params);
      const statsResult = await db.query('SELECT COUNT(*) as total, COALESCE(SUM(korban_meninggal),0) as total_meninggal, COALESCE(SUM(korban_luka),0) as total_luka, COALESCE(SUM(jumlah_terdampak),0) as total_terdampak, COUNT(CASE WHEN status_penanganan = ' + "'Selesai'" + ' THEN 1 END) as selesai, COUNT(CASE WHEN status_penanganan = ' + "'Dalam Penanganan'" + ' THEN 1 END) as dalam_penanganan FROM kejadian_silakar');
      const stats = statsResult.rows[0] || {};
      
      let rowsData = result.rows || [];
      let uploadedRows = [];
      try {
        uploadedRows = await getUploadedSilakarRows();
      } catch (uploadError) {
        console.warn('⚠️ Gagal membaca record hasil upload:', uploadError.message);
      }

      const filteredUploadedRows = uploadedRows.filter(row => {
        const text = `${row.kabupaten_kota} ${row.alamat_lokasi} ${row.objek_terbakar} ${row.jenis_kejadian} ${row.kategori_upload} ${row.sumber_upload}`.toLowerCase();
        if (search && !text.includes(search.toLowerCase())) return false;
        if (status && status !== 'Semua' && row.status_penanganan !== status) return false;
        if (kabupaten && !String(row.kabupaten_kota).toLowerCase().includes(kabupaten.toLowerCase())) return false;
        if (jenis && !String(row.jenis_kejadian).toLowerCase().includes(jenis.toLowerCase())) return false;
        const rowDate = normalizeDateValue(row.tanggal_kejadian);
        if (startDate && (!rowDate || rowDate < startDate)) return false;
        if (endDate && (!rowDate || rowDate > endDate)) return false;
        return true;
      });
      rowsData = [...rowsData, ...filteredUploadedRows];
      rowsData.sort((first, second) => {
        const firstDate = normalizeDateValue(first.tanggal_kejadian) || '9999-12-31';
        const secondDate = normalizeDateValue(second.tanggal_kejadian) || '9999-12-31';
        return firstDate.localeCompare(secondDate);
      });

      const combinedStats = rowsData.reduce((stats, row) => {
        stats.total++;
        stats.total_meninggal += Number(row.korban_meninggal) || 0;
        stats.total_luka += Number(row.korban_luka) || 0;
        stats.total_terdampak += Number(row.jumlah_terdampak) || 0;
        if (row.status_penanganan === 'Selesai') stats.selesai++;
        if (row.status_penanganan === 'Dalam Penanganan') stats.dalam_penanganan++;
        return stats;
      }, { total: 0, total_meninggal: 0, total_luka: 0, total_terdampak: 0, selesai: 0, dalam_penanganan: 0 });

      return res.status(200).json({
        success: true,
        stats: {
          total: combinedStats.total || rowsData.length,
          total_meninggal: combinedStats.total_meninggal,
          total_luka: combinedStats.total_luka,
          total_terdampak: combinedStats.total_terdampak,
          selesai: combinedStats.selesai,
          dalam_penanganan: combinedStats.dalam_penanganan
        },
        data: rowsData
      });
    } catch (dbErr) {
      console.error('Database query failed for getAllSilakar:', dbErr);
      return res.status(500).json({
        success: false,
        message: 'Gagal membaca data SILAKAR dari database.'
      });
    }
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
    const { tanggal_kejadian, waktu_laporan, waktu_berangkat, waktu_tiba, kabupaten_kota, kapanewon, kalurahan, alamat_lokasi, koordinat, sumber_pengaduan, nama_pelapor, nomor_kontak, jenis_kejadian, objek_terbakar, dugaan_penyebab, korban_meninggal, korban_luka, jumlah_terdampak, unit_damkarmat, jumlah_armada, sumber_air, status_penanganan, waktu_selesai, perkiraan_kerugian, keterangan } = req.body;
    if (!tanggal_kejadian) { if (req.file) fss.unlinkSync(req.file.path); return res.status(400).json({ success: false, message: 'Tanggal kejadian wajib diisi.' }); }
    const dokumentasi = req.file ? req.file.filename : null;
    const q = 'INSERT INTO kejadian_silakar (tanggal_kejadian, waktu_laporan, waktu_berangkat, waktu_tiba, kabupaten_kota, kapanewon, kalurahan, alamat_lokasi, koordinat, sumber_pengaduan, nama_pelapor, nomor_kontak, jenis_kejadian, objek_terbakar, dugaan_penyebab, korban_meninggal, korban_luka, jumlah_terdampak, unit_damkarmat, jumlah_armada, sumber_air, status_penanganan, waktu_selesai, perkiraan_kerugian, dokumentasi, keterangan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26) RETURNING *';
    const values = [tanggal_kejadian, waktu_laporan||null, waktu_berangkat||null, waktu_tiba||null, kabupaten_kota||null, kapanewon||null, kalurahan||null, alamat_lokasi||null, koordinat||null, sumber_pengaduan||null, nama_pelapor||null, nomor_kontak||null, jenis_kejadian||null, objek_terbakar||null, dugaan_penyebab||null, parseInt(korban_meninggal)||0, parseInt(korban_luka)||0, parseInt(jumlah_terdampak)||0, unit_damkarmat||null, parseInt(jumlah_armada)||0, sumber_air||null, status_penanganan||'Dalam Penanganan', waktu_selesai||null, parseInt(perkiraan_kerugian)||0, dokumentasi, keterangan||null];
    const result = await db.query(q, values);
    return res.status(201).json({ success: true, message: 'Data kejadian SILAKAR berhasil disimpan.', data: result.rows[0] });
  } catch (error) {
    console.error('Error createSilakar:', error);
    if (req.file && fss.existsSync(req.file.path)) fss.unlinkSync(req.file.path);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan data kejadian.' });
  }
};

const updateSilakar = async (req, res) => {
  try {
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
    return res.status(200).json({ success: true, message: 'Data kejadian berhasil diperbarui.', data: updated.rows[0] });
  } catch (error) {
    console.error('Error updateSilakar:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui data kejadian.' });
  }
};

const deleteSilakar = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await db.query('SELECT * FROM kejadian_silakar WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, message: 'Data kejadian tidak ditemukan.' });
    const record = check.rows[0];
    if (record.dokumentasi) { const fp = path.join(__dirname, '../uploads', record.dokumentasi); if (fss.existsSync(fp)) fss.unlinkSync(fp); }
    await db.query('DELETE FROM kejadian_silakar WHERE id = $1', [id]);
    return res.status(200).json({ success: true, message: 'Data kejadian berhasil dihapus.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus data kejadian.' });
  }
};

module.exports = { getAllSilakar, getSilakarById, createSilakar, updateSilakar, deleteSilakar };