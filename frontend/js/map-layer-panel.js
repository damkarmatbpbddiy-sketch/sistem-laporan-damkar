/* Admin map overlays. admin.js owns the single Leaflet map instance. */

let basemaps = {};
let layerTingkatRisiko = L.layerGroup();
let layerPosRencana = L.layerGroup();
let layerBufferRencana = L.layerGroup();
let layerCagarBudayaPanel = L.layerGroup();
let layerAreaSRS = L.layerGroup();
let layerBiroSekolah = L.layerGroup();
let layerProvinceDIY = L.layerGroup();
let layerJalan = L.layerGroup();
let layerSrsBase = L.layerGroup();
let layerSrsBatasKecamatan = L.layerGroup();
let layerSrsBatasDesa = L.layerGroup();
let currentAdminMapMode = 'jangkauan';
let mapLayersReady = false;
const shpCache = new Map();

const panelLayers = () => ({
  risiko: layerTingkatRisiko,
  'pos-eksisting': typeof posDamkarLayer !== 'undefined' ? posDamkarLayer : null,
  'jangkauan-eksisting': typeof bufferDamkarLayer !== 'undefined' ? bufferDamkarLayer : null,
  'pos-rencana': layerPosRencana,
  'jangkauan-rencana': layerBufferRencana,
  'cagar-budaya': layerCagarBudayaPanel,
  'area-srs': layerAreaSRS,
  'biro-sekolah': layerBiroSekolah,
  'province-diy': layerProvinceDIY,
  'srs-base': layerSrsBase,
  provinsi: layerProvinceDIY,
  kabupaten: typeof countyBoundaryLayer !== 'undefined' ? countyBoundaryLayer : null,
  kecamatan: layerSrsBatasKecamatan,
  desa: layerSrsBatasDesa,
  jalan: layerJalan,
  jalan: layerJalan,
  'laporan-aktif': typeof liveMarkersLayer !== 'undefined' ? liveMarkersLayer : null,
  'laporan-selesai': typeof completedMarkersLayer !== 'undefined' ? completedMarkersLayer : null
});

function logMap(status, name, detail = '') {
  const suffix = detail ? `: ${detail}` : '';
  console[status === 'Failed' ? 'warn' : 'log'](`[MAP] ${status}: ${name}${suffix}`);
}

function setLayerVisible(layer, visible) {
  if (!layer || typeof liveMap === 'undefined' || !liveMap) return;
  if (visible && !liveMap.hasLayer(layer)) liveMap.addLayer(layer);
  if (!visible && liveMap.hasLayer(layer)) liveMap.removeLayer(layer);
}

function setCheckbox(id, checked) {
  const checkbox = document.getElementById(id);
  if (checkbox) checkbox.checked = checked;
}

function markUnavailable(id, message) {
  const checkbox = document.getElementById(id);
  if (!checkbox) return;
  checkbox.checked = false;
  checkbox.disabled = true;
  checkbox.title = message;
  const label = document.querySelector(`label[for="${id}"]`);
  if (label) label.textContent += ' (data tidak tersedia)';
  logMap('Failed', label?.textContent || id, message);
}

const SRS_PALETTE = {
  'candi prambanan': { fill: '#D7C7EB', stroke: '#8A63D2', label: 'SRS Candi Prambanan – Candi Ijo' },
  'prambanan': { fill: '#D7C7EB', stroke: '#8A63D2', label: 'SRS Candi Prambanan – Candi Ijo' },
  'merapi': { fill: '#C8E6A6', stroke: '#6FA832', label: 'SRS Gunung Merapi' },
  'karaton': { fill: '#D5CD90', stroke: '#9E9346', label: 'SRS Karaton' },
  'kraton': { fill: '#D5CD90', stroke: '#9E9346', label: 'SRS Karaton' },
  'gunungsewu': { fill: '#AEE5EE', stroke: '#38A3B8', label: 'SRS Karst Gunungsewu' },
  'gunung sewu': { fill: '#AEE5EE', stroke: '#38A3B8', label: 'SRS Karst Gunungsewu' },
  'kerto': { fill: '#F3A8A8', stroke: '#D15353', label: 'SRS Kerto - Pleret' },
  'pleret': { fill: '#F3A8A8', stroke: '#D15353', label: 'SRS Kerto - Pleret' },
  'kotabaru': { fill: '#A4DFD1', stroke: '#3EA38A', label: 'SRS Kotabaru' },
  'girigondo': { fill: '#A8BAEE', stroke: '#5777D9', label: 'SRS Makam Girigondo' },
  'imogiri': { fill: '#9496E8', stroke: '#4A4ED1', label: 'SRS Makam Raja-Raja Mataram di Imogiri' },
  'pathok negoro': { fill: '#EE6EDE', stroke: '#B823A4', label: 'SRS Masjid Pathok Negoro' },
  'pathoknegoro': { fill: '#EE6EDE', stroke: '#B823A4', label: 'SRS Masjid Pathok Negoro' },
  'kotagede': { fill: '#78DF94', stroke: '#2BA34D', label: 'SRS Masjid dan Makam Raja Mataram di Kotagede' },
  'samas': { fill: '#DDD177', stroke: '#A39423', label: 'SRS Pantai Samas – Parangtritis' },
  'parangtritis': { fill: '#DDD177', stroke: '#A39423', label: 'SRS Pantai Samas – Parangtritis' },
  'pantai selatan gunungkidul': { fill: '#B8CEE0', stroke: '#527E9F', label: 'SRS Pantai Selatan Gunungkidul' },
  'pantai selatan kulon progo': { fill: '#F3BEB2', stroke: '#D86550', label: 'SRS Pantai Selatan Kulon Progo' },
  'menoreh': { fill: '#F7D4BF', stroke: '#D98858', label: 'SRS Perbukitan Menoreh' },
  'pakualaman': { fill: '#A0E878', stroke: '#52B31E', label: 'SRS Puro Pakualaman' },
  'wates': { fill: '#EA72AD', stroke: '#C42777', label: 'SRS Pusat Kota Wates' },
  'sokoliman': { fill: '#E4D3BD', stroke: '#A88E6B', label: 'SRS Sokoliman' },
  'sumbu filosofi': { fill: '#FFEE44', stroke: '#D4B800', label: 'SRS Sumbu Filosofi Tugu Pal Putih - Panggung Krapyak' },
  'tugu': { fill: '#FFEE44', stroke: '#D4B800', label: 'SRS Sumbu Filosofi Tugu Pal Putih - Panggung Krapyak' }
};

function updateDynamicLegend() {
  const legend = document.getElementById('map-theme-legend-container');
  if (!legend) return;
  const items = [];
  const checked = (id) => document.getElementById(id)?.checked;
  if (checked('cb-pos-eksisting') || checked('cb-pos-rencana') || checked('cb-jangkauan-eksisting') || checked('cb-jangkauan-rencana')) {
    let wmkItems = '<strong>Wilayah Manajemen Kebakaran</strong>';
    if (checked('cb-pos-eksisting')) wmkItems += '<br><span style="color:#C62828; font-size:14px;">●</span> Pos Pemadam Kebakaran Tersedia';
    if (checked('cb-pos-rencana')) wmkItems += '<br><span style="color:#1B365D; font-size:14px;">●</span> Pos Pemadam Kebakaran Rencana';
    if (checked('cb-jangkauan-eksisting') || checked('cb-jangkauan-rencana')) wmkItems += '<br><span style="display:inline-block; width:16px; height:10px; border:2px solid #1B365D; background:rgba(59,130,246,0.2);"></span> Jangkauan Layanan';
    items.push(wmkItems);
  }
  if (checked('cb-risiko')) {
    items.push(
      '<strong>Kategori Risiko Kebakaran</strong><br>' +
      '<span style="background:#ff0000; border:1px solid #000000; display:inline-block; width:12px; height:12px; border-radius:2px; margin-right:4px;"></span> Sangat Berat<br>' +
      '<span style="background:#ffa500; border:1px solid #000000; display:inline-block; width:12px; height:12px; border-radius:2px; margin-right:4px;"></span> Berat<br>' +
      '<span style="background:#ffff00; border:1px solid #000000; display:inline-block; width:12px; height:12px; border-radius:2px; margin-right:4px;"></span> Sedang<br>' +
      '<span style="background:#00ff00; border:1px solid #000000; display:inline-block; width:12px; height:12px; border-radius:2px; margin-right:4px;"></span> Ringan<br>' +
      '<span style="background:#0066ff; border:1px solid #000000; display:inline-block; width:12px; height:12px; border-radius:2px; margin-right:4px;"></span> Sangat Ringan'
    );
  }
  if (checked('cb-cagar-budaya')) {
    items.push('<strong>Cagar Budaya</strong><br><span style="color:#8D6E63">●</span> Bangunan<br><span style="color:#9C27B0">●</span> Benda<br><span style="color:#2E7D32">●</span> Kawasan<br><span style="color:#E65100">●</span> Situs<br><span style="color:#00838F">●</span> Struktur');
  }
  if (checked('cb-area-srs')) {
    items.push('<strong>Satuan Ruang Strategis (SRS)</strong><br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#ffffff;border:1px solid #64748b;border-radius:2px;margin-right:4px;"></span> Area Non-SRS<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#D7C7EB;border:1px solid #8A63D2;border-radius:2px;margin-right:4px;"></span> Candi Prambanan – Candi Ijo<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#C8E6A6;border:1px solid #6FA832;border-radius:2px;margin-right:4px;"></span> Gunung Merapi<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#D5CD90;border:1px solid #9E9346;border-radius:2px;margin-right:4px;"></span> Karaton<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#AEE5EE;border:1px solid #38A3B8;border-radius:2px;margin-right:4px;"></span> Karst Gunungsewu<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#F3A8A8;border:1px solid #D15353;border-radius:2px;margin-right:4px;"></span> Kerto - Pleret<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#A4DFD1;border:1px solid #3EA38A;border-radius:2px;margin-right:4px;"></span> Kotabaru<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#A8BAEE;border:1px solid #5777D9;border-radius:2px;margin-right:4px;"></span> Makam Girigondo<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#9496E8;border:1px solid #4A4ED1;border-radius:2px;margin-right:4px;"></span> Makam Raja Imogiri<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#EE6EDE;border:1px solid #B823A4;border-radius:2px;margin-right:4px;"></span> Masjid Pathok Negoro<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#78DF94;border:1px solid #2BA34D;border-radius:2px;margin-right:4px;"></span> Masjid Kotagede<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#DDD177;border:1px solid #A39423;border-radius:2px;margin-right:4px;"></span> Pantai Samas – Parangtritis<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#B8CEE0;border:1px solid #527E9F;border-radius:2px;margin-right:4px;"></span> Pantai Sel. Gunungkidul<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#F3BEB2;border:1px solid #D86550;border-radius:2px;margin-right:4px;"></span> Pantai Sel. Kulon Progo<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#F7D4BF;border:1px solid #D98858;border-radius:2px;margin-right:4px;"></span> Perbukitan Menoreh<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#A0E878;border:1px solid #52B31E;border-radius:2px;margin-right:4px;"></span> Puro Pakualaman<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#EA72AD;border:1px solid #C42777;border-radius:2px;margin-right:4px;"></span> Pusat Kota Wates<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#E4D3BD;border:1px solid #A88E6B;border-radius:2px;margin-right:4px;"></span> Sokoliman<br>' +
      '<span style="display:inline-block;width:12px;height:12px;background:#FFEE44;border:1px solid #D4B800;border-radius:2px;margin-right:4px;"></span> Sumbu Filosofi');
  }
  if (checked('cb-provinsi')) items.push('<strong>Batas Administrasi</strong><br><span style="color:#111827">━ ━</span> Batas Provinsi');
  if (checked('cb-kabupaten')) items.push('<strong>Batas Kabupaten</strong><br><span style="color:#1f2937">━ ·</span> Batas Kabupaten');
  if (checked('cb-kecamatan')) items.push('<strong>Batas Kapanewon</strong><br><span style="color:#374151">···</span> Batas Kecamatan');
  if (checked('cb-desa')) items.push('<strong>Batas Kelurahan</strong><br><span style="color:#4b5563">···</span> Batas Kelurahan/Desa');
  if (checked('cb-jalan')) items.push('<strong>Aksesibilitas</strong><br><span style="color:#ff0000; font-weight:900;">━</span> Jalan Kolektor');
  legend.innerHTML = `<div class="fw-bold mb-2">LEGENDA PETA</div><hr class="my-1">${items.length ? items.map((item) => `<div class="mb-2">${item}</div>`).join('') : '<small>Tidak ada overlay aktif.</small>'}`;
}

function styleRisk(feature) {
  const category = String(feature?.properties?.KATEGORI || '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');
  const colors = {
    'SANGAT BERAT': { fill: '#ff0000', border: '#000000' },
    'BERAT':        { fill: '#ffa500', border: '#000000' },
    'SEDANG':       { fill: '#ffff00', border: '#000000' },
    'RINGAN':       { fill: '#00ff00', border: '#000000' },
    'SANGAT RINGAN':{ fill: '#0066ff', border: '#000000' }
  };
  const config = colors[category] || { fill: '#ffffff', border: '#000000' };
  return {
    color: config.border,
    weight: 0.8,
    opacity: 1,
    fill: true,
    fillColor: config.fill,
    fillOpacity: 1
  };
}

function ensureRiskHatchPatterns() {
  if (document.getElementById('risk-hatch-patterns')) return;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'risk-hatch-patterns';
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  ['risk-hatch-sangat-berat', 'risk-hatch-berat'].forEach((id) => {
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.id = id;
    pattern.setAttribute('width', '8');
    pattern.setAttribute('height', '8');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('patternTransform', 'rotate(45)');

    const stripe = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    stripe.setAttribute('width', id === 'risk-hatch-berat' ? '2.2' : '1.8');
    stripe.setAttribute('height', '8');
    stripe.setAttribute('fill', '#b91c1c');
    pattern.appendChild(stripe);
    if (id === 'risk-hatch-sangat-berat') {
      const crossStripe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      crossStripe.setAttribute('d', 'M-2,2 L2,-2 M0,8 L8,0 M6,10 L10,6');
      crossStripe.setAttribute('stroke', '#b91c1c');
      crossStripe.setAttribute('stroke-width', '1.8');
      pattern.appendChild(crossStripe);
    }
    defs.appendChild(pattern);
  });

  svg.appendChild(defs);
  document.body.appendChild(svg);
}

function ensureRiskHatchPatternsInPane() {
  const pane = liveMap?.getPane('pane_risiko');
  const svg = pane?.querySelector('svg');
  if (!svg || svg.querySelector('#risk-hatch-sangat-berat')) return;

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  ['risk-hatch-sangat-berat', 'risk-hatch-berat'].forEach((id) => {
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.id = id;
    pattern.setAttribute('width', '8');
    pattern.setAttribute('height', '8');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('patternTransform', 'rotate(45)');

    const stripe = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    stripe.setAttribute('width', id === 'risk-hatch-berat' ? '2.2' : '1.8');
    stripe.setAttribute('height', '8');
    stripe.setAttribute('fill', '#b91c1c');
    pattern.appendChild(stripe);
    if (id === 'risk-hatch-sangat-berat') {
      const crossStripe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      crossStripe.setAttribute('d', 'M-2,2 L2,-2 M0,8 L8,0 M6,10 L10,6');
      crossStripe.setAttribute('stroke', '#b91c1c');
      crossStripe.setAttribute('stroke-width', '1.8');
      pattern.appendChild(crossStripe);
    }
    defs.appendChild(pattern);
  });
  svg.insertBefore(defs, svg.firstChild);
}

function applyRiskDisplayForSrs(mode) {
  if (!layerTingkatRisiko) return;
  layerTingkatRisiko.eachLayer((layer) => {
    if (layer.feature) layer.setStyle(styleRisk(layer.feature));
  });
}

function getSRSColor(feature) {
  const props = (feature && feature.properties) ? feature.properties : {};
  const raw = (
    String(props.REMARK || '') + ' ' +
    String(props.SRS_EDIT || '') + ' ' +
    String(props.SRS_FIX || '') + ' ' +
    String(props.NAMOBJ || '') + ' ' +
    String(props.nama || '')
  ).toLowerCase();

  if (raw.includes('gunungkidul')) return { color: '#527E9F', weight: 1.5, opacity: 1, fillColor: '#B8CEE0', fillOpacity: 0.82 };
  if (raw.includes('kulon progo') || raw.includes('kulonprogo') || (raw.includes('pantai') && raw.includes('kulon'))) return { color: '#D86550', weight: 1.5, opacity: 1, fillColor: '#F3BEB2', fillOpacity: 0.82 };
  if (raw.includes('samas') || raw.includes('parangtritis')) return { color: '#A39423', weight: 1.5, opacity: 1, fillColor: '#DDD177', fillOpacity: 0.82 };
  if (raw.includes('prambanan') || raw.includes('ijo')) return { color: '#8A63D2', weight: 1.5, opacity: 1, fillColor: '#D7C7EB', fillOpacity: 0.82 };
  if (raw.includes('merapi')) return { color: '#6FA832', weight: 1.5, opacity: 1, fillColor: '#C8E6A6', fillOpacity: 0.82 };
  if (raw.includes('karaton') || raw.includes('kraton')) return { color: '#9E9346', weight: 1.5, opacity: 1, fillColor: '#D5CD90', fillOpacity: 0.82 };
  if (raw.includes('gunungsewu') || raw.includes('gunung sewu') || raw.includes('sewu')) return { color: '#38A3B8', weight: 1.5, opacity: 1, fillColor: '#AEE5EE', fillOpacity: 0.82 };
  if (raw.includes('kerto') || raw.includes('pleret')) return { color: '#D15353', weight: 1.5, opacity: 1, fillColor: '#F3A8A8', fillOpacity: 0.82 };
  if (raw.includes('kotabaru')) return { color: '#3EA38A', weight: 1.5, opacity: 1, fillColor: '#A4DFD1', fillOpacity: 0.82 };
  if (raw.includes('girigondo')) return { color: '#5777D9', weight: 1.5, opacity: 1, fillColor: '#A8BAEE', fillOpacity: 0.82 };
  if (raw.includes('imogiri')) return { color: '#4A4ED1', weight: 1.5, opacity: 1, fillColor: '#9496E8', fillOpacity: 0.82 };
  if (raw.includes('pathok')) return { color: '#B823A4', weight: 1.5, opacity: 1, fillColor: '#EE6EDE', fillOpacity: 0.82 };
  if (raw.includes('kotagede')) return { color: '#2BA34D', weight: 1.5, opacity: 1, fillColor: '#78DF94', fillOpacity: 0.82 };
  if (raw.includes('menoreh')) return { color: '#D98858', weight: 1.5, opacity: 1, fillColor: '#F7D4BF', fillOpacity: 0.82 };
  if (raw.includes('pakualaman')) return { color: '#52B31E', weight: 1.5, opacity: 1, fillColor: '#A0E878', fillOpacity: 0.82 };
  if (raw.includes('wates')) return { color: '#C42777', weight: 1.5, opacity: 1, fillColor: '#EA72AD', fillOpacity: 0.82 };
  if (raw.includes('sokoliman')) return { color: '#A88E6B', weight: 1.5, opacity: 1, fillColor: '#E4D3BD', fillOpacity: 0.82 };
  if (raw.includes('sumbu') || raw.includes('filosofi') || raw.includes('tugu') || raw.includes('krapyak')) return { color: '#D4B800', weight: 2.2, opacity: 1, fillColor: '#FFEE44', fillOpacity: 0.88 };

  return { color: '#9E9346', weight: 1.5, opacity: 1, fillColor: '#D5CD90', fillOpacity: 0.80 };
}

function convertMeterGeoJSON(data) {
  if (typeof convertUtmGeoJSON !== 'function') throw new Error('Konverter UTM49S tidak tersedia');
  return convertUtmGeoJSON(data);
}

async function readShapefile(path, dbfPath, prjPath, convertUtm = false) {
  const cacheKey = `${path}|${dbfPath}|${prjPath}|${convertUtm}`;
  if (shpCache.has(cacheKey)) return shpCache.get(cacheKey);
  if (typeof shp === 'undefined' || typeof shp.parseShp !== 'function') {
    throw new Error('Parser Shapefile shpjs belum dimuat');
  }

  const [shpBuffer, dbfBuffer, prjText] = await Promise.all([
    fetch(path).then((response) => {
      if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
      return response.arrayBuffer();
    }),
    fetch(dbfPath).then((response) => {
      if (!response.ok) throw new Error(`${dbfPath} HTTP ${response.status}`);
      return response.arrayBuffer();
    }),
    fetch(prjPath).then((response) => {
      if (!response.ok) throw new Error(`${prjPath} HTTP ${response.status}`);
      return response.text();
    })
  ]);
  if (!prjText.trim()) throw new Error(`${prjPath} kosong`);
  const geometries = shp.parseShp(shpBuffer);
  const properties = typeof shp.parseDbf === 'function' ? shp.parseDbf(dbfBuffer) : [];
  const features = geometries.map((geometry, index) => ({
    type: 'Feature',
    properties: properties[index] || {},
    geometry
  }));
  let geojson = { type: 'FeatureCollection', features };
  if (convertUtm) geojson = convertMeterGeoJSON(geojson);
  shpCache.set(cacheKey, geojson);
  return geojson;
}

async function loadShapefile(name, paths, target, options = {}, convertUtm = false) {
  try {
    logMap('Loading', name);
    const geojson = await readShapefile(paths.shp, paths.dbf, paths.prj, convertUtm);
    L.geoJSON(geojson, options).addTo(target);
    logMap(convertUtm ? 'Converted EPSG:32749' : 'Loaded', name);
  } catch (error) {
    logMap('ERROR', name, error.message);
  }
}

async function loadGeoJSON(name, path, target, options = {}, convert = false) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.json();
    const data = convert ? convertMeterGeoJSON(raw) : raw;
    L.geoJSON(data, options).addTo(target);
    if (name === 'Tingkat Risiko') ensureRiskHatchPatternsInPane();
    logMap(convert ? 'Converted EPSG:32749/9489' : 'Loaded', name);
  } catch (error) {
    logMap('Failed', name, error.message);
  }
}

async function loadAdminOverlays() {
  await Promise.all([
    loadShapefile('Batas Provinsi', {
      shp: 'Shapefile & mpk/Data Peta WMK Cagar Budaya/Batas Administrasi Provinsi.shp',
      dbf: 'Shapefile & mpk/Data Peta WMK Cagar Budaya/Batas Administrasi Provinsi.dbf',
      prj: 'Shapefile & mpk/Data Peta WMK Cagar Budaya/Batas Administrasi Provinsi.prj'
    }, layerProvinceDIY, { pane: 'pane_administrasi', style: { color: '#111827', weight: 3, fill: false } }),
    loadGeoJSON('Batas Kabupaten', 'data/diy-kabkota.geojson', countyBoundaryLayer, {
      pane: 'pane_kabupaten',
      style: { color: '#1e3a8a', weight: 2.8, opacity: 0.95, fill: false, dashArray: '8, 5' },
      onEachFeature: (feature, layer) => {
        const nama = feature.properties?.nama || feature.properties?.NAMA || feature.properties?.kab_kota || 'Kabupaten';
        layer.bindTooltip(nama.toUpperCase(), {
          permanent: true,
          direction: 'center',
          className: 'kabupaten-label'
        });
        layer.bindPopup(`<strong>🏛️ ${nama}</strong><br><small class="text-muted">Daerah Istimewa Yogyakarta</small>`);
      }
    }),
    loadShapefile('Batas Kecamatan/Kapanewon', {
      shp: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Batas Administrasi Kelurahan DIY/Administrasi_Kapanewon_AR.shp',
      dbf: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Batas Administrasi Kelurahan DIY/Administrasi_Kapanewon_AR.dbf',
      prj: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Batas Administrasi Kelurahan DIY/Administrasi_Kapanewon_AR.prj'
    }, layerSrsBatasKecamatan, { pane: 'pane_administrasi', style: { color: '#374151', weight: 1.3, fill: false } }),
    loadShapefile('Batas Kelurahan/Desa', {
      shp: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Batas Administrasi Kelurahan DIY/Administrasi_LN.shp',
      dbf: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Batas Administrasi Kelurahan DIY/Administrasi_LN.dbf',
      prj: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Batas Administrasi Kelurahan DIY/Administrasi_LN.prj'
    }, layerSrsBatasDesa, { pane: 'pane_administrasi', style: { color: '#4b5563', weight: 0.8, fill: false } }),
    loadShapefile('Jaringan Jalan', {
      shp: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Jalan/Jalan.shp',
      dbf: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Jalan/Jalan.dbf',
      prj: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Jalan/Jalan.prj'
    }, layerJalan, {
      pane: 'pane_jalan',
      style: (feature) => {
        const type = Object.values(feature.properties || {}).join(' ').toLowerCase();
        const isCollector = type.includes('kolektor') || type.includes('collector');
        return { color: isCollector ? '#ff0000' : 'transparent', weight: isCollector ? 3.2 : 0, opacity: isCollector ? 1 : 0, fill: false };
      }
    }, true),
    loadGeoJSON('Tingkat Risiko', 'data/TINGKAT RISIKO.geojson', layerTingkatRisiko, {
      pane: 'pane_risiko',
      style: styleRisk,
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        const center = layer.getBounds().getCenter();
        const category = props.KATEGORI || 'Tidak diketahui';
        layer.bindPopup(`
          <strong>Tingkat Risiko Kebakaran</strong><br>
          Status: <b>${category}</b><br>
          Wilayah: ${props.Kapanewon || '-'}, ${props.Kabupaten || '-'}<br>
          Koordinat: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}
        `);
      }
    }),
    loadGeoJSON('Pos Eksisting', 'data/TITIK POS DAMKAR EKSISTING.geojson', posDamkarLayer, {
      pane: 'pane_pos',
      pointToLayer: (feature, latlng) => {
        const marker = L.circleMarker(latlng, {
          radius: 9,
          color: '#ffffff',
          weight: 2.8,
          fillColor: '#C62828',
          fillOpacity: 1
        });
        const nama = feature.properties?.Nama || feature.properties?.NAMA || 'Pos Damkar';
        marker.bindTooltip(`🚒 ${nama}`, {
          permanent: true,
          direction: 'top',
          className: 'pos-damkar-label',
          offset: [0, -10]
        });
        return marker;
      },
      onEachFeature: (feature, layer) => {
        const nama = feature.properties?.Nama || feature.properties?.NAMA || 'Pos Damkar Eksisting';
        const kab = feature.properties?.Kabupaten || '-';
        layer.bindPopup(`
          <div style="min-width:200px; padding:2px 0;">
            <div style="font-size:15px; font-weight:bold; color:#C62828; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
              <span>🚒</span> <span>${nama}</span>
            </div>
            <div style="margin-bottom:6px;">
              <span class="badge bg-danger" style="background:#C62828!important; font-size:11.5px; font-weight:bold; padding:4px 8px; border-radius:4px; display:inline-block;">Pos Pemadam Kebakaran Tersedia</span>
            </div>
            <div style="font-size:13px; color:#1f2937; margin-top:2px;">
              <b>Wilayah:</b> ${kab}
            </div>
          </div>
        `);
      }
    }),
    loadGeoJSON('Buffer Eksisting', 'data/BUFFER POS DAMKAR EKSISTING.geojson', bufferDamkarLayer, {
      pane: 'pane_jangkauan',
      style: {
        color: '#103B78',
        weight: 2.8,
        opacity: 0.95,
        fillColor: '#93C5FD',
        fillOpacity: 0.18
      },
      onEachFeature: (feature, layer) => {
        const nama = feature.properties?.Nama || feature.properties?.NAMA || 'Pos Damkar Tersedia';
        layer.bindPopup(`<strong>🛡️ Jangkauan Layanan (${nama})</strong><br><small>Radius jangkauan operasional pemadam kebakaran.</small>`);
      }
    }, true),
    loadGeoJSON('Pos Rencana', 'data/TITIK POS DAMKAR RENCANA.geojson', layerPosRencana, {
      pane: 'pane_pos',
      pointToLayer: (feature, latlng) => {
        const marker = L.circleMarker(latlng, {
          radius: 8,
          color: '#ffffff',
          weight: 2.5,
          fillColor: '#103B78',
          fillOpacity: 1
        });
        const nama = feature.properties?.Nama || feature.properties?.NAMA || 'Pos Rencana';
        marker.bindTooltip(`🛡️ ${nama}`, {
          permanent: true,
          direction: 'top',
          className: 'pos-rencana-label',
          offset: [0, -10]
        });
        return marker;
      },
      onEachFeature: (feature, layer) => {
        const nama = feature.properties?.Nama || feature.properties?.NAMA || 'Pos Damkar Rencana';
        const kab = feature.properties?.Kabupaten || '-';
        layer.bindPopup(`
          <div style="min-width:200px; padding:2px 0;">
            <div style="font-size:15px; font-weight:bold; color:#103B78; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
              <span>🛡️</span> <span>${nama}</span>
            </div>
            <div style="margin-bottom:6px;">
              <span class="badge bg-primary" style="background:#103B78!important; font-size:11.5px; font-weight:bold; padding:4px 8px; border-radius:4px; display:inline-block;">Pos Pemadam Kebakaran Rencana</span>
            </div>
            <div style="font-size:13px; color:#1f2937; margin-top:2px;">
              <b>Wilayah:</b> ${kab}
            </div>
          </div>
        `);
      }
    }, true),
    loadGeoJSON('Buffer Rencana', 'data/BUFFER POS DAMKAR RENCANA.geojson', layerBufferRencana, {
      pane: 'pane_jangkauan',
      style: {
        color: '#103B78',
        weight: 2.8,
        dashArray: '4, 4',
        opacity: 0.95,
        fillColor: '#60A5FA',
        fillOpacity: 0.16
      },
      onEachFeature: (feature, layer) => {
        const nama = feature.properties?.Nama || feature.properties?.NAMA || 'Pos Damkar Rencana';
        layer.bindPopup(`<strong>🛡️ Jangkauan Layanan Rencana (${nama})</strong><br><small>Rencana perluasan area jangkauan pelayanan.</small>`);
      }
    }, true),
    loadGeoJSON('Cagar Budaya', 'data/TITIK CAGAR BUDAYA.geojson', layerCagarBudayaPanel, {
      pane: 'pane_cagar',
      pointToLayer: (feature, latlng) => {
        const ktgr = String(feature.properties?.Ktgr || feature.properties?.KTGR || feature.properties?.Jenis || '').trim().toLowerCase();
        const cagarColors = { 'bangunan': '#8D6E63', 'benda': '#9C27B0', 'kawasan': '#2E7D32', 'situs': '#E65100', 'struktur': '#00838F' };
        const color = cagarColors[ktgr] || '#92400e';
        const marker = L.circleMarker(latlng, { radius: 6, color: '#ffffff', weight: 1.5, fillColor: color, fillOpacity: 0.95 });
        const nama = feature.properties?.NmObjek || feature.properties?.NAMA || feature.properties?.namobj || 'Cagar Budaya';
        marker.bindTooltip(nama, { permanent: false, direction: 'top' });
        return marker;
      },
      onEachFeature: (feature, layer) => {
        const nama = feature.properties?.NmObjek || feature.properties?.NAMA || feature.properties?.namobj || 'Cagar Budaya';
        const ktgr = feature.properties?.Ktgr || '-';
        const alamat = feature.properties?.Alamat || '-';
        layer.bindPopup(`<strong>🏛️ ${nama}</strong><br><b>Kategori:</b> ${ktgr}<br><small>${alamat}</small>`);
      }
    }),
    loadGeoJSON('Dasar Putih Peta SRS', 'data/diy-kabkota.geojson', layerSrsBase, { pane: 'pane_srs_base', interactive: false, style: { color: 'transparent', weight: 0, opacity: 0, fill: true, fillColor: '#ffffff', fillOpacity: 1 } }),
    loadGeoJSON('Area SRS', 'data/AREA SRS.geojson', layerAreaSRS, { pane: 'pane_grid', style: getSRSColor, onEachFeature: (feature, layer) => {
      const name = feature.properties?.REMARK || feature.properties?.SRS_EDIT || feature.properties?.SRS_FIX || feature.properties?.NAMOBJ || 'Kawasan SRS DIY';
      layer.bindPopup(`<strong>Satuan Ruang Strategis (SRS)</strong><br>${name}`);
    } }),
    loadGeoJSON('Biro/Organisasi/Sekolah', 'data/TITIK BIRO ORGANISASI PEMERINTAH DAN SEKOLAH.geojson', layerBiroSekolah, { pane: 'pane_pos', pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 5, color: '#fff', weight: 1, fillColor: '#0891b2', fillOpacity: 0.95 }), onEachFeature: (feature, layer) => layer.bindPopup(`<strong>${feature.properties?.namobj || feature.properties?.nama_opd || 'Objek Pemerintah/Sekolah'}</strong><br>${feature.properties?.alamat || ''}`) }, true)
  ]);
}

function applyAdminMapMode(mode) {
  if (typeof liveMap === 'undefined' || !liveMap || !mapLayersReady) return;
  currentAdminMapMode = mode;
  if (typeof diyRegionsLayer !== 'undefined') setLayerVisible(diyRegionsLayer, false);
  const tilePane = liveMap.getPane('tilePane');
  const isSrsPresentation = mode === 'srs' || mode === 'area-srs' || mode === 'live-damkar';
  if (tilePane) tilePane.style.opacity = isSrsPresentation ? '0' : '1';
  const modeLayers = {
    srs: ['srs-base', 'area-srs', 'province-diy', 'kabupaten', 'kecamatan', 'desa'],
    'area-srs': ['srs-base', 'area-srs', 'province-diy', 'kabupaten', 'kecamatan', 'desa'],
    'live-damkar': ['srs-base', 'area-srs', 'province-diy', 'kabupaten', 'kecamatan', 'desa', 'pos-eksisting', 'jangkauan-eksisting', 'pos-rencana', 'jangkauan-rencana', 'cagar-budaya', 'laporan-aktif'],
    risiko: ['risiko', 'province-diy', 'kabupaten', 'kecamatan', 'desa', 'jalan'],
    'risiko-cagar': ['province-diy', 'kabupaten', 'jalan', 'pos-eksisting', 'jangkauan-eksisting', 'cagar-budaya', 'laporan-aktif'],
    jangkauan: ['province-diy', 'kabupaten', 'jalan', 'pos-eksisting', 'jangkauan-eksisting', 'pos-rencana', 'jangkauan-rencana', 'cagar-budaya', 'laporan-aktif'],
    skenario: ['province-diy', 'kabupaten', 'jalan', 'pos-eksisting', 'jangkauan-eksisting', 'pos-rencana', 'jangkauan-rencana', 'laporan-aktif'],
    dasar: ['province-diy', 'kabupaten', 'jalan', 'laporan-aktif'],
    'wmk-cagar': ['province-diy', 'kabupaten', 'pos-eksisting', 'jangkauan-eksisting', 'cagar-budaya', 'laporan-aktif'],
    wmk: ['province-diy', 'kabupaten', 'pos-eksisting', 'jangkauan-eksisting', 'pos-rencana', 'jangkauan-rencana', 'laporan-aktif'],
    'pos-damkar': ['province-diy', 'kabupaten', 'pos-eksisting', 'jangkauan-eksisting', 'pos-rencana', 'jangkauan-rencana', 'laporan-aktif']
  };
  const active = new Set(modeLayers[mode] || modeLayers.jangkauan);
  const allControlledLayers = ['risiko', 'area-srs', 'cagar-budaya', 'biro-sekolah', 'pos-eksisting', 'jangkauan-eksisting', 'pos-rencana', 'jangkauan-rencana', 'province-diy', 'provinsi', 'kabupaten', 'kecamatan', 'desa', 'jalan', 'laporan-aktif', 'laporan-selesai'];
  
  Object.entries(panelLayers()).forEach(([name, layer]) => {
    const visible = active.has(name);
    setLayerVisible(layer, visible);
    setCheckbox(`cb-${name}`, visible);
  });

  const srsCheckbox = document.getElementById('cb-area-srs');
  const isSrsMode = mode === 'srs';
  if (srsCheckbox) {
    srsCheckbox.disabled = !isSrsMode;
    srsCheckbox.checked = isSrsMode;
  }
  if (!isSrsMode) setLayerVisible(layerAreaSRS, false);

  if (isSrsPresentation) {
    if (typeof diyRegionsLayer !== 'undefined') setLayerVisible(diyRegionsLayer, false);
    if (typeof diyVillagePointsLayer !== 'undefined') setLayerVisible(diyVillagePointsLayer, false);
    setLayerVisible(layerSrsBase, true);
    layerSrsBase.eachLayer((layer) => {
      layer.setStyle({
        color: 'transparent',
        weight: 0,
        opacity: 0,
        fill: true,
        fillColor: '#ffffff',
        fillOpacity: 1
      });
    });
    layerAreaSRS.eachLayer((layer) => {
      if (layer.feature) layer.setStyle(getSRSColor(layer.feature));
    });
  }

  const showRisiko = active.has('risiko');
  setLayerVisible(layerTingkatRisiko, showRisiko);
  setCheckbox('cb-risiko', showRisiko);
  if (showRisiko) {
    layerTingkatRisiko.eachLayer((layer) => {
      if (layer.feature) layer.setStyle(styleRisk(layer.feature));
      if (typeof layer.bringToFront === 'function') layer.bringToFront();
    });
  }

  setCheckbox('cb-provinsi', active.has('province-diy') || active.has('provinsi'));
  setCheckbox('cb-province-diy', active.has('province-diy') || active.has('provinsi'));
  setCheckbox('cb-skenario', mode === 'skenario');
  updateDynamicLegend();
}
window.applyAdminMapMode = applyAdminMapMode;

function bindLayerPanel() {
  document.querySelectorAll('.map-layer-cb').forEach((checkbox) => checkbox.addEventListener('change', () => {
    const name = checkbox.dataset.layer;
    if (name === 'risiko') {
      setLayerVisible(layerTingkatRisiko, checkbox.checked);
      if (checkbox.checked) {
        layerTingkatRisiko.eachLayer((layer) => {
          if (layer.feature) layer.setStyle(styleRisk(layer.feature));
          if (typeof layer.bringToFront === 'function') layer.bringToFront();
        });
      }
      logMap(checkbox.checked ? 'Layer ON' : 'Layer OFF', name);
      updateDynamicLegend();
      return;
    }
    if (name === 'skenario') {
      const selector = document.getElementById('map-mode-selector');
      if (checkbox.checked && selector) selector.value = 'skenario';
      applyAdminMapMode(checkbox.checked ? 'skenario' : 'risiko');
      return;
    }
    const layer = panelLayers()[name];
    if (layer) {
      setLayerVisible(layer, checkbox.checked);
      logMap(checkbox.checked ? 'Layer ON' : 'Layer OFF', name);
    }
    if (name === 'provinsi' || name === 'province-diy') {
      setCheckbox('cb-provinsi', checkbox.checked);
      setCheckbox('cb-province-diy', checkbox.checked);
    }
    updateDynamicLegend();
  }));
  document.getElementById('map-mode-selector')?.addEventListener('change', (event) => applyAdminMapMode(event.target.value));
}

function initAdminLayerPanel() {
  if (typeof liveMap === 'undefined' || !liveMap) return;
  ensureRiskHatchPatterns();
  ['pane_srs_base', 'pane_grid', 'pane_risiko', 'pane_administrasi', 'pane_kabupaten', 'pane_jalan', 'pane_jangkauan', 'pane_cagar', 'pane_pos', 'pane_insiden'].forEach((name, index) => {
    if (!liveMap.getPane(name)) liveMap.createPane(name);
    liveMap.getPane(name).style.zIndex = String(300 + index * 40);
  });
  liveMap.getPane('pane_srs_base').style.zIndex = '280';
  basemaps = {
    jalan: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }),
    satelit: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Esri' }),
    terang: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, attribution: 'CartoDB' }),
    gelap: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, attribution: 'CartoDB' })
  };
  basemaps.jalan.addTo(liveMap);
  document.getElementById('map-basemap-select')?.addEventListener('change', (event) => {
    Object.values(basemaps).forEach((layer) => liveMap.removeLayer(layer));
    basemaps[event.target.value]?.addTo(liveMap);
  });
  bindLayerPanel();
  loadAdminOverlays().then(() => {
    mapLayersReady = true;
    applyAdminMapMode(document.getElementById('map-mode-selector')?.value || 'risiko');
  });
  L.control.scale({ metric: true, imperial: false }).addTo(liveMap);
}

document.addEventListener('DOMContentLoaded', () => {
  const waitForMap = () => {
    if (typeof liveMap !== 'undefined' && liveMap) initAdminLayerPanel();
    else setTimeout(waitForMap, 100);
  };
  waitForMap();
});