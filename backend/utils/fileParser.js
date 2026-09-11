const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const XLSX = require('xlsx');

const DIY_KECAMATAN_LIST = [
  'Tepus', 'Playen', 'Semin', 'Ponjong', 'Semanu', 'Patuk', 'Girisubo', 'Kokap', 'Nglipar', 'Turi',
  'Saptosari', 'Dlingo', 'Rongkop', 'Paliyan', 'Wonosari', 'Imogiri', 'Purwosari', 'Samigaluh', 'Karangmojo',
  'Gedangsari', 'Galur', 'Girimulyo', 'Temon', 'Depok', 'Panjatan', 'Lendah', 'Panggang', 'Pakem', 'Sentolo',
  'Mlati', 'Pengasih', 'Ngawen', 'Tanjungsari', 'Wates', 'Ngaglik', 'Jetis', 'Sedayu', 'Tempel', 'Kalibawang',
  'Kalasan', 'Sleman', 'Sewon', 'Pleret', 'Kretek', 'Kasihan', 'Ngemplak', 'Nanggulan', 'Prambanan', 'Cangkringan',
  'Pajangan', 'Piyungan', 'Minggir', 'Gamping', 'Pandak', 'Berbah', 'Bantul', 'Seyegan', 'Sanden', 'Godean',
  'Moyudan', 'Pundong', 'Banguntapan', 'Srandakan', 'Bambanglipuro', 'Umbulharjo', 'Tegalrejo', 'Gondomanan', 'Kraton'
];

const INCIDENT_CATEGORIES = [
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

function classifyIncidentText(value) {
  const text = String(value || '').toLowerCase();
  if (/bangunan|rumah|gedung|pemukiman/.test(text)) return 'Kebakaran Bangunan';
  if (/lahan|hutan|semak|kebun/.test(text)) return 'Kebakaran Hutan / Lahan';
  if (/tawon|vespa|sarang/.test(text)) return 'Evakuasi Sarang Tawon';
  if (/ular|kucing|anjing|satwa|hewan/.test(text)) return 'Evakuasi Satwa Liar (Ular/Kucing)';
  if (/pohon|tumbang|dahan/.test(text)) return 'Evakuasi Pohon Tumbang';
  if (/sumur|tenggelam|korban|evakuasi|laka air/.test(text)) return 'Penyelamatan Korban & Laka Air';
  if (/cincin|terjepit|jari/.test(text)) return 'Pelepasan Cincin Terjepit';
  if (/angin|badai|cuaca ekstrem|puting beliung/.test(text)) return 'Cuaca Ekstrem & Angin Kencang';
  if (/longsor|tanah bergerak/.test(text)) return 'Tanah Longsor';
  return 'Darurat Non-Kebakaran Lainnya';
}

function createIncidentCounts(values) {
  const counts = Object.fromEntries(INCIDENT_CATEGORIES.map(category => [category, 0]));
  values.forEach(value => {
    counts[classifyIncidentText(value)] += 1;
  });
  return counts;
}

function splitCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      value += '"';
      index++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += char;
    }
  }
  values.push(value.trim());
  return values;
}

async function parsePdfFile(filePath, filename) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    const text = data.text || '';

    // Detect Year
    let detectedYear = null;
    const yearMatch = text.match(/TAHUN\s+(\d{4})/i) || text.match(/\b(202[0-9])\b/);
    if (yearMatch) {
      detectedYear = parseInt(yearMatch[1], 10);
    } else {
      detectedYear = 2024; // Default dataset year for Damkar DIY
    }

    // Detect Category
    let detectedCategory = 'Lainnya';
    const textUpper = text.toUpperCase() + ' ' + (filename || '').toUpperCase();
    if (textUpper.includes('NON KEBAKARAN') || textUpper.includes('NON-KEBAKARAN')) {
      detectedCategory = 'Data Non-Kebakaran';
    } else if (textUpper.includes('KEBAKARAN')) {
      detectedCategory = 'Laporan Kebakaran';
    } else if (textUpper.includes('PETA') || textUpper.includes('WMK') || textUpper.includes('SUMBER AIR') || textUpper.includes('CAGAR BUDAYA') || textUpper.includes('SUMBU FILOSOFI')) {
      detectedCategory = 'Peta & Spasial';
    } else if (textUpper.includes('SOP') || textUpper.includes('REGULASI') || textUpper.includes('PEDOMAN')) {
      detectedCategory = 'SOP & Regulasi';
    }

    // Detect Kecamatan mentions & record count
    const matchedKecamatan = [];
    DIY_KECAMATAN_LIST.forEach(kec => {
      const reg = new RegExp(`\\b${kec}\\b`, 'i');
      if (reg.test(text)) {
        matchedKecamatan.push(kec);
      }
    });

    let recordCount = matchedKecamatan.length;
    if (recordCount === 0) {
      // Fallback count based on pages or text length
      recordCount = Math.max(1, Math.round(text.length / 300));
    }

    const categoryCounts = createIncidentCounts(text.split(/\r?\n/).filter(line => line.trim().length > 0));

    // Extraction summary
    const summary = `Diekstrak dari isi PDF: TAHUN ${detectedYear}, Kategori: ${detectedCategory}, ${recordCount} lokasi/wilayah terdeteksi.`;

    return {
      file_year: detectedYear,
      category_detected: detectedCategory,
      record_count: recordCount,
      summary,
      matched_kecamatan: matchedKecamatan,
      category_counts: categoryCounts,
      raw_text_sample: text.substring(0, 500)
    };
  } catch (error) {
    console.warn('FileParser PDF Warning:', error.message);
    return {
      file_year: 2024,
      category_detected: 'Lainnya',
      record_count: 1,
      summary: 'Dokumen PDF tersimpan.'
    };
  }
}

async function parseGeoJsonFile(filePath, filename) {
  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(rawData);
    const features = json.type === 'FeatureCollection' && Array.isArray(json.features)
      ? json.features
      : Array.isArray(json) ? json : [json];
    let count = 0;

    if (json.type === 'FeatureCollection' && Array.isArray(json.features)) {
      count = json.features.length;
    } else if (Array.isArray(json)) {
      count = json.length;
    } else {
      count = 1;
    }

    const categoryCounts = Object.fromEntries(INCIDENT_CATEGORIES.map(category => [category, 0]));

    return {
      file_year: 2024,
      category_detected: 'Peta & Spasial',
      record_count: count,
      summary: `Diekstrak dari berkas GeoJSON: ${count} fitur/titik lokasi spasial.`,
      category_counts: categoryCounts,
      records: features.slice(0, 5000).map(feature => feature.properties || feature)
    };
  } catch (error) {
    return {
      file_year: 2024,
      category_detected: 'Peta & Spasial',
      record_count: 1,
      summary: 'File GeoJSON tersimpan.'
    };
  }
}

async function parseTextOrCsvFile(filePath, filename) {
  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const lines = rawData.split('\n').filter(l => l.trim().length > 0);
    const count = Math.max(1, lines.length - 1);
    const headers = splitCsvLine(lines[0] || '').map(header => header.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
    const records = lines.slice(1).map(line => {
      const values = splitCsvLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
    });

    let year = 2024;
    const yearMatch = rawData.match(/\b(202[0-9])\b/);
    if (yearMatch) year = parseInt(yearMatch[1], 10);

    const categoryCounts = createIncidentCounts(lines.slice(1));

    return {
      file_year: year,
      category_detected: 'Laporan Kebakaran',
      record_count: count,
      summary: `Diekstrak dari CSV/Text: ${count} baris data.`,
      category_counts: categoryCounts,
      records: records.slice(0, 5000)
    };
  } catch (error) {
    return {
      file_year: 2024,
      category_detected: 'Lainnya',
      record_count: 1,
      summary: 'File teks tersimpan.'
    };
  }
}

function parseSpreadsheetFile(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const records = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
  const recordTexts = records.map(record => JSON.stringify(record));
  const yearMatch = recordTexts.join(' ').match(/\b(202[0-9])\b/);

  return {
    file_year: yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear(),
    category_detected: 'Laporan Kebakaran',
    record_count: records.length,
    summary: `Diekstrak dari Excel: ${records.length} baris data.`,
    category_counts: createIncidentCounts(recordTexts),
    records: records.slice(0, 5000)
  };
}

async function parseFile(filePath, originalFilename) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const ext = path.extname(originalFilename || filePath).toLowerCase();

  if (ext === '.pdf') {
    return await parsePdfFile(filePath, originalFilename);
  } else if (ext === '.geojson' || ext === '.json') {
    return await parseGeoJsonFile(filePath, originalFilename);
  } else if (ext === '.csv' || ext === '.txt' || ext === '.qmd') {
    return await parseTextOrCsvFile(filePath, originalFilename);
  } else if (ext === '.xls' || ext === '.xlsx') {
    return parseSpreadsheetFile(filePath);
  } else {
    // For images, MPK, ZIP, etc.
    let kat = 'Peta & Spasial';
    const upper = (originalFilename || '').toUpperCase();
    if (upper.includes('NON KEBAKARAN')) kat = 'Data Non-Kebakaran';
    else if (upper.includes('KEBAKARAN')) kat = 'Laporan Kebakaran';

    let year = 2024;
    const yearMatch = upper.match(/\b(202[0-9])\b/);
    if (yearMatch) year = parseInt(yearMatch[1], 10);

    return {
      file_year: year,
      category_detected: kat,
      record_count: 1,
      summary: `Berkas ${ext.toUpperCase()} tersimpan.`
    };
  }
}

module.exports = {
  parseFile
};
