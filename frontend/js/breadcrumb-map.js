/* ============================================================
   BREADCRUMB INTERAKTIF & PETA ZONA
   ============================================================ */

// Data Master Zona/Kabupaten dengan Warna & Informasi
const zoneData = {
  kabupaten: [
    {
      id: 'sleman',
      nama: 'Kabupaten Sleman',
      warna: '#7FB3D5',
      rgb: 'rgb(127, 179, 213)',
      deskripsi: 'Kabupaten dengan luas terbesar di DIY',
      statistik: { laporan: 342, risiko: 'Tinggi', pos: 15 },
      koordinat: { lat: -7.6500, lng: 110.4000 },
      batas: [[[-7.5, 110.2], [-7.5, 110.6], [-7.8, 110.6], [-7.8, 110.2], [-7.5, 110.2]]]
    },
    {
      id: 'bantul',
      nama: 'Kabupaten Bantul',
      warna: '#E8A87C',
      rgb: 'rgb(232, 168, 124)',
      deskripsi: 'Kabupaten di bagian selatan DIY',
      statistik: { laporan: 278, risiko: 'Sedang', pos: 12 },
      koordinat: { lat: -7.9000, lng: 110.3500 },
      batas: [[[-7.7, 110.1], [-7.7, 110.6], [-8.1, 110.6], [-8.1, 110.1], [-7.7, 110.1]]]
    },
    {
      id: 'gunungkidul',
      nama: 'Kabupaten Gunungkidul',
      warna: '#B4A7D6',
      rgb: 'rgb(180, 167, 214)',
      deskripsi: 'Kabupaten dengan topografi berbukit',
      statistik: { laporan: 156, risiko: 'Sedang', pos: 8 },
      koordinat: { lat: -8.1000, lng: 110.6000 },
      batas: [[[-7.9, 110.4], [-7.9, 111.0], [-8.3, 111.0], [-8.3, 110.4], [-7.9, 110.4]]]
    },
    {
      id: 'kulon-progo',
      nama: 'Kabupaten Kulon Progo',
      warna: '#D5C6E0',
      rgb: 'rgb(213, 198, 224)',
      deskripsi: 'Kabupaten di bagian barat DIY',
      statistik: { laporan: 124, risiko: 'Rendah-Sedang', pos: 10 },
      koordinat: { lat: -7.8000, lng: 110.0500 },
      batas: [[[-7.6, 109.7], [-7.6, 110.4], [-8.0, 110.4], [-8.0, 109.7], [-7.6, 109.7]]]
    },
    {
      id: 'yogyakarta',
      nama: 'Kota Yogyakarta',
      warna: '#F4D4AE',
      rgb: 'rgb(244, 212, 174)',
      deskripsi: 'Kota pusat administratif DIY',
      statistik: { laporan: 89, risiko: 'Rendah', pos: 5 },
      koordinat: { lat: -7.7975, lng: 110.3688 },
      batas: [[[-7.65, 110.25], [-7.65, 110.50], [-7.95, 110.50], [-7.95, 110.25], [-7.65, 110.25]]]
    }
  ],
  risiko_kebakaran: [
    {
      id: 'risiko-0',
      nama: 'Risiko 0 - Tidak Ada',
      warna: '#FFFFCC',
      rgb: 'rgb(255, 255, 204)',
      deskripsi: 'Area dengan tingkat risiko kebakaran sangat rendah',
      level: 0
    },
    {
      id: 'risiko-1-4',
      nama: 'Risiko 1-4 - Rendah',
      warna: '#C6FFB3',
      rgb: 'rgb(198, 255, 179)',
      deskripsi: 'Area dengan tingkat risiko kebakaran rendah',
      level: '1-4'
    },
    {
      id: 'risiko-5-9',
      nama: 'Risiko 5-9 - Sedang',
      warna: '#FF9966',
      rgb: 'rgb(255, 153, 102)',
      deskripsi: 'Area dengan tingkat risiko kebakaran sedang',
      level: '5-9'
    },
    {
      id: 'risiko-10-14',
      nama: 'Risiko 10-14 - Tinggi',
      warna: '#FF6666',
      rgb: 'rgb(255, 102, 102)',
      deskripsi: 'Area dengan tingkat risiko kebakaran tinggi',
      level: '10-14'
    },
    {
      id: 'risiko-15-24',
      nama: 'Risiko 15-24 - Sangat Tinggi',
      warna: '#CC3300',
      rgb: 'rgb(204, 51, 0)',
      deskripsi: 'Area dengan tingkat risiko kebakaran sangat tinggi',
      level: '15-24'
    },
    {
      id: 'risiko-24plus',
      nama: 'Risiko 24+ - Ekstrim',
      warna: '#660000',
      rgb: 'rgb(102, 0, 0)',
      deskripsi: 'Area dengan tingkat risiko kebakaran ekstrim',
      level: '24+'
    }
  ],
  wmk: [
    {
      id: 'wmk-utama',
      nama: 'WMK Utama - Prioritas Tinggi',
      warna: '#FF0000',
      rgb: 'rgb(255, 0, 0)',
      deskripsi: 'Wilayah Manajemen Kebakaran dengan prioritas penanganan tertinggi',
      level: 'Utama'
    },
    {
      id: 'wmk-pendukung',
      nama: 'WMK Pendukung - Prioritas Sedang',
      warna: '#FF9900',
      rgb: 'rgb(255, 153, 0)',
      deskripsi: 'Wilayah Manajemen Kebakaran dengan prioritas pendukung',
      level: 'Pendukung'
    },
    {
      id: 'wmk-pengamatan',
      nama: 'WMK Pengamatan - Prioritas Rendah',
      warna: '#FFFF00',
      rgb: 'rgb(255, 255, 0)',
      deskripsi: 'Wilayah Manajemen Kebakaran untuk pengamatan rutin',
      level: 'Pengamatan'
    }
  ],
  infrastruktur: [
    {
      id: 'tangki-air',
      nama: 'Pos Tangki Air',
      warna: '#0099FF',
      rgb: 'rgb(0, 153, 255)',
      ikon: '🚿',
      deskripsi: 'Lokasi tangki air untuk penanganan kebakaran',
      statistik: { jumlah: 42, lokasi: 'Tersebar di seluruh DIY' }
    },
    {
      id: 'pos-damkar',
      nama: 'Pos Damkar Operasional',
      warna: '#FF0000',
      rgb: 'rgb(255, 0, 0)',
      ikon: '🚒',
      deskripsi: 'Lokasi pos damkar untuk respons cepat',
      statistik: { jumlah: 50, lokasi: 'Tersebar di setiap kecamatan' }
    },
    {
      id: 'cagar-budaya',
      nama: 'Lokasi Cagar Budaya',
      warna: '#9966CC',
      rgb: 'rgb(153, 102, 204)',
      ikon: '🏛️',
      deskripsi: 'Lokasi benda cagar budaya yang perlu perlindungan',
      statistik: { jumlah: 128, lokasi: 'Tersebar di kota dan kabupaten' }
    }
  ]
};

// Breadcrumb Trail State
let breadcrumbTrail = [];
let currentZoneView = null;

// Render Breadcrumb Navigation
function renderBreadcrumb() {
  const container = document.getElementById('breadcrumb-container');
  if (!container) return;

  let html = '<nav class="breadcrumb-nav" aria-label="Breadcrumb">';
  html += '<ol class="breadcrumb-list">';
  
  // Home link
  html += `<li class="breadcrumb-item">
            <a href="#" class="breadcrumb-link" onclick="resetBreadcrumb(event)">
              <i class="bi bi-house-fill"></i> Peta Utama
            </a>
          </li>`;
  
  // Trail items
  breadcrumbTrail.forEach((item, index) => {
    const isLast = index === breadcrumbTrail.length - 1;
    html += `<li class="breadcrumb-item ${isLast ? 'active' : ''}">
              <a href="#" class="breadcrumb-link" onclick="navigateBreadcrumb(${index}, event)" 
                 style="border-color: ${item.warna}; color: ${item.warna};">
                <span class="breadcrumb-dot" style="background-color: ${item.warna};"></span>
                ${escapeHtml(item.nama)}
              </a>
            </li>`;
  });

  html += '</ol></nav>';
  container.innerHTML = html;
}

// Render Zone Grid/Buttons
function renderZoneButtons(category) {
  const container = document.getElementById('zone-grid');
  if (!container) return;

  const zones = zoneData[category] || [];
  let html = '<div class="zone-grid">';

  zones.forEach((zone) => {
    html += `
      <div class="zone-card" style="border-left: 4px solid ${zone.warna}" onclick="selectZone('${category}', '${zone.id}')">
        <div class="zone-card-header" style="background-color: ${zone.warna}; opacity: 0.1;">
          <span class="zone-color-dot" style="background-color: ${zone.warna};"></span>
          <h4 class="zone-name">${escapeHtml(zone.nama)}</h4>
        </div>
        <div class="zone-card-body">
          <p class="zone-desc">${escapeHtml(zone.deskripsi || '')}</p>
          ${zone.statistik ? `
            <div class="zone-stats">
              ${zone.statistik.laporan ? `<div class="stat-item"><span class="stat-label">Laporan:</span> <strong>${zone.statistik.laporan}</strong></div>` : ''}
              ${zone.statistik.risiko ? `<div class="stat-item"><span class="stat-label">Risiko:</span> <strong>${zone.statistik.risiko}</strong></div>` : ''}
              ${zone.statistik.pos ? `<div class="stat-item"><span class="stat-label">Pos:</span> <strong>${zone.statistik.pos}</strong></div>` : ''}
              ${zone.level ? `<div class="stat-item"><span class="stat-label">Level:</span> <strong>${zone.level}</strong></div>` : ''}
            </div>
          ` : ''}
        </div>
        <div class="zone-card-footer">
          <button class="btn btn-sm btn-outline-danger" onclick="viewZoneDetail('${category}', '${zone.id}')">
            <i class="bi bi-map-fill"></i> Lihat Detail
          </button>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

// Select Zone dan Update Breadcrumb
function selectZone(category, zoneId) {
  const zone = zoneData[category].find(z => z.id === zoneId);
  if (!zone) return;

  breadcrumbTrail = [{ ...zone, category }];
  currentZoneView = { category, zoneId, zone };
  
  renderBreadcrumb();
  renderZoneDetail(zone);
}

// View Zone Detail
function viewZoneDetail(category, zoneId) {
  selectZone(category, zoneId);
}

// Render Zone Detail Panel
function renderZoneDetail(zone) {
  const detailPanel = document.getElementById('zone-detail-panel');
  if (!detailPanel) return;

  let html = `
    <div class="zone-detail-content">
      <div class="detail-header" style="background: linear-gradient(135deg, ${zone.warna} 0%, ${adjustColor(zone.warna, -20)} 100%);">
        <h2 class="detail-title">${escapeHtml(zone.nama)}</h2>
        <p class="detail-subtitle">${escapeHtml(zone.deskripsi || '')}</p>
      </div>
      
      <div class="detail-body">
        <div class="detail-info-grid">
          <div class="info-card">
            <div class="info-label">Kode Warna</div>
            <div class="info-value">
              <div class="color-swatch" style="background-color: ${zone.warna};"></div>
              <code>${zone.warna}</code>
            </div>
          </div>
  `;

  if (zone.statistik) {
    html += `
      <div class="info-card">
        <div class="info-label">Statistik</div>
        <div class="info-value">
          <ul class="stats-list">
            ${zone.statistik.laporan ? `<li>Laporan: <strong>${zone.statistik.laporan}</strong></li>` : ''}
            ${zone.statistik.risiko ? `<li>Tingkat Risiko: <strong>${zone.statistik.risiko}</strong></li>` : ''}
            ${zone.statistik.pos ? `<li>Jumlah Pos: <strong>${zone.statistik.pos}</strong></li>` : ''}
          </ul>
        </div>
      </div>
    `;
  }

  if (zone.koordinat) {
    html += `
      <div class="info-card">
        <div class="info-label">Koordinat Pusat</div>
        <div class="info-value">
          <div class="coord-display">
            <span>Lat: <strong>${zone.koordinat.lat.toFixed(4)}</strong></span>
            <span>Lng: <strong>${zone.koordinat.lng.toFixed(4)}</strong></span>
          </div>
        </div>
      </div>
    `;
  }

  html += `
        </div>
        
        <div class="detail-actions mt-3">
          <button class="btn btn-danger btn-sm" onclick="showZoneOnMap('${zone.id}')">
            <i class="bi bi-map-fill"></i> Tampilkan di Peta
          </button>
          <button class="btn btn-outline-secondary btn-sm" onclick="exportZoneData('${zone.id}')">
            <i class="bi bi-download"></i> Export Data
          </button>
          <button class="btn btn-outline-secondary btn-sm" onclick="resetBreadcrumb()">
            <i class="bi bi-arrow-left"></i> Kembali
          </button>
        </div>
      </div>
    </div>
  `;

  detailPanel.innerHTML = html;
}

// Navigate Breadcrumb
function navigateBreadcrumb(index, event) {
  if (event) event.preventDefault();
  
  if (index < 0) {
    resetBreadcrumb();
    return;
  }

  breadcrumbTrail = breadcrumbTrail.slice(0, index + 1);
  const current = breadcrumbTrail[breadcrumbTrail.length - 1];
  currentZoneView = { category: current.category, zoneId: current.id, zone: current };
  
  renderBreadcrumb();
  renderZoneDetail(current);
}

// Reset Breadcrumb
function resetBreadcrumb(event) {
  if (event) event.preventDefault();
  
  breadcrumbTrail = [];
  currentZoneView = null;
  renderBreadcrumb();
  renderZoneCategoryMenu();
}

// Render Category Menu
function renderZoneCategoryMenu() {
  const container = document.getElementById('zone-grid');
  if (!container) return;

  const categories = [
    { key: 'kabupaten', nama: 'Kabupaten & Kota', ikon: 'geo-alt-fill', warna: '#FF6B6B' },
    { key: 'risiko_kebakaran', nama: 'Risiko Kebakaran', ikon: 'fire', warna: '#FFA500' },
    { key: 'wmk', nama: 'WMK Prioritas', ikon: 'shield-fill-check', warna: '#4ECDC4' },
    { key: 'infrastruktur', nama: 'Infrastruktur & Pos', ikon: 'buildings', warna: '#45B7D1' }
  ];

  let html = '<div class="category-menu">';
  
  categories.forEach((cat) => {
    html += `
      <div class="category-card" style="border-top: 3px solid ${cat.warna};" 
           onclick="renderZoneButtons('${cat.key}')">
        <div class="category-icon" style="background-color: ${cat.warna}; opacity: 0.1;">
          <i class="bi bi-${cat.ikon}" style="color: ${cat.warna};"></i>
        </div>
        <h5 class="category-title">${cat.nama}</h5>
        <p class="category-count">${zoneData[cat.key].length} item</p>
        <button class="btn btn-link btn-sm text-decoration-none">
          Buka <i class="bi bi-arrow-right"></i>
        </button>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

// Show Zone on Map
function showZoneOnMap(zoneId) {
  Swal.fire({
    title: 'Menampilkan di Peta',
    text: `Fitur ini akan menampilkan zone "${zoneId}" di peta utama`,
    icon: 'info',
    confirmButtonText: 'OK',
    confirmButtonColor: '#DC3545'
  });
}

// Export Zone Data
function exportZoneData(zoneId) {
  Swal.fire({
    title: 'Export Data',
    text: `Data untuk zone "${zoneId}" akan diunduh sebagai GeoJSON`,
    icon: 'info',
    confirmButtonText: 'Download',
    confirmButtonColor: '#DC3545'
  });
}

// Helper: Escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Helper: Adjust Color (Lighten/Darken)
function adjustColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  renderBreadcrumb();
  renderZoneCategoryMenu();
});
