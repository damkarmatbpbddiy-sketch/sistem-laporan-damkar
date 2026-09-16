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
  'prambanan': { fill: '#D7C7EB', stroke: '#8A63D2', label: 'SRS Candi Prambanan – Candi Ijo' },
  'merapi': { fill: '#C8E6A6', stroke: '#6FA832', label: 'SRS Gunung Merapi' },
  'karaton': { fill: '#F6EAAD', stroke: '#9E9346', label: 'SRS Karaton' },
  'kraton': { fill: '#F6EAAD', stroke: '#9E9346', label: 'SRS Karaton' },
  'gunungsewu': { fill: '#AEE5EE', stroke: '#38A3B8', label: 'SRS Karst Gunungsewu' },
  'gunung sewu': { fill: '#AEE5EE', stroke: '#38A3B8', label: 'SRS Karst Gunungsewu' },
  'karst': { fill: '#AEE5EE', stroke: '#38A3B8', label: 'SRS Karst Gunungsewu' },
  'kerto': { fill: '#F3A8A8', stroke: '#D15353', label: 'SRS Kerto - Pleret' },
  'pleret': { fill: '#F3A8A8', stroke: '#D15353', label: 'SRS Kerto - Pleret' },
  'kotabaru': { fill: '#A4DFD1', stroke: '#3EA38A', label: 'SRS Kotabaru' },
  'girigondo': { fill: '#A8BAEE', stroke: '#5777D9', label: 'SRS Makam Girigondo' },
  'imogiri': { fill: '#9496E8', stroke: '#4A4ED1', label: 'SRS Makam Raja-Raja Mataram di Imogiri' },
  'pathok': { fill: '#EE6EDE', stroke: '#B823A4', label: 'SRS Masjid Pathok Negoro' },
  'kotagede': { fill: '#78DF94', stroke: '#2BA34D', label: 'SRS Masjid dan Makam Raja Mataram di Kotagede' },
  'samas': { fill: '#DDD177', stroke: '#A39423', label: 'SRS Pantai Samas – Parangtritis' },
  'parangtritis': { fill: '#DDD177', stroke: '#A39423', label: 'SRS Pantai Samas – Parangtritis' },
  'gunungkidul': { fill: '#B8CEE0', stroke: '#527E9F', label: 'SRS Pantai Selatan Gunungkidul' },
  'kulon progo': { fill: '#F3BEB2', stroke: '#D86550', label: 'SRS Pantai Selatan Kulon Progo' },
  'kulonprogo': { fill: '#F3BEB2', stroke: '#D86550', label: 'SRS Pantai Selatan Kulon Progo' },
  'menoreh': { fill: '#F7D4BF', stroke: '#D98858', label: 'SRS Perbukitan Menoreh' },
  'pakualaman': { fill: '#A0E878', stroke: '#52B31E', label: 'SRS Puro Pakualaman' },
  'wates': { fill: '#EA72AD', stroke: '#C42777', label: 'SRS Pusat Kota Wates' },
  'sokoliman': { fill: '#E4D3BD', stroke: '#A88E6B', label: 'SRS Sokoliman' },
  'sumbu': { fill: '#FFEE44', stroke: '#D4B800', label: 'SRS Sumbu Filosofi Tugu Pal Putih - Panggung Krapyak' },
  'tugu': { fill: '#FFEE44', stroke: '#D4B800', label: 'SRS Sumbu Filosofi Tugu Pal Putih - Panggung Krapyak' },
  'filosofi': { fill: '#FFEE44', stroke: '#D4B800', label: 'SRS Sumbu Filosofi Tugu Pal Putih - Panggung Krapyak' }
};

const OFFICIAL_SRS_LIST = [
  { name: 'SRS Candi Prambanan – Candi Ijo', fill: '#D7C7EB', stroke: '#8A63D2' },
  { name: 'SRS Gunung Merapi', fill: '#C8E6A6', stroke: '#6FA832' },
  { name: 'SRS Karaton', fill: '#F6EAAD', stroke: '#9E9346' },
  { name: 'SRS Karst Gunungsewu', fill: '#AEE5EE', stroke: '#38A3B8' },
  { name: 'SRS Kerto - Pleret', fill: '#F3A8A8', stroke: '#D15353' },
  { name: 'SRS Kotabaru', fill: '#A4DFD1', stroke: '#3EA38A' },
  { name: 'SRS Makam Girigondo', fill: '#A8BAEE', stroke: '#5777D9' },
  { name: 'SRS Makam Raja-Raja Mataram di Imogiri', fill: '#9496E8', stroke: '#4A4ED1' },
  { name: 'SRS Masjid Pathok Negoro', fill: '#EE6EDE', stroke: '#B823A4' },
  { name: 'SRS Masjid dan Makam Raja Mataram di Kotagede', fill: '#78DF94', stroke: '#2BA34D' },
  { name: 'SRS Pantai Samas – Parangtritis', fill: '#DDD177', stroke: '#A39423' },
  { name: 'SRS Pantai Selatan Gunungkidul', fill: '#B8CEE0', stroke: '#527E9F' },
  { name: 'SRS Pantai Selatan Kulon Progo', fill: '#F3BEB2', stroke: '#D86550' },
  { name: 'SRS Perbukitan Menoreh', fill: '#F7D4BF', stroke: '#D98858' },
  { name: 'SRS Puro Pakualaman', fill: '#A0E878', stroke: '#52B31E' },
  { name: 'SRS Pusat Kota Wates', fill: '#EA72AD', stroke: '#C42777' },
  { name: 'SRS Sokoliman', fill: '#E4D3BD', stroke: '#A88E6B' },
  { name: 'SRS Sumbu Filosofi Tugu Pal Putih - Panggung Krapyak', fill: '#FFEE44', stroke: '#D4B800' }
];

function updateDynamicLegend() {
  const legend = document.getElementById('map-theme-legend-container');
  if (!legend) return;

  const isSrsActive = currentAdminMapMode === 'srs' || currentAdminMapMode === 'area-srs' || currentAdminMapMode === 'jangkauan' || document.getElementById('cb-area-srs')?.checked;

  if (isSrsActive) {
    const half = Math.ceil(OFFICIAL_SRS_LIST.length / 2);
    const col1 = OFFICIAL_SRS_LIST.slice(0, half);
    const col2 = OFFICIAL_SRS_LIST.slice(half);

    const renderSrsItem = (item) => `
      <div class="d-flex align-items-center mb-1" style="line-height:1.25;">
        <span style="display:inline-block; width:13px; height:13px; background:${item.fill}; border:1.2px solid ${item.stroke}; border-radius:2px; margin-right:6px; flex-shrink:0;"></span>
        <span class="text-truncate" title="${item.name}">${item.name}</span>
      </div>
    `;

    legend.innerHTML = `
      <div class="card shadow-sm border border-secondary border-opacity-25 mt-2">
        <div class="card-header bg-dark text-white py-2 px-3 d-flex justify-content-between align-items-center">
          <div>
            <span class="fw-bold text-uppercase" style="letter-spacing:0.4px; font-size:12px;">PETA JANGKAUAN PELAYANAN POS PEMADAM KEBAKARAN PROVINSI DIY</span>
            <span class="badge bg-danger ms-2" style="font-size:9.5px; font-weight:bold;">BPBD DIY 2026</span>
          </div>
          <span class="text-white-50" style="font-size:11px;"><i class="bi bi-info-circle me-1"></i>Legenda Resmi</span>
        </div>
        <div class="card-body p-3 bg-white text-dark">
          <div class="row g-3" style="font-size:11.5px;">
            <!-- Kolom 1: Wilayah Manajemen Kebakaran & Risiko Kebakaran -->
            <div class="col-lg-3 col-md-6 border-end-md">
              <div class="fw-bold text-uppercase text-secondary mb-2" style="font-size:11px; letter-spacing:0.3px;">Wilayah Manajemen Kebakaran</div>
              <div class="d-flex align-items-center mb-1">
                <span style="display:inline-flex; width:18px; justify-content:center; margin-right:6px; font-size:13px;">🛡️</span>
                <span>Pos Pemadam Kebakaran Rencana</span>
              </div>
              <div class="d-flex align-items-center mb-1">
                <span style="display:inline-block; width:16px; height:12px; border:2px solid #103B78; background:rgba(147,197,253,0.3); border-radius:3px; margin-right:6px; flex-shrink:0;"></span>
                <span>Jangkauan Layanan</span>
              </div>
              <div class="d-flex align-items-center mb-3">
                <span style="display:inline-flex; width:18px; justify-content:center; margin-right:6px; font-size:13px;">🚒</span>
                <span>Pos Pemadam Kebakaran Tersedia</span>
              </div>

              <div class="fw-bold text-uppercase text-secondary mb-2" style="font-size:11px; letter-spacing:0.3px;">Kategori Risiko Kebakaran</div>
              <div class="d-flex align-items-center mb-1">
                <span class="srs-risk-pattern srs-risk-very-heavy" style="margin-right:6px; flex-shrink:0;"></span>
                <span class="fw-semibold text-danger">Sangat Berat</span>
              </div>
              <div class="d-flex align-items-center mb-1">
                <span class="srs-risk-pattern srs-risk-heavy" style="margin-right:6px; flex-shrink:0;"></span>
                <span class="fw-semibold text-danger">Berat</span>
              </div>
            </div>

            <!-- Kolom 2: Cagar Budaya & Batas Administrasi -->
            <div class="col-lg-3 col-md-6 border-end-lg">
              <div class="fw-bold text-uppercase text-secondary mb-2" style="font-size:11px; letter-spacing:0.3px;">Cagar Budaya</div>
              <div class="d-flex align-items-center mb-1"><span style="color:#8D6E63; font-size:14px; margin-right:8px; line-height:1;">●</span> Bangunan</div>
              <div class="d-flex align-items-center mb-1"><span style="color:#9C27B0; font-size:14px; margin-right:8px; line-height:1;">●</span> Benda</div>
              <div class="d-flex align-items-center mb-1"><span style="color:#2E7D32; font-size:14px; margin-right:8px; line-height:1;">●</span> Kawasan</div>
              <div class="d-flex align-items-center mb-1"><span style="color:#E65100; font-size:14px; margin-right:8px; line-height:1;">●</span> Situs</div>
              <div class="d-flex align-items-center mb-3"><span style="color:#00838F; font-size:14px; margin-right:8px; line-height:1;">●</span> Struktur</div>

              <div class="fw-bold text-uppercase text-secondary mb-2" style="font-size:11px; letter-spacing:0.3px;">Batas Administrasi</div>
              <div class="d-flex align-items-center mb-1">
                <span style="font-weight:900; letter-spacing:1px; color:#111827; margin-right:8px;">- - -</span>
                <span>Batas Provinsi</span>
              </div>
              <div class="d-flex align-items-center mb-1">
                <span style="font-weight:900; letter-spacing:1px; color:#1e3a8a; margin-right:8px;">- · - ·</span>
                <span>Batas Kabupaten</span>
              </div>
              <div class="d-flex align-items-center mb-1">
                <span style="font-weight:900; letter-spacing:2px; color:#4b5563; margin-right:8px;">······</span>
                <span>Batas Kelurahan/Desa</span>
              </div>
            </div>

            <!-- Kolom 3 & 4: Satuan Ruang Strategis (18 Item) -->
            <div class="col-lg-6 col-md-12">
              <div class="fw-bold text-uppercase text-secondary mb-2" style="font-size:11px; letter-spacing:0.3px;">Satuan Ruang Strategis (18 Kawasan)</div>
              <div class="row g-1" style="font-size:11px;">
                <div class="col-sm-6">
                  ${col1.map(renderSrsItem).join('')}
                </div>
                <div class="col-sm-6">
                  ${col2.map(renderSrsItem).join('')}
                </div>
              </div>
            </div>
          </div>

          <hr class="my-2 border-secondary border-opacity-25">
          <div class="d-flex justify-content-between align-items-center flex-wrap text-muted" style="font-size:10.5px;">
            <div><b>Sumber Data:</b> Data Spasial BIG &bull; Data Titik Pos Damkar Tersedia &bull; Data Satuan Ruang Strategis &bull; Data Titik Cagar Budaya</div>
            <div><b>Skala:</b> 1:500.000 &bull; Bidang Pemadam Kebakaran dan Penyelamatan BPBD DIY 2026</div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // Fallback dynamic legend for other modes
  const items = [];
  const checked = (id) => document.getElementById(id)?.checked;
  if (checked('cb-pos-eksisting') || checked('cb-pos-rencana') || checked('cb-jangkauan-eksisting') || checked('cb-jangkauan-rencana')) {
    let wmkItems = '<strong>Wilayah Manajemen Kebakaran</strong>';
    if (checked('cb-pos-eksisting')) wmkItems += '<br><span style="color:#C62828; font-size:14px;">●</span> Pos Pemadam Kebakaran Tersedia';
    if (checked('cb-pos-rencana')) wmkItems += '<br><span style="color:#103B78; font-size:14px;">●</span> Pos Pemadam Kebakaran Rencana';
    if (checked('cb-jangkauan-eksisting') || checked('cb-jangkauan-rencana')) wmkItems += '<br><span style="display:inline-block; width:16px; height:10px; border:2px solid #103B78; background:rgba(147,197,253,0.25);"></span> Jangkauan Layanan';
    items.push(wmkItems);
  }
  if (checked('cb-risiko')) {
    items.push(
      '<strong>Kategori Risiko Kebakaran</strong><br>' +
      '<span class="srs-risk-pattern srs-risk-very-heavy me-1"></span> Sangat Berat<br>' +
      '<span class="srs-risk-pattern srs-risk-heavy me-1"></span> Berat<br>' +
      '<span style="background:#ffff00; border:1px solid #854d0e; display:inline-block; width:12px; height:12px; border-radius:2px; margin-right:4px;"></span> Sedang<br>' +
      '<span style="background:#86efac; border:1px solid #166534; display:inline-block; width:12px; height:12px; border-radius:2px; margin-right:4px;"></span> Ringan<br>' +
      '<span style="background:#93c5fd; border:1px solid #1e40af; display:inline-block; width:12px; height:12px; border-radius:2px; margin-right:4px;"></span> Sangat Ringan'
    );
  }
  if (checked('cb-cagar-budaya')) {
    items.push('<strong>Cagar Budaya</strong><br><span style="color:#8D6E63">●</span> Bangunan<br><span style="color:#9C27B0">●</span> Benda<br><span style="color:#2E7D32">●</span> Kawasan<br><span style="color:#E65100">●</span> Situs<br><span style="color:#00838F">●</span> Struktur');
  }
  if (checked('cb-provinsi')) items.push('<strong>Batas Administrasi</strong><br><span style="color:#111827">- - -</span> Batas Provinsi');
  if (checked('cb-kabupaten')) items.push('<strong>Batas Kabupaten</strong><br><span style="color:#1e3a8a">- · - ·</span> Batas Kabupaten');
  if (checked('cb-kecamatan')) items.push('<strong>Batas Kapanewon</strong><br><span style="color:#374151">···</span> Batas Kecamatan');
  if (checked('cb-desa')) items.push('<strong>Batas Kelurahan</strong><br><span style="color:#4b5563">······</span> Batas Kelurahan/Desa');
  if (checked('cb-jalan')) items.push('<strong>Aksesibilitas</strong><br><span style="color:#ff0000; font-weight:900;">━</span> Jalan Kolektor');

  legend.innerHTML = `<div class="card p-3 shadow-sm bg-white"><div class="fw-bold mb-2">LEGENDA PETA</div><hr class="my-1">${items.length ? items.map((item) => `<div class="mb-2">${item}</div>`).join('') : '<small>Tidak ada overlay aktif.</small>'}</div>`;
}

function styleRisk(feature) {
  const category = String(feature?.properties?.KATEGORI || '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');

  const isSrsActive = currentAdminMapMode === 'srs' || currentAdminMapMode === 'area-srs' || currentAdminMapMode === 'jangkauan' || document.getElementById('cb-area-srs')?.checked;

  if (category === 'SANGAT BERAT') {
    return {
      color: '#b91c1c',
      weight: 1.2,
      opacity: 0.95,
      fill: true,
      fillColor: 'url(#risk-hatch-sangat-berat)',
      fillOpacity: 1
    };
  }
  if (category === 'BERAT') {
    return {
      color: '#b91c1c',
      weight: 1.0,
      opacity: 0.95,
      fill: true,
      fillColor: 'url(#risk-hatch-berat)',
      fillOpacity: 1
    };
  }

  if (isSrsActive) {
    return {
      color: 'transparent',
      weight: 0,
      opacity: 0,
      fill: false,
      fillOpacity: 0
    };
  }

  const colors = {
    'SEDANG':       { fill: '#ffff00', border: '#ca8a04' },
    'RINGAN':       { fill: '#86efac', border: '#16a34a' },
    'SANGAT RINGAN':{ fill: '#93c5fd', border: '#2563eb' }
  };
  const config = colors[category] || { fill: '#ffffff', border: '#64748b' };
  return {
    color: config.border,
    weight: 0.8,
    opacity: 0.9,
    fill: true,
    fillColor: config.fill,
    fillOpacity: 0.7
  };
}

function createHatchDefs() {
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

  // Sangat Berat: Red Crosshatch
  const patSangat = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  patSangat.id = 'risk-hatch-sangat-berat';
  patSangat.setAttribute('width', '8');
  patSangat.setAttribute('height', '8');
  patSangat.setAttribute('patternUnits', 'userSpaceOnUse');
  patSangat.setAttribute('patternTransform', 'rotate(45)');

  const stripeV = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  stripeV.setAttribute('x', '0');
  stripeV.setAttribute('y', '0');
  stripeV.setAttribute('width', '2');
  stripeV.setAttribute('height', '8');
  stripeV.setAttribute('fill', '#b91c1c');
  patSangat.appendChild(stripeV);

  const stripeH = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  stripeH.setAttribute('x', '0');
  stripeH.setAttribute('y', '0');
  stripeH.setAttribute('width', '8');
  stripeH.setAttribute('height', '2');
  stripeH.setAttribute('fill', '#b91c1c');
  patSangat.appendChild(stripeH);
  defs.appendChild(patSangat);

  // Berat: Red Diagonal single stripe
  const patBerat = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  patBerat.id = 'risk-hatch-berat';
  patBerat.setAttribute('width', '8');
  patBerat.setAttribute('height', '8');
  patBerat.setAttribute('patternUnits', 'userSpaceOnUse');
  patBerat.setAttribute('patternTransform', 'rotate(45)');

  const stripeDiag = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  stripeDiag.setAttribute('x', '0');
  stripeDiag.setAttribute('y', '0');
  stripeDiag.setAttribute('width', '2.2');
  stripeDiag.setAttribute('height', '8');
  stripeDiag.setAttribute('fill', '#b91c1c');
  patBerat.appendChild(stripeDiag);
  defs.appendChild(patBerat);

  return defs;
}

function ensureRiskHatchPatterns() {
  if (document.getElementById('risk-hatch-patterns')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'risk-hatch-patterns';
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.style.pointerEvents = 'none';
  svg.appendChild(createHatchDefs());
  document.body.appendChild(svg);
}

function ensureRiskHatchPatternsInPane() {
  ensureRiskHatchPatterns();
  if (typeof liveMap === 'undefined' || !liveMap) return;
  const pane = liveMap.getPane('pane_risiko');
  const svg = pane?.querySelector('svg') || liveMap.getContainer().querySelector('svg');
  if (!svg || svg.querySelector('#risk-hatch-sangat-berat')) return;
  svg.insertBefore(createHatchDefs(), svg.firstChild);
}

function applyRiskHatchToLayers() {
  ensureRiskHatchPatternsInPane();
  if (!layerTingkatRisiko) return;
  const isSrsActive = currentAdminMapMode === 'srs' || currentAdminMapMode === 'area-srs' || currentAdminMapMode === 'jangkauan' || document.getElementById('cb-area-srs')?.checked;

  layerTingkatRisiko.eachLayer((layer) => {
    if (!layer.feature) return;
    const cat = String(layer.feature.properties?.KATEGORI || '').toUpperCase().trim();
    if (cat === 'SANGAT BERAT') {
      layer.setStyle({ color: '#b91c1c', weight: 1.2, opacity: 0.95, fill: true, fillColor: 'url(#risk-hatch-sangat-berat)', fillOpacity: 1 });
      if (layer._path) {
        layer._path.setAttribute('fill', 'url(#risk-hatch-sangat-berat)');
        layer._path.setAttribute('stroke', '#b91c1c');
        layer._path.setAttribute('stroke-width', '1.2');
      }
    } else if (cat === 'BERAT') {
      layer.setStyle({ color: '#b91c1c', weight: 1.0, opacity: 0.95, fill: true, fillColor: 'url(#risk-hatch-berat)', fillOpacity: 1 });
      if (layer._path) {
        layer._path.setAttribute('fill', 'url(#risk-hatch-berat)');
        layer._path.setAttribute('stroke', '#b91c1c');
        layer._path.setAttribute('stroke-width', '1.0');
      }
    } else {
      if (isSrsActive) {
        layer.setStyle({ color: 'transparent', weight: 0, opacity: 0, fill: false, fillOpacity: 0 });
        if (layer._path) {
          layer._path.setAttribute('fill', 'none');
          layer._path.setAttribute('stroke', 'none');
        }
      } else {
        layer.setStyle(styleRisk(layer.feature));
      }
    }
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

  if (raw.includes('gunungkidul')) return { color: '#527E9F', weight: 1.5, opacity: 1, fillColor: '#B8CEE0', fillOpacity: 0.85 };
  if (raw.includes('kulon progo') || raw.includes('kulonprogo') || (raw.includes('pantai') && raw.includes('kulon'))) return { color: '#D86550', weight: 1.5, opacity: 1, fillColor: '#F3BEB2', fillOpacity: 0.85 };
  if (raw.includes('samas') || raw.includes('parangtritis')) return { color: '#A39423', weight: 1.5, opacity: 1, fillColor: '#DDD177', fillOpacity: 0.85 };
  if (raw.includes('prambanan') || raw.includes('ijo')) return { color: '#8A63D2', weight: 1.5, opacity: 1, fillColor: '#D7C7EB', fillOpacity: 0.85 };
  if (raw.includes('merapi')) return { color: '#6FA832', weight: 1.5, opacity: 1, fillColor: '#C8E6A6', fillOpacity: 0.85 };
  if (raw.includes('karaton') || raw.includes('kraton')) return { color: '#9E9346', weight: 1.5, opacity: 1, fillColor: '#F6EAAD', fillOpacity: 0.85 };
  if (raw.includes('gunungsewu') || raw.includes('gunung sewu') || raw.includes('karst')) return { color: '#38A3B8', weight: 1.5, opacity: 1, fillColor: '#AEE5EE', fillOpacity: 0.85 };
  if (raw.includes('kerto') || raw.includes('pleret')) return { color: '#D15353', weight: 1.5, opacity: 1, fillColor: '#F3A8A8', fillOpacity: 0.85 };
  if (raw.includes('kotabaru')) return { color: '#3EA38A', weight: 1.5, opacity: 1, fillColor: '#A4DFD1', fillOpacity: 0.85 };
  if (raw.includes('girigondo')) return { color: '#5777D9', weight: 1.5, opacity: 1, fillColor: '#A8BAEE', fillOpacity: 0.85 };
  if (raw.includes('imogiri')) return { color: '#4A4ED1', weight: 1.5, opacity: 1, fillColor: '#9496E8', fillOpacity: 0.85 };
  if (raw.includes('pathok')) return { color: '#B823A4', weight: 1.5, opacity: 1, fillColor: '#EE6EDE', fillOpacity: 0.85 };
  if (raw.includes('kotagede')) return { color: '#2BA34D', weight: 1.5, opacity: 1, fillColor: '#78DF94', fillOpacity: 0.85 };
  if (raw.includes('menoreh')) return { color: '#D98858', weight: 1.5, opacity: 1, fillColor: '#F7D4BF', fillOpacity: 0.85 };
  if (raw.includes('pakualaman')) return { color: '#52B31E', weight: 1.5, opacity: 1, fillColor: '#A0E878', fillOpacity: 0.85 };
  if (raw.includes('wates')) return { color: '#C42777', weight: 1.5, opacity: 1, fillColor: '#EA72AD', fillOpacity: 0.85 };
  if (raw.includes('sokoliman')) return { color: '#A88E6B', weight: 1.5, opacity: 1, fillColor: '#E4D3BD', fillOpacity: 0.85 };
  if (raw.includes('sumbu') || raw.includes('filosofi') || raw.includes('tugu') || raw.includes('krapyak')) return { color: '#D4B800', weight: 2.2, opacity: 1, fillColor: '#FFEE44', fillOpacity: 0.90 };

  return { color: '#9E9346', weight: 1.5, opacity: 1, fillColor: '#F6EAAD', fillOpacity: 0.80 };
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
    fetch(encodeURI(path)).then((response) => {
      if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
      return response.arrayBuffer();
    }),
    fetch(encodeURI(dbfPath)).then((response) => {
      if (!response.ok) throw new Error(`${dbfPath} HTTP ${response.status}`);
      return response.arrayBuffer();
    }),
    fetch(encodeURI(prjPath)).then((response) => {
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
    loadGeoJSON('Batas Provinsi', 'data/diy-provinsi-batas.geojson', layerProvinceDIY, {
      pane: 'pane_administrasi',
      style: { color: '#0f172a', weight: 3.2, opacity: 1, fill: false }
    }),
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

        layer.on('click', async (e) => {
          if (!e || !e.latlng) return;
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;

          const popup = L.popup({ maxWidth: 340 })
            .setLatLng(e.latlng)
            .setContent(`
              <div style="min-width:260px; max-width:320px; font-size:12.5px; line-height:1.6; color:#1f2937;">
                <div style="font-size:15px; font-weight:700; color:#1e3a8a; margin-bottom:8px; display:flex; align-items:center; gap:6px; border-bottom:2px solid #e2e8f0; padding-bottom:5px;">
                  <span>🏛️</span> <span>${escapeHtml(nama)}</span>
                </div>
                <div style="margin-bottom:8px; background:#fffbeb; border:1px solid #fef3c7; border-left:4px solid #f59e0b; border-radius:4px; padding:6px 10px;">
                  <div style="font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#b45309; margin-bottom:2px;">
                    📍 Alamat Lengkap
                  </div>
                  <div style="font-size:12.5px; font-weight:600; color:#1e293b; line-height:1.4;">
                    <i class="bi bi-hourglass-split"></i> Mengambil alamat lengkap...
                  </div>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                  <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap;">Kab./Kota:</td>
                    <td style="font-weight:600; padding:4px 0; color:#1e293b;">${escapeHtml(nama)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap;">Provinsi:</td>
                    <td style="font-weight:600; padding:4px 0; color:#1e293b;">Daerah Istimewa Yogyakarta</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap;">Koordinat:</td>
                    <td style="font-family:monospace; padding:4px 0; color:#475569; font-size:11.5px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</td>
                  </tr>
                </table>
              </div>
            `)
            .openOn(liveMap);

          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
              headers: { 'Accept-Language': 'id' }
            });
            if (res.ok) {
              const data = await res.json();
              const displayName = data.display_name || `${nama}, D.I. Yogyakarta`;
              popup.setContent(`
                <div style="min-width:260px; max-width:320px; font-size:12.5px; line-height:1.6; color:#1f2937;">
                  <div style="font-size:15px; font-weight:700; color:#1e3a8a; margin-bottom:8px; display:flex; align-items:center; gap:6px; border-bottom:2px solid #e2e8f0; padding-bottom:5px;">
                    <span>🏛️</span> <span>${escapeHtml(nama)}</span>
                  </div>
                  <div style="margin-bottom:8px; background:#fffbeb; border:1px solid #fef3c7; border-left:4px solid #f59e0b; border-radius:4px; padding:6px 10px;">
                    <div style="font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#b45309; margin-bottom:2px;">
                      📍 Alamat Lengkap
                    </div>
                    <div style="font-size:12.5px; font-weight:600; color:#1e293b; line-height:1.4;">
                      ${escapeHtml(displayName)}
                    </div>
                  </div>
                  <table style="width:100%; border-collapse:collapse; font-size:12px;">
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap;">Kab./Kota:</td>
                      <td style="font-weight:600; padding:4px 0; color:#1e293b;">${escapeHtml(nama)}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap;">Provinsi:</td>
                      <td style="font-weight:600; padding:4px 0; color:#1e293b;">Daerah Istimewa Yogyakarta</td>
                    </tr>
                    <tr>
                      <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap;">Koordinat:</td>
                      <td style="font-family:monospace; padding:4px 0; color:#475569; font-size:11.5px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</td>
                    </tr>
                  </table>
                  <div style="margin-top:8px; text-align:right;">
                    <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" class="btn btn-sm btn-outline-primary" style="font-size:11.5px; padding:2px 8px;">
                      <i class="bi bi-box-arrow-up-right"></i> Google Maps
                    </a>
                  </div>
                </div>
              `);
            }
          } catch (err) {}
        });
      }
    }),
    loadGeoJSON('Batas Kecamatan/Kapanewon', 'data/diy-kecamatan.geojson', layerSrsBatasKecamatan, {
      pane: 'pane_administrasi',
      style: { color: '#374151', weight: 1.3, opacity: 0.85, fill: false },
      onEachFeature: (feature, layer) => {
        const nama = feature.properties?.nama || feature.properties?.kecamatan || feature.properties?.WADMKC || 'Kecamatan';
        const kab = feature.properties?.kab_kota || feature.properties?.WADMKK || '-';
        const isKota = kab.toLowerCase().includes('kota') || kab.toLowerCase().includes('yogyakarta');
        const sebutanKec = isKota ? 'Kemantren' : 'Kapanewon';

        layer.on('click', async (e) => {
          if (!e || !e.latlng) return;
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;

          const popup = L.popup({ maxWidth: 340 })
            .setLatLng(e.latlng)
            .setContent(`
              <div style="min-width:260px; max-width:320px; font-size:12.5px; line-height:1.6; color:#1f2937;">
                <div style="font-size:15px; font-weight:700; color:#1e293b; margin-bottom:8px; display:flex; align-items:center; gap:6px; border-bottom:2px solid #e2e8f0; padding-bottom:5px;">
                  <span>🗺️</span> <span>${escapeHtml(sebutanKec)} ${escapeHtml(nama)}</span>
                </div>
                <div style="margin-bottom:8px; background:#fffbeb; border:1px solid #fef3c7; border-left:4px solid #f59e0b; border-radius:4px; padding:6px 10px;">
                  <div style="font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#b45309; margin-bottom:2px;">
                    📍 Alamat Lengkap
                  </div>
                  <div style="font-size:12.5px; font-weight:600; color:#1e293b; line-height:1.4;">
                    <i class="bi bi-hourglass-split"></i> Mengambil alamat lengkap...
                  </div>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                  <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap;">${escapeHtml(sebutanKec)}:</td>
                    <td style="font-weight:600; padding:4px 0; color:#1e293b;">${escapeHtml(nama)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap;">Kab./Kota:</td>
                    <td style="font-weight:600; padding:4px 0; color:#1e293b;">${escapeHtml(kab)}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap;">Koordinat:</td>
                    <td style="font-family:monospace; padding:4px 0; color:#475569; font-size:11.5px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</td>
                  </tr>
                </table>
              </div>
            `)
            .openOn(liveMap);

          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
              headers: { 'Accept-Language': 'id' }
            });
            if (res.ok) {
              const data = await res.json();
              const displayName = data.display_name || `${nama}, ${kab}`;
              popup.setContent(`
                <div style="min-width:260px; max-width:320px; font-size:12.5px; line-height:1.6; color:#1f2937;">
                  <div style="font-size:15px; font-weight:700; color:#1e293b; margin-bottom:8px; display:flex; align-items:center; gap:6px; border-bottom:2px solid #e2e8f0; padding-bottom:5px;">
                    <span>🗺️</span> <span>${escapeHtml(sebutanKec)} ${escapeHtml(nama)}</span>
                  </div>
                  <div style="margin-bottom:8px; background:#fffbeb; border:1px solid #fef3c7; border-left:4px solid #f59e0b; border-radius:4px; padding:6px 10px;">
                    <div style="font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#b45309; margin-bottom:2px;">
                      📍 Alamat Lengkap
                    </div>
                    <div style="font-size:12.5px; font-weight:600; color:#1e293b; line-height:1.4;">
                      ${escapeHtml(displayName)}
                    </div>
                  </div>
                  <table style="width:100%; border-collapse:collapse; font-size:12px;">
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap;">${escapeHtml(sebutanKec)}:</td>
                      <td style="font-weight:600; padding:4px 0; color:#1e293b;">${escapeHtml(nama)}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap;">Kab./Kota:</td>
                      <td style="font-weight:600; padding:4px 0; color:#1e293b;">${escapeHtml(kab)}</td>
                    </tr>
                    <tr>
                      <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap;">Koordinat:</td>
                      <td style="font-family:monospace; padding:4px 0; color:#475569; font-size:11.5px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</td>
                    </tr>
                  </table>
                  <div style="margin-top:8px; text-align:right;">
                    <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" class="btn btn-sm btn-outline-primary" style="font-size:11.5px; padding:2px 8px;">
                      <i class="bi bi-box-arrow-up-right"></i> Google Maps
                    </a>
                  </div>
                </div>
              `);
            }
          } catch (err) {}
        });
      }
    }),
    loadGeoJSON('Batas Kelurahan/Desa', 'data/diy-desa-batas.geojson', layerSrsBatasDesa, {
      pane: 'pane_administrasi',
      style: { color: '#64748b', weight: 0.9, opacity: 0.8, fill: false, dashArray: '3, 3' },
      onEachFeature: (feature, layer) => {
        const ket = feature.properties?.Keterangan || feature.properties?.Batas || 'Batas Kelurahan/Desa';

        layer.on('click', async (e) => {
          if (!e || !e.latlng) return;
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;

          const popup = L.popup({ maxWidth: 340 })
            .setLatLng(e.latlng)
            .setContent(`
              <div style="min-width:260px; max-width:320px; font-size:12.5px; line-height:1.6; color:#1f2937;">
                <div style="font-size:15px; font-weight:700; color:#0f172a; margin-bottom:8px; display:flex; align-items:center; gap:6px; border-bottom:2px solid #e2e8f0; padding-bottom:5px;">
                  <span>🏡</span> <span>${escapeHtml(ket)}</span>
                </div>
                <div style="margin-bottom:8px; background:#fffbeb; border:1px solid #fef3c7; border-left:4px solid #f59e0b; border-radius:4px; padding:6px 10px;">
                  <div style="font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#b45309; margin-bottom:2px;">
                    📍 Alamat Lengkap
                  </div>
                  <div style="font-size:12.5px; font-weight:600; color:#1e293b; line-height:1.4;">
                    <i class="bi bi-hourglass-split"></i> Mengambil alamat lengkap...
                  </div>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                  <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap;">Keterangan:</td>
                    <td style="font-weight:600; padding:4px 0; color:#1e293b;">${escapeHtml(ket)}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap;">Koordinat:</td>
                    <td style="font-family:monospace; padding:4px 0; color:#475569; font-size:11.5px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</td>
                  </tr>
                </table>
              </div>
            `)
            .openOn(liveMap);

          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
              headers: { 'Accept-Language': 'id' }
            });
            if (res.ok) {
              const data = await res.json();
              const displayName = data.display_name || `${ket}, D.I. Yogyakarta`;
              popup.setContent(`
                <div style="min-width:260px; max-width:320px; font-size:12.5px; line-height:1.6; color:#1f2937;">
                  <div style="font-size:15px; font-weight:700; color:#0f172a; margin-bottom:8px; display:flex; align-items:center; gap:6px; border-bottom:2px solid #e2e8f0; padding-bottom:5px;">
                    <span>🏡</span> <span>${escapeHtml(ket)}</span>
                  </div>
                  <div style="margin-bottom:8px; background:#fffbeb; border:1px solid #fef3c7; border-left:4px solid #f59e0b; border-radius:4px; padding:6px 10px;">
                    <div style="font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#b45309; margin-bottom:2px;">
                      📍 Alamat Lengkap
                    </div>
                    <div style="font-size:12.5px; font-weight:600; color:#1e293b; line-height:1.4;">
                      ${escapeHtml(displayName)}
                    </div>
                  </div>
                  <table style="width:100%; border-collapse:collapse; font-size:12px;">
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap;">Keterangan:</td>
                      <td style="font-weight:600; padding:4px 0; color:#1e293b;">${escapeHtml(ket)}</td>
                    </tr>
                    <tr>
                      <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap;">Koordinat:</td>
                      <td style="font-family:monospace; padding:4px 0; color:#475569; font-size:11.5px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</td>
                    </tr>
                  </table>
                  <div style="margin-top:8px; text-align:right;">
                    <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" class="btn btn-sm btn-outline-primary" style="font-size:11.5px; padding:2px 8px;">
                      <i class="bi bi-box-arrow-up-right"></i> Google Maps
                    </a>
                  </div>
                </div>
              `);
            }
          } catch (err) {}
        });
      }
    }),
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
  const isSrsPresentation = mode === 'srs' || mode === 'area-srs' || mode === 'jangkauan' || mode === 'live-damkar';
  if (tilePane) tilePane.style.opacity = isSrsPresentation ? '0.2' : '1';

  const fullSrsLayers = [
    'srs-base',
    'area-srs',
    'risiko',
    'province-diy',
    'provinsi',
    'kabupaten',
    'kecamatan',
    'desa',
    'pos-eksisting',
    'jangkauan-eksisting',
    'pos-rencana',
    'jangkauan-rencana',
    'cagar-budaya'
  ];

  const modeLayers = {
    srs: fullSrsLayers,
    'area-srs': fullSrsLayers,
    jangkauan: fullSrsLayers,
    'live-damkar': [...fullSrsLayers, 'laporan-aktif'],
    risiko: ['risiko', 'province-diy', 'kabupaten', 'kecamatan', 'desa', 'jalan'],
    'risiko-cagar': ['province-diy', 'kabupaten', 'jalan', 'pos-eksisting', 'jangkauan-eksisting', 'cagar-budaya', 'laporan-aktif'],
    skenario: ['province-diy', 'kabupaten', 'jalan', 'pos-eksisting', 'jangkauan-eksisting', 'pos-rencana', 'jangkauan-rencana', 'laporan-aktif'],
    dasar: ['province-diy', 'kabupaten', 'jalan', 'laporan-aktif'],
    'wmk-cagar': ['province-diy', 'kabupaten', 'pos-eksisting', 'jangkauan-eksisting', 'cagar-budaya', 'laporan-aktif'],
    wmk: ['province-diy', 'kabupaten', 'pos-eksisting', 'jangkauan-eksisting', 'pos-rencana', 'jangkauan-rencana', 'laporan-aktif'],
    'pos-damkar': ['province-diy', 'kabupaten', 'pos-eksisting', 'jangkauan-eksisting', 'pos-rencana', 'jangkauan-rencana', 'laporan-aktif']
  };
  const active = new Set(modeLayers[mode] || fullSrsLayers);

  Object.entries(panelLayers()).forEach(([name, layer]) => {
    const visible = active.has(name);
    setLayerVisible(layer, visible);
    setCheckbox(`cb-${name}`, visible);
  });

  const srsCheckbox = document.getElementById('cb-area-srs');
  if (srsCheckbox) {
    srsCheckbox.disabled = false;
    srsCheckbox.checked = active.has('area-srs');
  }

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
    applyRiskHatchToLayers();
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
        applyRiskHatchToLayers();
      }
      logMap(checkbox.checked ? 'Layer ON' : 'Layer OFF', name);
      updateDynamicLegend();
      return;
    }
    if (name === 'area-srs') {
      setLayerVisible(layerAreaSRS, checkbox.checked);
      setLayerVisible(layerSrsBase, checkbox.checked);
      applyRiskHatchToLayers();
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
    applyAdminMapMode(document.getElementById('map-mode-selector')?.value || 'srs');
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