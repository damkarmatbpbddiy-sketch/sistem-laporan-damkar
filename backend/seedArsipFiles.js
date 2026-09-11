const fs = require('fs');
const path = require('path');
const db = require('./config/db');
const { parseFile } = require('./utils/fileParser');

async function seedArsipFiles() {
  console.log('🔄 Seeding and parsing comprehensive project files into Arsip System...');

  const arsipUploadDir = path.join(__dirname, 'uploads/arsip');
  if (!fs.existsSync(arsipUploadDir)) {
    fs.mkdirSync(arsipUploadDir, { recursive: true });
  }

  const fileSources = [
    // 1. Root PDFs and Image Maps
    {
      dirs: [path.join(__dirname, '../..'), path.join(__dirname, '..')],
      files: [
        { name: 'Data Kejadian Kebakaran.pdf', kategori: 'Laporan Kebakaran', desc: 'Data Rekapitulasi Kejadian Kebakaran DIY Tahun 2024 per Kecamatan' },
        { name: 'Data Kejadian Non Kebakaran.pdf', kategori: 'Data Non-Kebakaran', desc: 'Data Rekapitulasi Kejadian Non-Kebakaran DIY Tahun 2024 per Kecamatan' },
        { name: 'Peta Sumber Air.pdf', kategori: 'Peta & Spasial', desc: 'Peta Lokasi Sumber Air & Hidran Pemadam Kebakaran DIY' },
        { name: 'Peta WMK Cagar Budaya.pdf', kategori: 'Peta & Spasial', desc: 'Peta Wilayah Manajemen Kebakaran (WMK) Cagar Budaya DIY' },
        { name: 'Peta WMK Kabupaten Sleman.pdf', kategori: 'Peta & Spasial', desc: 'Peta WMK dan Jangkauan Pos Pemadam Kabupaten Sleman' },
        { name: 'Peta WMK Kota Yogyakarta.pdf', kategori: 'Peta & Spasial', desc: 'Peta WMK dan Jangkauan Pos Pemadam Kota Yogyakarta' },
        { name: 'Peta WMK Kabupaten Bantul.pdf', kategori: 'Peta & Spasial', desc: 'Peta WMK dan Jangkauan Pos Pemadam Kabupaten Bantul' },
        { name: 'Peta WMK Gunung Kidul.pdf', kategori: 'Peta & Spasial', desc: 'Peta WMK dan Jangkauan Pos Pemadam Kabupaten Gunungkidul' },
        { name: 'Peta WMK Provinsi DIY.pdf', kategori: 'Peta & Spasial', desc: 'Peta Wilayah Manajemen Kebakaran Provinsi DIY' },
        { name: 'Lita_Peta Sumbu Filosofi DIY.png', kategori: 'Peta & Spasial', desc: 'Visualisasi Peta Spasial Sumbu Filosofis DIY (Kawasan Cagar Budaya)' },
        { name: 'Nael_Peta Potensi Kebakaran Lahan Pertanian DIY.jpg', kategori: 'Peta & Spasial', desc: 'Visualisasi Peta Potensi Risiko Kebakaran Lahan Pertanian DIY' },
        { name: 'Nael_Peta Sumbu Filosofi DIY.jpg', kategori: 'Peta & Spasial', desc: 'Visualisasi Peta Kawasan Sumbu Filosofis DIY' },
        { name: 'Peta WMK Kulon Progo.jpg', kategori: 'Peta & Spasial', desc: 'Peta Wilayah Manajemen Kebakaran Kabupaten Kulon Progo' }
      ]
    },
    // 2. Shapefiles & MPK Maps
    {
      dirs: [path.join(__dirname, '../Shapefile & mpk'), path.join(__dirname, '../../Shapefile & mpk')],
      files: [
        { name: 'Data Kejadian Kebakaran.mpk', kategori: 'Laporan Kebakaran', desc: 'Package Peta Spasial ArcGIS Data Kejadian Kebakaran' },
        { name: 'Data Kejadian Non Kebakaran.mpk', kategori: 'Data Non-Kebakaran', desc: 'Package Peta Spasial ArcGIS Data Kejadian Non-Kebakaran' },
        { name: 'Peta Risiko Kebakaran Lahan Pertanian_Nael.mpk', kategori: 'Peta & Spasial', desc: 'Package Peta Risiko Kebakaran Lahan Pertanian DIY' },
        { name: 'Peta Sumbu Filosofis_Nael.mpk', kategori: 'Peta & Spasial', desc: 'Package Peta Spasial Kawasan Sumbu Filosofis DIY' },
        { name: 'Peta WMK Cagar Budaya.mpk', kategori: 'Peta & Spasial', desc: 'Package Peta WMK Cagar Budaya DIY' },
        { name: 'Peta WMK Kabupaten Kulon Progo.mpk', kategori: 'Peta & Spasial', desc: 'Package Peta WMK Kabupaten Kulon Progo' },
        { name: 'Peta WMK Kabupaten Sleman.mpk', kategori: 'Peta & Spasial', desc: 'Package Peta WMK Kabupaten Sleman' },
        { name: 'Peta WMK Provinsi DIY.mpk', kategori: 'Peta & Spasial', desc: 'Package Peta WMK Provinsi DIY' }
      ]
    },
    // 3. Frontend GeoJSON Datasets
    {
      dirs: [path.join(__dirname, '../frontend/data'), path.join(__dirname, '../../frontend/data')],
      files: [
        { name: 'TITIK POS PEMADAM.geojson', kategori: 'Peta & Spasial', desc: 'Data Spasial 12 Titik Pos Pemadam Kebakaran DIY' },
        { name: 'TITIK CAGAR BUDAYA.geojson', kategori: 'Peta & Spasial', desc: 'Data Spasial 1073 Titik Cagar Budaya Terlindungi DIY' },
        { name: 'BUFFER TITIK POS PEMADAM.geojson', kategori: 'Peta & Spasial', desc: 'Data Jangkauan Buffer Titik Pos Pemadam Kebakaran' },
        { name: 'SRS.geojson', kategori: 'Peta & Spasial', desc: 'Data Spasial 47 Titik SRS Strategis Kebakaran DIY' },
        { name: 'TITIK BANGUNAN PEMERINTAH.geojson', kategori: 'Peta & Spasial', desc: 'Data Spasial Titik Bangunan Pemerintah Terlindungi DIY' }
      ]
    }
  ];

  let importedCount = 0;

  for (const src of fileSources) {
    const directories = src.dirs || [src.dir];
    for (const item of src.files) {
      let srcFilePath = null;
      for (const d of directories) {
        if (!d) continue;
        const candidate = path.join(d, item.name);
        if (fs.existsSync(candidate)) {
          srcFilePath = candidate;
          break;
        }
      }

      if (!srcFilePath) {
        continue;
      }

      // Check if already seeded in DB
      const checkDb = await db.query('SELECT * FROM arsip_data WHERE nama_asli = $1', [item.name]);
      if (checkDb.rows && checkDb.rows.length > 0) {
        console.log(`ℹ️ File '${item.name}' sudah ada di database arsip.`);
        continue;
      }

      // Copy file to uploads/arsip/
      const destFilename = 'arsip-seed-' + Date.now() + '-' + Math.round(Math.random() * 1000) + path.extname(item.name);
      const destFilePath = path.join(arsipUploadDir, destFilename);

      fs.copyFileSync(srcFilePath, destFilePath);
      const fileStat = fs.statSync(destFilePath);

      // Parse file internal content
      const parseResult = await parseFile(destFilePath, item.name);

      const judul = item.name.replace(/\.[^/.]+$/, '');
      const kat = parseResult?.category_detected || item.kategori || 'Lainnya';
      const fileYear = parseResult?.file_year || 2024;
      const recordCount = parseResult?.record_count || 1;
      const parsedJson = parseResult ? JSON.stringify(parseResult) : null;
      const fileUrl = `/uploads/arsip/${destFilename}`;
      const ext = path.extname(item.name).replace('.', '').toLowerCase();

      const sql = `
        INSERT INTO arsip_data (judul_arsip, kategori, deskripsi, nama_file, nama_asli, tipe_file, ukuran_file, file_url, file_year, record_count, parsed_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      await db.query(sql, [
        judul,
        kat,
        item.desc + (parseResult?.summary ? ` | ${parseResult.summary}` : ''),
        destFilename,
        item.name,
        ext,
        fileStat.size,
        fileUrl,
        fileYear,
        recordCount,
        parsedJson
      ]);

      console.log(`✅ Impor & Parse Berhasil: ${item.name} | Tahun: ${fileYear} | Record Count: ${recordCount}`);
      importedCount++;
    }
  }

  console.log(`🎉 Seed Arsip Komprehensif Selesai! Total Impor Baru: ${importedCount} berkas.`);
}

if (require.main === module) {
  seedArsipFiles().then(() => process.exit(0)).catch(err => {
    console.error('❌ Error seeding arsip files:', err);
    process.exit(1);
  });
}

module.exports = seedArsipFiles;
