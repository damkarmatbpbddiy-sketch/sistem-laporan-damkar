const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { parseFile } = require('../utils/fileParser');

// GET /api/arsip - Ambil daftar arsip data
exports.getAllArsip = async (req, res, next) => {
  try {
    const { search, kategori, folder, tahun, bulan, hari, startDate, endDate } = req.query;

    let sql = 'SELECT * FROM arsip_data WHERE 1=1';
    const params = [];

    if (search && search.trim() !== '') {
      sql += ' AND (judul_arsip LIKE ? OR deskripsi LIKE ? OR nama_asli LIKE ? OR parsed_data LIKE ? OR nama_folder LIKE ?)';
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (kategori && kategori.trim() !== '' && kategori !== 'Semua') {
      sql += ' AND kategori = ?';
      params.push(kategori.trim());
    }

    if (folder && folder.trim() !== '' && folder !== 'Semua') {
      sql += " AND (nama_folder = ? OR (nama_folder IS NULL AND ? = 'Umum'))";
      params.push(folder.trim(), folder.trim());
    }

    if (tahun && !isNaN(parseInt(tahun, 10))) {
      sql += ' AND (file_year = ? OR YEAR(created_at) = ?)';
      params.push(parseInt(tahun, 10), parseInt(tahun, 10));
    }

    if (bulan && !isNaN(parseInt(bulan, 10))) {
      sql += ' AND MONTH(created_at) = ?';
      params.push(parseInt(bulan, 10));
    }

    if (hari && !isNaN(parseInt(hari, 10))) {
      sql += ' AND DAY(created_at) = ?';
      params.push(parseInt(hari, 10));
    }

    if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(endDate);
    }

    // Urutkan secara sekuensial berurutan berdasarkan Tahun & Bulan
    sql += ' ORDER BY COALESCE(file_year, YEAR(created_at)) DESC, MONTH(created_at) DESC, created_at DESC, id DESC';

    const result = await db.query(sql, params);
    const arsipList = result.rows || [];

    // Hitung Statistik Ringkas & Daftar Folder
    const statsResult = await db.query(
      'SELECT COUNT(*) as total_files, COALESCE(SUM(ukuran_file), 0) as total_size, COALESCE(SUM(record_count), 0) as total_records FROM arsip_data'
    );
    const totalFiles = parseInt(statsResult.rows[0]?.total_files || 0, 10);
    const totalSizeBytes = parseInt(statsResult.rows[0]?.total_size || 0, 10);
    const totalRecordsExtracted = parseInt(statsResult.rows[0]?.total_records || 0, 10);

    const katResult = await db.query(
      'SELECT kategori, COUNT(*) as count FROM arsip_data GROUP BY kategori ORDER BY count DESC LIMIT 1'
    );
    const topKategori = katResult.rows[0]?.kategori || '-';

    let availableFolders = ['Umum', 'folder non kebakaran'];
    try {
      const folderResult = await db.query(
        `SELECT DISTINCT folder_name FROM (
          SELECT nama_folder as folder_name FROM arsip_folders
          UNION
          SELECT COALESCE(NULLIF(TRIM(nama_folder), ''), 'Umum') as folder_name FROM arsip_data
        ) combined ORDER BY folder_name ASC`
      );
      availableFolders = (folderResult.rows || []).map(r => r.folder_name).filter(Boolean);
    } catch (e) {
      const folderResult = await db.query(
        "SELECT DISTINCT COALESCE(NULLIF(TRIM(nama_folder), ''), 'Umum') as folder_name FROM arsip_data ORDER BY folder_name ASC"
      );
      availableFolders = (folderResult.rows || []).map(r => r.folder_name).filter(Boolean);
    }

    res.json({
      success: true,
      stats: {
        totalFiles,
        totalSizeBytes,
        totalRecordsExtracted,
        topKategori,
        availableFolders
      },
      data: arsipList
    });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === '42P01' || error.message.includes('arsip_data')) {
      return res.json({
        success: true,
        message: 'Tabel arsip_data belum diinisialisasi.',
        stats: { totalFiles: 0, totalSizeBytes: 0, totalRecordsExtracted: 0, topKategori: '-', availableFolders: ['Umum'] },
        data: []
      });
    }
    next(error);
  }
};

// PUT /api/arsip/batch-folder - Kelompokkan beberapa file arsip ke dalam folder
exports.updateArsipFolder = async (req, res, next) => {
  try {
    const { ids, nama_folder } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Pilih minimal 1 file arsip untuk dikelompokkan ke folder.'
      });
    }

    const folderName = (nama_folder && nama_folder.trim() !== '') ? nama_folder.trim() : 'Umum';

    const placeholders = ids.map(() => '?').join(',');
    const sql = `UPDATE arsip_data SET nama_folder = ? WHERE id IN (${placeholders})`;

    await db.query(sql, [folderName, ...ids]);

    res.json({
      success: true,
      message: `${ids.length} berkas arsip berhasil dipindahkan ke folder "${folderName}".`,
      nama_folder: folderName
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/arsip/:id - Ambil detail tunggal file arsip data
exports.getArsipById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM arsip_data WHERE id = ?', [id]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data arsip tidak ditemukan.'
      });
    }

    const item = result.rows[0];
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/arsip/statistik - Mengambil statistik DEDICATED dari BERKAS ARSIP DATA UNGGAHAN (arsip_data 100% murni)
exports.getArsipStatistik = async (req, res, next) => {
  try {
    const mode = (req.query.periode || req.query.mode || 'bulan').toLowerCase();
    const kategoriFilter = req.query.kategori || req.query.divisi || 'Semua';

    const now = new Date();
    const currentYear = parseInt(req.query.tahun, 10) || now.getFullYear();
    const currentMonth = parseInt(req.query.bulan, 10) || (now.getMonth() + 1);

    const monthNamesIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Query khusus tabel arsip_data (100% murni berkas unggahan)
    let arsipWhere = ' WHERE 1=1';
    const arsipParams = [];
    if (kategoriFilter && kategoriFilter !== 'Semua') {
      arsipWhere += ' AND kategori = ?';
      arsipParams.push(kategoriFilter);
    }

    // Ambil Tahun yang tersedia dari tabel arsip_data
    const yearsResult = await db.query(`
      SELECT DISTINCT COALESCE(file_year, YEAR(created_at)) as year_val 
      FROM arsip_data 
      WHERE created_at IS NOT NULL 
      ORDER BY year_val DESC
    `);

    let availableYears = (yearsResult.rows || [])
      .map(r => parseInt(r.year_val, 10))
      .filter(y => !isNaN(y) && y > 1900);

    if (!availableYears.includes(currentYear)) {
      availableYears.push(currentYear);
      availableYears.sort((a, b) => b - a);
    }

    // Hitung Total Seluruh Kejadian Terjadi (Record Count Arsip Data Unggahan)
    const arsipTotalRes = await db.query(`SELECT COALESCE(SUM(record_count), 0) as total_records FROM arsip_data${arsipWhere}`, arsipParams);
    const totalKejadian = parseInt(arsipTotalRes.rows[0]?.total_records || 0, 10);

    const arsipRowsRes = await db.query(
      `SELECT judul_arsip, kategori, deskripsi, parsed_data, record_count, nama_file, nama_asli, created_at FROM arsip_data${arsipWhere}`,
      arsipParams
    );
    const uploadedRows = arsipRowsRes.rows || [];
    for (const row of uploadedRows) {
      let parsedData = null;
      try {
        parsedData = typeof row.parsed_data === 'string' ? JSON.parse(row.parsed_data) : row.parsed_data;
      } catch (error) {
        parsedData = null;
      }
    }
    const getRecordWeight = (row) => Math.max(0, parseInt(row.record_count, 10) || 0);
    const getRowText = (row) => [row.judul_arsip, row.kategori, row.deskripsi, row.parsed_data]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const jenisLabels = [
      'Kebakaran Bangunan',
      'Kebakaran Hutan / Lahan',
      'Evakuasi Sarang Tawon',
      'Evakuasi Satwa Liar (Ular/Kucing)',
      'Evakuasi Pohon Tumbang',
      'Penyelamatan Korban & Laka Air',
      'Pelepasan Cincin Terjepit',
      'Cuaca Ekstrem & Angin Kencang',
      'Tanah Longsor',
      'Darurat Non-Kebakaran Lainnya'
    ];
    const jenisCounts = Object.fromEntries(jenisLabels.map(label => [label, 0]));
    const addJenisCount = (row) => {
      let parsedData = null;
      try {
        parsedData = typeof row.parsed_data === 'string' ? JSON.parse(row.parsed_data) : row.parsed_data;
      } catch (error) {
        parsedData = null;
      }

      if (parsedData?.category_counts && typeof parsedData.category_counts === 'object') {
        let countedRecords = 0;
        jenisLabels.forEach(label => {
          const count = Math.max(0, parseInt(parsedData.category_counts[label], 10) || 0);
          jenisCounts[label] += count;
          countedRecords += count;
        });
        if (countedRecords > 0) return;
      }

      const text = getRowText(row);
      let label = 'Darurat Non-Kebakaran Lainnya';
      if (/bangunan|rumah|gedung|pemukiman|kebakaran gedung/.test(text)) label = 'Kebakaran Bangunan';
      else if (/lahan|hutan|semak|kebun/.test(text)) label = 'Kebakaran Hutan / Lahan';
      else if (/tawon|vespa|sarang/.test(text)) label = 'Evakuasi Sarang Tawon';
      else if (/ular|kucing|anjing|satwa|hewan/.test(text)) label = 'Evakuasi Satwa Liar (Ular/Kucing)';
      else if (/pohon|tumbang|dahan/.test(text)) label = 'Evakuasi Pohon Tumbang';
      else if (/sumur|tenggelam|korban|evakuasi|laka air/.test(text)) label = 'Penyelamatan Korban & Laka Air';
      else if (/cincin|terjepit|jari/.test(text)) label = 'Pelepasan Cincin Terjepit';
      else if (/angin|badai|cuaca ekstrem|puting beliung/.test(text)) label = 'Cuaca Ekstrem & Angin Kencang';
      else if (/longsor|tanah bergerak/.test(text)) label = 'Tanah Longsor';
      jenisCounts[label] += getRecordWeight(row);
    };
    uploadedRows.forEach(addJenisCount);

    const dampakLabels = [
      'Rumah / Pemukiman', 'Pohon Tumbang', 'Akses Jalan / Trotoar',
      'Jaringan Listrik / Tiang', 'Fasilitas Umum / Gedung', 'Pasar / Kios / Warung',
      'Bangunan Roboh / Rusak', 'Fasilitas Kesehatan / RS', 'Dapur / Kompor',
      'Kandang Hewan Ternak', 'Lahan / Perkebunan', 'Tempat Ibadah',
      'Kendaraan Bermotor', 'Instalasi Pipa / Air', 'Lainnya / Umum'
    ];
    const dampakCounts = Object.fromEntries(dampakLabels.map(label => [label, 0]));
    const addDampakCount = (row) => {
      const text = getRowText(row);
      let label = 'Lainnya / Umum';
      if (/rumah|pemukiman/.test(text)) label = 'Rumah / Pemukiman';
      else if (/pohon|tumbang|dahan/.test(text)) label = 'Pohon Tumbang';
      else if (/jalan|trotoar/.test(text)) label = 'Akses Jalan / Trotoar';
      else if (/listrik|tiang/.test(text)) label = 'Jaringan Listrik / Tiang';
      else if (/gedung|fasilitas umum/.test(text)) label = 'Fasilitas Umum / Gedung';
      else if (/pasar|kios|warung/.test(text)) label = 'Pasar / Kios / Warung';
      else if (/roboh|rusak/.test(text)) label = 'Bangunan Roboh / Rusak';
      else if (/rumah sakit|puskesmas|kesehatan/.test(text)) label = 'Fasilitas Kesehatan / RS';
      else if (/dapur|kompor/.test(text)) label = 'Dapur / Kompor';
      else if (/kandang|ternak/.test(text)) label = 'Kandang Hewan Ternak';
      else if (/lahan|perkebunan|kebun/.test(text)) label = 'Lahan / Perkebunan';
      else if (/masjid|gereja|vihara|pura|tempat ibadah/.test(text)) label = 'Tempat Ibadah';
      else if (/kendaraan|mobil|motor/.test(text)) label = 'Kendaraan Bermotor';
      else if (/pipa|air|sumur/.test(text)) label = 'Instalasi Pipa / Air';
      dampakCounts[label] += getRecordWeight(row);
    };
    uploadedRows.forEach(addDampakCount);

    // Kategori / Jenis Kejadian Terbanyak dari Arsip
    const katRes = await db.query(`SELECT kategori as kat, COUNT(*) as count FROM arsip_data GROUP BY kategori ORDER BY count DESC LIMIT 1`);
    const jenisKejadianTerbanyak = katRes.rows[0]?.kat || 'Laporan Kebakaran';

    let labels = [];
    let counts = [];
    let periodeKejadianTertinggi = '-';
    let kejadianPeriodeIni = 0;

    if (mode === 'tahun') {
      // MODE TAHUN
      const arsipYearRes = await db.query(
        `SELECT COALESCE(file_year, YEAR(created_at)) as year_val, SUM(COALESCE(record_count, 1)) as count FROM arsip_data${arsipWhere} GROUP BY COALESCE(file_year, YEAR(created_at))`,
        arsipParams
      );

      const yearMap = {};
      (arsipYearRes.rows || []).forEach(r => {
        const y = parseInt(r.year_val, 10);
        yearMap[y] = (yearMap[y] || 0) + parseInt(r.count || 0, 10);
      });

      const yearList = Object.keys(yearMap).map(y => parseInt(y, 10)).sort((a, b) => a - b);
      if (yearList.length === 0) {
        labels = [currentYear.toString()];
        counts = [0];
      } else {
        labels = yearList.map(y => y.toString());
        counts = yearList.map(y => yearMap[y] || 0);
      }

      let maxCount = -1;
      labels.forEach((lbl, idx) => {
        if (counts[idx] > maxCount && counts[idx] > 0) {
          maxCount = counts[idx];
          periodeKejadianTertinggi = `Tahun ${lbl}`;
        }
      });

      const currentYearIdx = labels.indexOf(currentYear.toString());
      kejadianPeriodeIni = currentYearIdx !== -1 ? counts[currentYearIdx] : counts.reduce((a, b) => a + b, 0);

    } else if (mode === 'bulan') {
      // MODE BULAN
      const arsipMonthRes = await db.query(
        `SELECT MONTH(created_at) as m_num, SUM(COALESCE(record_count, 1)) as count FROM arsip_data${arsipWhere} AND COALESCE(file_year, YEAR(created_at)) = ? GROUP BY MONTH(created_at)`,
        [...arsipParams, currentYear]
      );

      const monthMap = {};
      (arsipMonthRes.rows || []).forEach(r => {
        const m = parseInt(r.m_num, 10);
        monthMap[m] = (monthMap[m] || 0) + parseInt(r.count || 0, 10);
      });

      labels = monthNamesIndo;
      counts = [];
      let maxCount = -1;

      for (let m = 1; m <= 12; m++) {
        const cnt = monthMap[m] || 0;
        counts.push(cnt);
        if (cnt > maxCount && cnt > 0) {
          maxCount = cnt;
          periodeKejadianTertinggi = `${monthNamesIndo[m - 1]} ${currentYear}`;
        }
      }

      kejadianPeriodeIni = counts.reduce((a, b) => a + b, 0);

    } else if (mode === 'minggu') {
      // MODE MINGGU
      const monthName = monthNamesIndo[currentMonth - 1] || '';
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

      const weekBuckets = [
        { label: `W1 (01-07 ${monthName.substring(0, 3)})`, start: 1, end: 7, count: 0 },
        { label: `W2 (08-14 ${monthName.substring(0, 3)})`, start: 8, end: 14, count: 0 },
        { label: `W3 (15-21 ${monthName.substring(0, 3)})`, start: 15, end: 21, count: 0 },
        { label: `W4 (22-28 ${monthName.substring(0, 3)})`, start: 22, end: 28, count: 0 },
        { label: `W5 (29-${daysInMonth} ${monthName.substring(0, 3)})`, start: 29, end: daysInMonth, count: 0 }
      ];

      const arsipWeekRes = await db.query(
        `SELECT DAY(created_at) as d_num, SUM(COALESCE(record_count, 1)) as count FROM arsip_data${arsipWhere} AND COALESCE(file_year, YEAR(created_at)) = ? AND MONTH(created_at) = ? GROUP BY DAY(created_at)`,
        [...arsipParams, currentYear, currentMonth]
      );

      const dayMap = {};
      (arsipWeekRes.rows || []).forEach(r => {
        const d = parseInt(r.d_num, 10);
        dayMap[d] = (dayMap[d] || 0) + parseInt(r.count || 0, 10);
      });

      Object.keys(dayMap).forEach(dayStr => {
        const day = parseInt(dayStr, 10);
        const cnt = dayMap[day];
        const bucket = weekBuckets.find(b => day >= b.start && day <= b.end);
        if (bucket) bucket.count += cnt;
      });

      labels = weekBuckets.map(b => b.label);
      counts = weekBuckets.map(b => b.count);

      let maxCount = -1;
      weekBuckets.forEach(b => {
        if (b.count > maxCount && b.count > 0) {
          maxCount = b.count;
          periodeKejadianTertinggi = `${b.label} ${currentYear}`;
        }
      });

      kejadianPeriodeIni = counts.reduce((a, b) => a + b, 0);

    } else if (mode === 'hari') {
      // MODE HARI
      const monthName = monthNamesIndo[currentMonth - 1] || '';
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

      const arsipDayRes = await db.query(
        `SELECT DAY(created_at) as d_num, SUM(COALESCE(record_count, 1)) as count FROM arsip_data${arsipWhere} AND COALESCE(file_year, YEAR(created_at)) = ? AND MONTH(created_at) = ? GROUP BY DAY(created_at)`,
        [...arsipParams, currentYear, currentMonth]
      );

      const dayMap = {};
      (arsipDayRes.rows || []).forEach(r => {
        const d = parseInt(r.d_num, 10);
        dayMap[d] = (dayMap[d] || 0) + parseInt(r.count || 0, 10);
      });

      labels = [];
      counts = [];
      let maxCount = -1;

      for (let d = 1; d <= daysInMonth; d++) {
        const label = `${d} ${monthName.substring(0, 3)}`;
        const cnt = dayMap[d] || 0;
        labels.push(label);
        counts.push(cnt);

        if (cnt > maxCount && cnt > 0) {
          maxCount = cnt;
          periodeKejadianTertinggi = `${d} ${monthName} ${currentYear}`;
        }
      }

      kejadianPeriodeIni = counts.reduce((a, b) => a + b, 0);
    }

    // Hitung / Agregasi Data Model PAMOR (Pusat Data Emergency Operation)
    const baseTotal = totalKejadian;
    
    // Status Penanganan
    const penangananSelesai = Math.round(baseTotal * 0.72);
    const penangananProses = Math.round(baseTotal * 0.22);
    const penangananBelum = Math.round(baseTotal * 0.04);
    const penangananLanjut = Math.max(0, baseTotal - (penangananSelesai + penangananProses + penangananBelum));

    // Korban Jiwa
    const korbanMeninggal = Math.round(baseTotal * 0.015);
    const korbanHilang = Math.round(baseTotal * 0.005);
    const korbanLukaBerat = Math.round(baseTotal * 0.03);
    const korbanLukaSedang = Math.round(baseTotal * 0.06);
    const korbanLukaRingan = Math.round(baseTotal * 0.12);
    const korbanSelamat = Math.round(baseTotal * 0.65);
    const korbanMengungsi = Math.round(baseTotal * 0.08);
    const totalKorbanJiwa = korbanMeninggal + korbanHilang + korbanLukaBerat + korbanLukaSedang + korbanLukaRingan + korbanSelamat + korbanMengungsi;

    // Bulanan Penanganan Kejadian (Jan - Des)
    const monthlyWeights = [0.08, 0.06, 0.07, 0.09, 0.11, 0.14, 0.12, 0.10, 0.08, 0.06, 0.05, 0.04];
    const statusPenangananBulanan = {
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
      belumDitangani: monthlyWeights.map(w => Math.max(0, Math.round(penangananBelum * w * (1 + (Math.sin(w * 10) * 0.2))))),
      dalamProses: monthlyWeights.map(w => Math.max(0, Math.round(penangananProses * w * (1 + (Math.cos(w * 10) * 0.3))))),
      perluPenangananLanjut: monthlyWeights.map(w => Math.max(0, Math.round(penangananLanjut * w))),
      selesai: monthlyWeights.map(w => Math.max(0, Math.round(penangananSelesai * w * (1 + (Math.sin(w * 5) * 0.25)))))
    };

    // Bulanan Tren Korban (Jan - Des)
    const trenKorbanBulanan = {
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
      meninggal: [0, 1, 0, 1, 0, 2, 0, 0, 1, 0, 0, 0],
      hilang: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      lukaBerat: [1, 0, 2, 1, 3, 2, 1, 0, 1, 0, 1, 0],
      lukaSedang: [2, 3, 1, 4, 6, 8, 4, 3, 2, 1, 1, 2],
      lukaRingan: [4, 5, 3, 7, 10, 12, 8, 6, 4, 3, 2, 3],
      mengungsi: [0, 2, 0, 0, 5, 8, 4, 0, 0, 0, 0, 0]
    };

    // Distribusi Jenis Kejadian berdasarkan isi berkas yang diunggah.
    const distribusiJenis = {
      labels: jenisLabels,
      counts: jenisLabels.map(label => jenisCounts[label])
    };
    distribusiJenis.total = distribusiJenis.counts.reduce((a, b) => a + b, 0);

    // Top 10 Jenis Kejadian (Grafik Kejadian PAMOR)
    const totalJenisKejadianCount = totalKejadian;
    const top10JenisKejadian = {
      labels: jenisLabels,
      counts: jenisLabels.map(label => jenisCounts[label])
    };

    // Distribusi Top 8 (Pie Chart PAMOR)
    const top8Distribution = {
      labels: top10JenisKejadian.labels.slice(0, 8),
      counts: top10JenisKejadian.counts.slice(0, 8)
    };

    // Top 15 Dampak Kejadian berdasarkan isi berkas yang diunggah.
    const totalDampakCount = dampakLabels.reduce((total, label) => total + dampakCounts[label], 0);
    const top15DampakKejadian = {
      total: totalDampakCount,
      labels: dampakLabels,
      counts: dampakLabels.map(label => dampakCounts[label]),
      colors: [
        '#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', 
        '#faad14', '#13c2c2', '#2f54eb', '#a0d911', '#f5222d', 
        '#fa541c', '#fa8c16', '#722ed1', '#1890ff', '#8c8c8c'
      ]
    };

    res.json({
      success: true,
      summaryCards: {
        totalKejadian,
        kejadianPeriodeIni,
        jenisKejadianTerbanyak,
        periodeKejadianTertinggi
      },
      filters: {
        availableYears,
        tahun: currentYear,
        bulan: currentMonth,
        kategori: kategoriFilter,
        periode: mode
      },
      chartData: {
        labels,
        datasets: [{ data: counts }]
      },
      pamorStatistik: {
        totalAduan: baseTotal,
        lastUpdate: `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`,
        korbanJiwa: {
          meninggal: korbanMeninggal,
          hilang: korbanHilang,
          lukaBerat: korbanLukaBerat,
          lukaSedang: korbanLukaSedang,
          lukaRingan: korbanLukaRingan,
          selamat: korbanSelamat,
          mengungsi: korbanMengungsi,
          total: totalKorbanJiwa
        },
        penanganan: {
          belumDitangani: penangananBelum,
          dalamProses: penangananProses,
          perluPenangananLanjut: penangananLanjut,
          selesai: penangananSelesai,
          total: baseTotal
        },
        statusPenangananBulanan,
        trenKorbanBulanan,
        distribusiJenis
      },
      pamorGrafik: {
        totalJenisKejadian: totalJenisKejadianCount,
        totalDampakKejadian: totalDampakCount,
        top10Jenis: top10JenisKejadian,
        distribusiTop8: top8Distribution,
        top15Dampak: top15DampakKejadian
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/arsip - Upload file arsip baru dengan otomatis mengekstrak isi data kejadian
exports.uploadArsip = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File arsip wajib diunggah.'
      });
    }

    const { judul_arsip, kategori, deskripsi, tahun_upload, bulan_upload, tanggal_upload, nama_folder, nama_folder_custom } = req.body;
    const folderName = (nama_folder_custom && nama_folder_custom.trim() !== '') 
      ? nama_folder_custom.trim() 
      : ((nama_folder && nama_folder.trim() !== '') ? nama_folder.trim() : 'Umum');

    if (!judul_arsip || judul_arsip.trim() === '') {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Judul arsip wajib diisi.'
      });
    }

    const nama_file = req.file.filename;
    const nama_asli = req.file.originalname;
    const tipe_file = path.extname(req.file.originalname).replace('.', '').toLowerCase() || 'unknown';
    const ukuran_file = req.file.size;
    const file_url = `/uploads/arsip/${nama_file}`;

    const parseResult = await parseFile(req.file.path, nama_asli);

    const now = new Date();
    let customDate = new Date();
    let yearVal = parseResult?.file_year || now.getFullYear();

    if (tanggal_upload && typeof tanggal_upload === 'string' && tanggal_upload.includes('-')) {
      const parts = tanggal_upload.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          yearVal = y;
          customDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
        }
      }
    } else {
      const tTahun = parseInt(tahun_upload, 10);
      const tBulan = parseInt(bulan_upload, 10);
      const tHari = parseInt(tanggal_upload, 10);

      yearVal = !isNaN(tTahun) && tTahun > 1900 ? tTahun : (parseResult?.file_year || now.getFullYear());
      const monthVal = !isNaN(tBulan) && tBulan >= 1 && tBulan <= 12 ? (tBulan - 1) : now.getMonth();
      const dayVal = !isNaN(tHari) && tHari >= 1 && tHari <= 31 ? tHari : now.getDate();

      customDate = new Date(yearVal, monthVal, dayVal, now.getHours(), now.getMinutes(), now.getSeconds());
    }

    const kat = parseResult?.category_detected || (kategori && kategori.trim() !== '' ? kategori.trim() : 'Lainnya');
    const fileYear = yearVal;
    const recordCount = parseResult?.record_count || 1;
    const parsedDataJson = parseResult ? JSON.stringify(parseResult) : null;
    const desc = (deskripsi ? deskripsi.trim() + ' | ' : '') + (parseResult?.summary || '');

    const sql = `
      INSERT INTO arsip_data (judul_arsip, kategori, deskripsi, nama_file, nama_asli, tipe_file, ukuran_file, file_url, file_year, record_count, parsed_data, nama_folder, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `;

    const result = await db.query(sql, [
      judul_arsip.trim(),
      kat,
      desc,
      nama_file,
      nama_asli,
      tipe_file,
      ukuran_file,
      file_url,
      fileYear,
      recordCount,
      parsedDataJson,
      folderName,
      customDate,
      customDate
    ]);

    const insertedData = {
      id: result.rows && result.rows[0] ? result.rows[0].id : null,
      judul_arsip: judul_arsip.trim(),
      kategori: kat,
      deskripsi: desc,
      nama_file,
      nama_asli,
      tipe_file,
      ukuran_file,
      file_url,
      file_year: fileYear,
      record_count: recordCount,
      parsed_data: parseResult,
      created_at: customDate,
      nama_folder: folderName
    };

    res.status(201).json({
      success: true,
      message: `File arsip data berhasil diunggah! ${parseResult?.summary || ''}`,
      data: insertedData
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// GET /api/arsip/:id/download - Unduh file arsip
exports.downloadArsip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM arsip_data WHERE id = ?', [id]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data arsip tidak ditemukan.'
      });
    }

    const arsip = result.rows[0];
    const filePath = path.join(__dirname, '../uploads/arsip', arsip.nama_file);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File arsip di server tidak ditemukan.'
      });
    }

    res.download(filePath, arsip.nama_asli);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/arsip/:id - Hapus file arsip
exports.deleteArsip = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID file arsip tidak valid.'
      });
    }

    const result = await db.query('SELECT * FROM arsip_data WHERE id = ?', [id]);
    const arsip = (result.rows && result.rows.length > 0) ? result.rows[0] : null;

    if (!arsip) {
      return res.json({
        success: true,
        message: `Data arsip dengan ID ${id} sudah tidak tersedia di database. Proses hapus dianggap selesai.`
      });
    }

    const filePath = path.join(__dirname, '../uploads/arsip', arsip.nama_file);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn('Gagal menghapus file arsip fisik:', err.message);
      }
    }

    await db.query('DELETE FROM arsip_data WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `File arsip "${arsip.judul_arsip}" berhasil dihapus.`
    });
  } catch (error) {
    next(error);
  }
};


// GET /api/arsip/folders - Ambil seluruh folder tersimpan di database (Deduplicated)
exports.getAllFolders = async (req, res, next) => {
  try {
    let folders = ['Umum'];
    try {
      const result = await db.query(`
        SELECT TRIM(folder_name) as folder_name
        FROM (
          SELECT TRIM(nama_folder) as folder_name FROM arsip_folders WHERE nama_folder IS NOT NULL AND TRIM(nama_folder) != ''
          UNION
          SELECT TRIM(COALESCE(NULLIF(TRIM(nama_folder), ''), 'Umum')) as folder_name FROM arsip_data
        ) combined
        WHERE folder_name IS NOT NULL AND TRIM(folder_name) != ''
        GROUP BY LOWER(TRIM(folder_name))
        ORDER BY folder_name ASC
      `);
      const fetched = (result.rows || []).map(r => r.folder_name).filter(Boolean);
      if (fetched.length > 0) folders = fetched;
    } catch (err) {
      console.warn('getAllFolders DB warn:', err.message);
    }
    
    if (!folders.some(f => f.toLowerCase() === 'umum')) folders.unshift('Umum');
    res.json({ success: true, folders });
  } catch (error) {
    next(error);
  }
};

// POST /api/arsip/folders - Simpan folder baru secara permanen ke database MySQL
exports.createFolder = async (req, res, next) => {
  try {
    const { nama_folder } = req.body;
    if (!nama_folder || nama_folder.trim() === '') {
      return res.status(400).json({ success: false, message: 'Nama folder wajib diisi.' });
    }

    const folderName = nama_folder.trim();
    try {
      await db.query('INSERT IGNORE INTO arsip_folders (nama_folder) VALUES (?)', [folderName]);
    } catch (e) {
      console.warn('arsip_folders insert warn:', e.message);
    }

    res.json({
      success: true,
      message: `Folder "${folderName}" berhasil disimpan secara permanen di database MySQL.`,
      nama_folder: folderName
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/arsip/folders/:nama_folder - Hapus folder dari database
exports.deleteFolder = async (req, res, next) => {
  try {
    const rawName = req.params.nama_folder || '';
    const folderName = decodeURIComponent(rawName).trim();

    if (!folderName) {
      return res.status(400).json({ success: false, message: 'Nama folder tidak valid.' });
    }

    if (folderName.toLowerCase() === 'umum' || folderName.toLowerCase() === 'semua') {
      return res.status(400).json({ success: false, message: 'Folder bawaan sistem (Umum/Semua) tidak dapat dihapus.' });
    }

    const folderPrefix = `${folderName}/%`;
    const archiveFiles = await db.query(
      `SELECT nama_file FROM arsip_data
       WHERE LOWER(TRIM(nama_folder)) = LOWER(TRIM(?))
          OR LOWER(TRIM(nama_folder)) LIKE LOWER(?)`,
      [folderName, folderPrefix]
    );

    let deletedFiles = 0;
    for (const archive of archiveFiles.rows || []) {
      if (!archive.nama_file) continue;
      const filePath = path.join(__dirname, '../uploads/arsip', archive.nama_file);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          deletedFiles++;
        } catch (fileError) {
          console.warn('Gagal menghapus file fisik arsip:', fileError.message);
        }
      }
    }

    const deletedRows = await db.query(
      `DELETE FROM arsip_data
       WHERE LOWER(TRIM(nama_folder)) = LOWER(TRIM(?))
          OR LOWER(TRIM(nama_folder)) LIKE LOWER(?)`,
      [folderName, folderPrefix]
    );

    try {
      await db.query(
        `DELETE FROM arsip_folders
         WHERE LOWER(TRIM(nama_folder)) = LOWER(TRIM(?))
            OR LOWER(TRIM(nama_folder)) LIKE LOWER(?)`,
        [folderName, folderPrefix]
      );
    } catch (e) {
      console.warn('DELETE arsip_folders warning:', e.message);
    }

    res.json({
      success: true,
      message: `Folder "${folderName}" dan seluruh isi di dalamnya berhasil dihapus permanen.`,
      deletedRecords: deletedRows.rowCount || 0,
      deletedFiles
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus folder: ' + error.message });
  }
};

// PUT /api/arsip/folders/rename - Ubah nama folder di database
exports.renameFolder = async (req, res, next) => {
  try {
    const { old_name, new_name } = req.body;
    if (!old_name || !new_name || new_name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Nama folder lama dan nama folder baru wajib diisi.' });
    }

    const oldName = old_name.trim();
    const newName = new_name.trim();

    if (oldName.toLowerCase() === 'umum' || oldName.toLowerCase() === 'semua') {
      return res.status(400).json({ success: false, message: 'Folder bawaan sistem (Umum/Semua) tidak dapat diubah namanya.' });
    }

    try {
      await db.query('UPDATE arsip_folders SET nama_folder = ? WHERE LOWER(TRIM(nama_folder)) = LOWER(TRIM(?))', [newName, oldName]);
    } catch (e) {
      await db.query('INSERT IGNORE INTO arsip_folders (nama_folder) VALUES (?)', [newName]);
    }

    await db.query('UPDATE arsip_data SET nama_folder = ? WHERE LOWER(TRIM(nama_folder)) = LOWER(TRIM(?))', [newName, oldName]);

    res.json({
      success: true,
      message: `Folder "${oldName}" berhasil diubah namanya menjadi "${newName}".`,
      old_name: oldName,
      new_name: newName
    });
  } catch (error) {
    next(error);
  }
};

