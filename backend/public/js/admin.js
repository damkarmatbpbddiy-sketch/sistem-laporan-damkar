/* ============================================================
   ADMIN DASHBOARD & KELOLA LAPORAN JS
   ============================================================ */

let chartStatusInstance = null;
let chartTimelineInstance = null;
let chartMonthlyInstance = null;
let chartDistrictInstance = null;
let chartCountyInstance = null;
let chartFireTypeInstance = null;
let liveMap = null;
let liveMarkersLayer = null;
let completedMarkersLayer = null;
let countyBoundaryLayer = null;
let posDamkarLayer = null;
let diyRegionsLayer = null;
let diyVillagePointsLayer = null;
let bufferDamkarLayer = null;
let pertanianLayer = null;
let filosofisLayer = null;
let tangkiAirLayer = null;
let cagarBudayaLayer = null;
let srsLayer = null;
let currentAdminMapTheme = 'dasar';
let labelLayer = null;
let liveMapBounds = null;
let lastSnapshotReports = [];
let currentFilteredReports = [];
let isInitialReportLoad = true;
let adminAlertAudioContext = null;

function ensureAdminAlarmAudio() {
  if (adminAlertAudioContext) return adminAlertAudioContext;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  adminAlertAudioContext = new AudioCtx();
  return adminAlertAudioContext;
}

function playAdminAlarm() {
  const context = ensureAdminAlarmAudio();
  if (!context) return;

  if (context.state === 'suspended') {
    context.resume().catch(() => {});
  }

  const pulsePattern = [0, 0.34, 0.68, 1.02];
  pulsePattern.forEach((delay, index) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(980 - (index * 90), context.currentTime + delay);
    oscillator.frequency.exponentialRampToValueAtTime(520, context.currentTime + delay + 0.28);
    gainNode.gain.setValueAtTime(0.12, context.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + delay + 0.42);
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(context.currentTime + delay);
    oscillator.stop(context.currentTime + delay + 0.42);
  });
}

function notifyAdminOfNewReport(report) {
  playAdminAlarm();

  const title = report.judul_kejadian || 'Laporan Baru';
  const subtitle = report.alamat || 'Lokasi belum tersedia';
  const statusText = report.status || 'Menunggu';

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Laporan Baru Masuk', {
      body: `${title} • ${statusText} • ${subtitle}`,
      icon: 'assets/images/LOGO-DAMKAR.png'
    });
  }

  // Auto Focus Logic
  const autoFocusCb = document.getElementById('cb-auto-focus');
  if (autoFocusCb && autoFocusCb.checked && typeof liveMap !== 'undefined' && report.latitude && report.longitude) {
      liveMap.flyTo([report.latitude, report.longitude], 15);
  }
}

function updateGoogleCameraFrame(lat, lng, title = 'Laporan Kebakaran') {
  const cameraTitle = document.getElementById('google-camera-title');
  const cameraCoords = document.getElementById('google-camera-coords');
  const cameraFrame = document.getElementById('google-camera-frame');
  if (!cameraFrame || !cameraTitle || !cameraCoords) return;

  const coordText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  cameraTitle.textContent = `Kamera Google: ${title}`;
  cameraCoords.textContent = coordText;
  cameraFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&layer=c&cbll=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&cbp=11,0,0,0,0&output=embed`;
}

function resetGoogleCameraFrame() {
  const cameraFrame = document.getElementById('google-camera-frame');
  const cameraTitle = document.getElementById('google-camera-title');
  const cameraCoords = document.getElementById('google-camera-coords');
  if (!cameraFrame || !cameraTitle || !cameraCoords) return;

  cameraTitle.textContent = 'Kamera Google Lokasi Default';
  cameraCoords.textContent = '-';
  cameraFrame.src = 'https://www.google.com/maps?q=-7.7978,110.3688&layer=c&cbll=-7.7978,110.3688&cbp=11,0,0,0,0&output=embed';
}

function handleIncomingReportNotifications(reports) {
  if (!Array.isArray(reports)) return;

  // On first load, record existing reports snapshot WITHOUT playing sound!
  if (isInitialReportLoad) {
    lastSnapshotReports = reports;
    isInitialReportLoad = false;
    return;
  }

  const currentIds = new Set(reports.map((report) => report.id));
  const previousIds = new Set(lastSnapshotReports.map((report) => report.id));

  const newReports = reports.filter((report) => !previousIds.has(report.id));
  const changedReports = reports.filter((report) => previousIds.has(report.id) && lastSnapshotReports.find((prev) => prev.id === report.id)?.status !== report.status);

  if (newReports.length > 0) {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // ONLY trigger sound alarm for newly submitted incoming reports
    newReports.forEach((report) => {
      if (report.status !== 'Selesai') {
        notifyAdminOfNewReport(report);
      }
    });
  }

  if (changedReports.length > 0) {
    const changed = changedReports[0];
    if (changed) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: `Status diperbarui: ${escapeHtml(changed.status || 'Menunggu')}`,
        showConfirmButton: false,
        timer: 2400,
        timerProgressBar: true
      });
    }
  }

  lastSnapshotReports = reports;
}

let currentAdminTab = 'laporan';

function switchAdminTab(tabName) {
  currentAdminTab = tabName;
  const viewLaporan = document.getElementById('view-laporan-kebakaran');
  const viewArsip = document.getElementById('view-arsip-operasional');
  const btnLaporan = document.getElementById('tab-btn-laporan');
  const btnArsip = document.getElementById('tab-btn-arsip');

  if (tabName === 'arsip') {
    if (viewLaporan) viewLaporan.classList.add('d-none');
    if (viewArsip) viewArsip.classList.remove('d-none');

    if (btnLaporan) {
      btnLaporan.classList.remove('active', 'btn-danger', 'text-white');
      btnLaporan.classList.add('btn-outline-danger');
    }
    if (btnArsip) {
      btnArsip.classList.add('active', 'btn-danger', 'text-white');
      btnArsip.classList.remove('btn-outline-danger');
    }

    fetchArsipStatistik();
    fetchArsipData();
  } else {
    if (viewArsip) viewArsip.classList.add('d-none');
    if (viewLaporan) viewLaporan.classList.remove('d-none');

    if (btnArsip) {
      btnArsip.classList.remove('active', 'btn-danger', 'text-white');
      btnArsip.classList.add('btn-outline-danger');
    }
    if (btnLaporan) {
      btnLaporan.classList.add('active', 'btn-danger', 'text-white');
      btnLaporan.classList.remove('btn-outline-danger');
    }
  }
}

// Cegah browser membuka link file:/// saat folder atau file diseret ke jendela aplikasi
window.addEventListener('dragover', function(e) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
}, false);

window.addEventListener('drop', function(e) {
  e.preventDefault();
  if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
    const modalEl = document.getElementById('modalBatchFolder');
    if (modalEl && !modalEl.classList.contains('show')) {
      openBatchFolderModal();
    }
    handleDroppedFilesOrFolders(e.dataTransfer);
  }
}, false);

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  initCharts();
  initLiveMap();
  fetchAdminData();
  fetchMasterData();
  fetchArsipData();
  fetchArsipStatistik();
  initArsipFormAndDropzone();
  initExplorerDragAndDrop();
  initArsipStatistikControls();
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      fetchAdminData();
    }
  }, 15000);

  // Filter Event Listeners Laporan
  const filterSearch = document.getElementById('filter-search');
  const filterStatus = document.getElementById('filter-status');
  const filterKabupaten = document.getElementById('filter-kabupaten');
  const filterKecamatan = document.getElementById('filter-kecamatan');
  const filterJenis = document.getElementById('filter-jenis');
  const filterStartDate = document.getElementById('filter-start-date');
  const filterEndDate = document.getElementById('filter-end-date');
  const btnResetFilter = document.getElementById('btn-reset-filter');
  const btnDownloadLaporan = document.getElementById('btn-download-laporan');

  let debounceTimer;
  if (filterSearch) {
    filterSearch.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchAdminData, 300);
    });
  }

  if (filterStatus) filterStatus.addEventListener('change', fetchAdminData);
  if (filterKabupaten) filterKabupaten.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(fetchAdminData, 300); });
  if (filterKecamatan) filterKecamatan.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(fetchAdminData, 300); });
  if (filterJenis) filterJenis.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(fetchAdminData, 300); });
  if (filterStartDate) filterStartDate.addEventListener('change', fetchAdminData);
  if (filterEndDate) filterEndDate.addEventListener('change', fetchAdminData);

  if (btnResetFilter) {
    btnResetFilter.addEventListener('click', () => {
      filterSearch.value = '';
      filterStatus.value = 'Semua';
      filterKabupaten.value = '';
      filterKecamatan.value = '';
      filterJenis.value = '';
      filterStartDate.value = '';
      filterEndDate.value = '';
      fetchAdminData();
    });
  }

  if (btnDownloadLaporan) {
    btnDownloadLaporan.addEventListener('click', downloadFilteredReports);
  }

  // Filter Event Listeners Arsip Data
  const filterArsipSearch = document.getElementById('filter-arsip-search');
  const filterArsipKategori = document.getElementById('filter-arsip-kategori');
  const btnResetFilterArsip = document.getElementById('btn-reset-filter-arsip');
  let arsipDebounceTimer;

  if (filterArsipSearch) {
    filterArsipSearch.addEventListener('input', () => {
      clearTimeout(arsipDebounceTimer);
      arsipDebounceTimer = setTimeout(fetchArsipData, 300);
    });
  }

  if (filterArsipKategori) {
    filterArsipKategori.addEventListener('change', () => {
      const statDivisiSelect = document.getElementById('stat-filter-divisi');
      if (statDivisiSelect && statDivisiSelect.value !== filterArsipKategori.value) {
        statDivisiSelect.value = filterArsipKategori.value;
      }
      fetchArsipData();
      fetchArsipStatistik();
    });
  }

  if (btnResetFilterArsip) {
    btnResetFilterArsip.addEventListener('click', () => {
      if (filterArsipSearch) filterArsipSearch.value = '';
      if (filterArsipKategori) filterArsipKategori.value = 'Semua';
      const statDivisiSelect = document.getElementById('stat-filter-divisi');
      if (statDivisiSelect) statDivisiSelect.value = 'Semua';
      clearArsipChartFilter();
      fetchArsipData();
      fetchArsipStatistik();
    });
  }

  // Modal Edit Status Submit Handler
  const btnSaveEditStatus = document.getElementById('btn-save-edit-status');
  if (btnSaveEditStatus) {
    btnSaveEditStatus.addEventListener('click', saveReportStatus);
  }

  const btnSaveMaster = document.getElementById('btn-save-master');
  if (btnSaveMaster) {
    btnSaveMaster.addEventListener('click', saveMasterData);
  }

  const btnResetGoogleCamera = document.getElementById('btn-reset-google-camera');
  if (btnResetGoogleCamera) {
    btnResetGoogleCamera.addEventListener('click', resetGoogleCameraFrame);
  }
});

// Initialize Chart.js Instances
function initCharts() {
  const ctxStatus = document.getElementById('chart-status');
  const ctxTimeline = document.getElementById('chart-timeline');
  const ctxMonthly = document.getElementById('chart-monthly');
  const ctxDistrict = document.getElementById('chart-district');
  const ctxCounty = document.getElementById('chart-county');
  const ctxFireType = document.getElementById('chart-fire-type');

  if (ctxStatus) {
    chartStatusInstance = new Chart(ctxStatus, {
      type: 'doughnut',
      data: {
        labels: ['Menunggu', 'Diproses', 'Selesai'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: ['#f59e0b', '#06b6d4', '#10b981'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  if (ctxTimeline) {
    chartTimelineInstance = new Chart(ctxTimeline, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Jumlah Laporan',
          data: [],
          backgroundColor: '#dc2626',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  if (ctxMonthly) {
    chartMonthlyInstance = new Chart(ctxMonthly, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Laporan per bulan',
          data: [],
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220, 38, 38, 0.15)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  if (ctxDistrict) {
    chartDistrictInstance = new Chart(ctxDistrict, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Jumlah per kecamatan',
          data: [],
          backgroundColor: '#0ea5e9'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  if (ctxCounty) {
    chartCountyInstance = new Chart(ctxCounty, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Jumlah per kabupaten',
          data: [],
          backgroundColor: '#f59e0b'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  if (ctxFireType) {
    chartFireTypeInstance = new Chart(ctxFireType, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: ['#dc2626', '#f59e0b', '#06b6d4', '#10b981', '#7c3aed', '#0f766e']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

function utm49SouthToWgs84(easting, northing) {
  const a = 6378137.0;
  const eccSquared = 0.00669438;
  const k0 = 0.9996;
  const x = Number(easting) - 500000;
  const y = Number(northing) - 10000000;
  const eccPrimeSquared = eccSquared / (1 - eccSquared);
  const M = y / k0;
  const mu = M / (a * (1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64 - 5 * Math.pow(eccSquared, 3) / 256));
  const e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));
  const J1 = 3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32;
  const J2 = 21 * Math.pow(e1, 2) / 16 - 55 * Math.pow(e1, 4) / 32;
  const J3 = 151 * Math.pow(e1, 3) / 96;
  const J4 = 1097 * Math.pow(e1, 4) / 512;
  const fp = mu + J1 * Math.sin(2 * mu) + J2 * Math.sin(4 * mu) + J3 * Math.sin(6 * mu) + J4 * Math.sin(8 * mu);
  const sinFp = Math.sin(fp);
  const cosFp = Math.cos(fp);
  const tanFp = Math.tan(fp);
  const C1 = eccPrimeSquared * Math.pow(cosFp, 2);
  const T1 = Math.pow(tanFp, 2);
  const N1 = a / Math.sqrt(1 - eccSquared * Math.pow(sinFp, 2));
  const R1 = a * (1 - eccSquared) / Math.pow(1 - eccSquared * Math.pow(sinFp, 2), 1.5);
  const D = x / (N1 * k0);
  const lat = fp - (N1 * tanFp / R1) * (Math.pow(D, 2) / 2 - (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * eccPrimeSquared) * Math.pow(D, 4) / 24 + (61 + 90 * T1 + 298 * C1 + 45 * Math.pow(T1, 2) - 252 * eccPrimeSquared - 3 * Math.pow(C1, 2)) * Math.pow(D, 6) / 720);
  const lon = (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 + (5 - 2 * C1 + 28 * T1 - 3 * Math.pow(C1, 2) + 8 * eccPrimeSquared + 24 * Math.pow(T1, 2)) * Math.pow(D, 5) / 120) / cosFp;
  return { lat: lat * 180 / Math.PI, lng: 111 + (lon * 180 / Math.PI) };
}

function convertGeometry(geometry) {
  if (!geometry) return geometry;
  if (geometry.type === 'GeometryCollection') {
    return {
      ...geometry,
      geometries: (geometry.geometries || []).map(convertGeometry)
    };
  }
  function convertCoordinates(coords) {
    if (Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const res = utm49SouthToWgs84(coords[0], coords[1]);
      return [res.lng, res.lat];
    }
    return coords.map(convertCoordinates);
  }
  return { ...geometry, coordinates: convertCoordinates(geometry.coordinates) };
}

function convertUtmGeoJSON(data) {
  if (!data || data.type !== 'FeatureCollection') return data;
  return {
    type: 'FeatureCollection',
    features: data.features.map(f => ({ ...f, geometry: convertGeometry(f.geometry) }))
  };
}

function hasUtmGeoJSONCoordinates(data) {
  let detected = false;
  function inspectCoordinates(coords) {
    if (detected || !Array.isArray(coords)) return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      detected = Math.abs(coords[0]) > 180 || Math.abs(coords[1]) > 90;
      return;
    }
    coords.forEach(inspectCoordinates);
  }
  function inspectGeometry(geometry) {
    if (!geometry) return;
    if (geometry.type === 'GeometryCollection') {
      (geometry.geometries || []).forEach(inspectGeometry);
    } else {
      inspectCoordinates(geometry.coordinates);
    }
  }
  if (data.type === 'FeatureCollection') {
    data.features.forEach(feature => inspectGeometry(feature.geometry));
  } else if (data.type === 'Feature') {
    inspectGeometry(data.geometry);
  } else {
    inspectGeometry(data);
  }
  return detected;
}

function prepareGeoJSONForPreview(data) {
  if (!hasUtmGeoJSONCoordinates(data)) return data;
  if (data.type === 'FeatureCollection') return convertUtmGeoJSON(data);
  if (data.type === 'Feature') return { ...data, geometry: convertGeometry(data.geometry) };
  return convertGeometry(data);
}

function isValidGeoJSONPosition(position) {
  return Array.isArray(position) && position.length >= 2 &&
    Number.isFinite(position[0]) && Number.isFinite(position[1]) &&
    position[0] >= -180 && position[0] <= 180 &&
    position[1] >= -90 && position[1] <= 90;
}

function findFirstValidRawPosition(data) {
  let result = null;
  function inspectCoordinates(coords) {
    if (result || !Array.isArray(coords)) return;
    if (coords.length >= 2 && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
      result = [coords[0], coords[1]];
      return;
    }
    coords.forEach(inspectCoordinates);
  }
  function inspectGeometry(geometry) {
    if (!geometry || result) return;
    if (geometry.type === 'GeometryCollection') {
      (geometry.geometries || []).forEach(inspectGeometry);
    } else {
      inspectCoordinates(geometry.coordinates);
    }
  }
  if (data.type === 'FeatureCollection') {
    (data.features || []).forEach(feature => inspectGeometry(feature && feature.geometry));
  } else if (data.type === 'Feature') {
    inspectGeometry(data.geometry);
  } else {
    inspectGeometry(data);
  }
  return result;
}

function sanitizeGeoJSONForPreview(data) {
  const firstPosition = findFirstValidRawPosition(data);
  const useUtm = firstPosition && !isValidGeoJSONPosition(firstPosition);
  let skippedFeatures = 0;
  let skippedGeometries = 0;

  function sanitizeCoordinates(coords) {
    if (!Array.isArray(coords)) return null;
    if (coords.length >= 2 && typeof coords[0] !== 'object' && typeof coords[1] !== 'object') {
      const rawPosition = [Number(coords[0]), Number(coords[1])];
      if (!Number.isFinite(rawPosition[0]) || !Number.isFinite(rawPosition[1])) return null;
      const position = useUtm ? utm49SouthToWgs84(rawPosition[0], rawPosition[1]) : { lng: rawPosition[0], lat: rawPosition[1] };
      const normalized = [position.lng, position.lat];
      return isValidGeoJSONPosition(normalized) ? normalized : null;
    }
    const children = coords.map(sanitizeCoordinates).filter(Boolean);
    return children.length > 0 ? children : null;
  }

  function sanitizeGeometry(geometry) {
    if (!geometry || typeof geometry !== 'object') return null;
    if (geometry.type === 'GeometryCollection') {
      const geometries = [];
      (geometry.geometries || []).forEach(childGeometry => {
        const sanitizedChild = sanitizeGeometry(childGeometry);
        if (sanitizedChild) geometries.push(sanitizedChild);
        else skippedGeometries += 1;
      });
      if (geometries.length === 0) return null;
      return { ...geometry, geometries };
    }
    const coordinates = sanitizeCoordinates(geometry.coordinates);
    if (!coordinates) return null;
    return { ...geometry, coordinates };
  }

  function sanitizeFeature(feature) {
    if (!feature || feature.type !== 'Feature') return null;
    const geometry = sanitizeGeometry(feature.geometry);
    if (!geometry) return null;
    return { ...feature, geometry };
  }

  if (data.type === 'FeatureCollection') {
    const features = [];
    (data.features || []).forEach(feature => {
      const sanitized = sanitizeFeature(feature);
      if (sanitized) features.push(sanitized);
      else {
        skippedFeatures += 1;
        console.warn('Invalid GeoJSON coordinate or geometry skipped', feature);
      }
    });
    return { data: { ...data, features }, skippedFeatures, skippedGeometries };
  }

  if (data.type === 'Feature') {
    const feature = sanitizeFeature(data);
    if (!feature) skippedFeatures = 1;
    return { data: feature || { type: 'FeatureCollection', features: [] }, skippedFeatures, skippedGeometries };
  }

  const geometry = sanitizeGeometry(data);
  if (!geometry) skippedGeometries = 1;
  return { data: geometry || { type: 'GeometryCollection', geometries: [] }, skippedFeatures, skippedGeometries };
}

async function initLiveMap() {
  const mapContainer = document.getElementById('admin-live-map');
  if (!mapContainer || typeof L === 'undefined') return;

  liveMap = L.map('admin-live-map').setView([-7.7978, 110.3688], 10);
  liveMapBounds = L.latLngBounds();
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(liveMap);

  liveMarkersLayer = L.layerGroup().addTo(liveMap);
  completedMarkersLayer = L.layerGroup().addTo(liveMap);
  labelLayer = L.layerGroup().addTo(liveMap);
  countyBoundaryLayer = L.layerGroup().addTo(liveMap);
  diyRegionsLayer = L.layerGroup().addTo(liveMap);
  diyVillagePointsLayer = L.layerGroup().addTo(liveMap);
  posDamkarLayer = L.layerGroup().addTo(liveMap);
  bufferDamkarLayer = L.layerGroup();
  pertanianLayer = L.layerGroup();
  filosofisLayer = L.layerGroup();
  tangkiAirLayer = L.layerGroup();
  cagarBudayaLayer = L.layerGroup();
  srsLayer = L.layerGroup();

  if (liveMapBounds && liveMapBounds.isValid()) {
    liveMap.fitBounds(liveMapBounds.pad(0.1));
  } else {
    liveMap.setView([-7.7978, 110.3688], 10);
  }

  setTimeout(() => {
    if (liveMap && typeof liveMap.invalidateSize === 'function') {
      liveMap.invalidateSize();
    }
  }, 250);

  const navContainer = document.getElementById('admin-map-theme-buttons');
  if (navContainer) {
    navContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.admin-map-nav-item');
      if (!btn) return;
      const theme = btn.getAttribute('data-map-theme');
      if (theme) switchAdminMapTheme(theme);
    });
  }

  const layerControl = L.control.layers(null, {
    'Batas Kabupaten': countyBoundaryLayer,
    'Batas Kecamatan (Risiko)': diyRegionsLayer,
    'Titik Desa/Kelurahan': diyVillagePointsLayer,
    'Pos Damkar': posDamkarLayer,
    'Laporan Kejadian': liveMarkersLayer
  }, { collapsed: true, position: 'topright' });
  layerControl.addTo(liveMap);

  renderKabupatenBoundaries();
  renderDiyRegions();
  renderDiyVillagePoints();
  renderPosDamkarMarkers();
  renderSrsLayer();

  // Klik di peta langsung menampilkan popup detail alamat lengkap
  liveMap.on('click', async (e) => {
    if (!e || !e.latlng) return;
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    const popup = L.popup({ maxWidth: 330 })
      .setLatLng(e.latlng)
      .setContent(`
        <div style="min-width:240px; font-size:12.5px; line-height:1.6; color:#1f2937;">
          <div style="font-size:14px; font-weight:700; color:#b45309; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
            <span>📍</span> <span>Lokasi Dipilih</span>
          </div>
          <div style="color:#64748b; font-size:12px; margin-bottom:6px;">
            <i class="bi bi-hourglass-split"></i> Mengambil alamat lengkap...
          </div>
          <div style="font-size:11.5px; color:#94a3b8; font-family:monospace;">
            Koordinat: ${lat.toFixed(6)}, ${lng.toFixed(6)}
          </div>
        </div>
      `)
      .openOn(liveMap);

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: { 'Accept-Language': 'id' }
      });
      if (res.ok) {
        const data = await res.json();
        const displayName = data.display_name || `Koordinat ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        popup.setContent(`
          <div style="min-width:260px; max-width:320px; font-size:12.5px; line-height:1.6; color:#1f2937;">
            <div style="font-size:14.5px; font-weight:700; color:#0f172a; margin-bottom:8px; display:flex; align-items:center; gap:6px; border-bottom:2px solid #e2e8f0; padding-bottom:4px;">
              <span>📍</span> <span>Detail Alamat Lokasi</span>
            </div>
            <div style="margin-bottom:8px; background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #3b82f6; border-radius:4px; padding:6px 10px;">
              <div style="font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#64748b; margin-bottom:2px;">
                Alamat Lengkap
              </div>
              <div style="font-size:12.5px; font-weight:600; color:#0f172a; line-height:1.4;">
                ${escapeHtml(displayName)}
              </div>
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="color:#64748b; padding:3px 6px 3px 0;">Koordinat:</td>
                <td style="font-family:monospace; padding:3px 0; font-weight:600; color:#334155; font-size:11.5px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</td>
              </tr>
            </table>
            <div style="margin-top:8px; text-align:right;">
              <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" class="btn btn-sm btn-outline-primary" style="font-size:11.5px; padding:2px 8px;">
                <i class="bi bi-box-arrow-up-right"></i> Google Maps
              </a>
            </div>
          </div>
        `);
      } else {
        throw new Error('Reverse geocode gagal');
      }
    } catch (err) {
      popup.setContent(`
        <div style="min-width:240px; font-size:12.5px; line-height:1.6; color:#1f2937;">
          <div style="font-size:14px; font-weight:700; color:#0f172a; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
            <span>📍</span> <span>Lokasi Dipilih</span>
          </div>
          <div style="margin-bottom:6px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:6px 10px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Koordinat Lokasi</div>
            <div style="font-family:monospace; font-weight:600; color:#0f172a;">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
          </div>
          <div style="margin-top:6px; text-align:right;">
            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" class="btn btn-sm btn-outline-primary" style="font-size:11.5px; padding:2px 8px;">
              <i class="bi bi-box-arrow-up-right"></i> Google Maps
            </a>
          </div>
        </div>
      `);
    }
  });
}

function switchAdminMapTheme(theme) {
  if (typeof window.applyAdminMapMode === 'function') {
    window.applyAdminMapMode(theme);
    return;
  }

  currentAdminMapTheme = theme;

  const navItems = document.querySelectorAll('#admin-map-theme-buttons .admin-map-nav-item');
  navItems.forEach((btn) => {
    if (btn.getAttribute('data-map-theme') === theme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (!liveMap) return;

  [countyBoundaryLayer, diyRegionsLayer, diyVillagePointsLayer, posDamkarLayer, liveMarkersLayer, bufferDamkarLayer, pertanianLayer, filosofisLayer, tangkiAirLayer, cagarBudayaLayer, srsLayer].forEach((layer) => {
    if (layer && liveMap.hasLayer(layer)) {
      liveMap.removeLayer(layer);
    }
  });

  switch (theme) {
    case 'dasar':
      if (countyBoundaryLayer) liveMap.addLayer(countyBoundaryLayer);
      if (diyRegionsLayer) liveMap.addLayer(diyRegionsLayer);
      if (diyVillagePointsLayer) liveMap.addLayer(diyVillagePointsLayer);
      if (labelLayer) liveMap.addLayer(labelLayer);
      if (posDamkarLayer) liveMap.addLayer(posDamkarLayer);
      if (liveMarkersLayer) liveMap.addLayer(liveMarkersLayer);
      break;

    case 'kebakaran':
      if (diyRegionsLayer) liveMap.addLayer(diyRegionsLayer);
      if (posDamkarLayer) liveMap.addLayer(posDamkarLayer);
      if (liveMarkersLayer) liveMap.addLayer(liveMarkersLayer);
      break;

    case 'non-kebakaran':
      if (diyRegionsLayer) liveMap.addLayer(diyRegionsLayer);
      if (posDamkarLayer) liveMap.addLayer(posDamkarLayer);
      if (liveMarkersLayer) liveMap.addLayer(liveMarkersLayer);
      break;

    case 'pertanian':
      if (pertanianLayer) liveMap.addLayer(pertanianLayer);
      if (countyBoundaryLayer) liveMap.addLayer(countyBoundaryLayer);
      break;

    case 'wmk':
      if (diyRegionsLayer) liveMap.addLayer(diyRegionsLayer);
      if (posDamkarLayer) liveMap.addLayer(posDamkarLayer);
      if (bufferDamkarLayer) liveMap.addLayer(bufferDamkarLayer);
      break;

    case 'tangki-air':
      if (tangkiAirLayer) liveMap.addLayer(tangkiAirLayer);
      if (posDamkarLayer) liveMap.addLayer(posDamkarLayer);
      if (countyBoundaryLayer) liveMap.addLayer(countyBoundaryLayer);
      break;

    case 'wmk-cagar':
      if (cagarBudayaLayer) liveMap.addLayer(cagarBudayaLayer);
      if (posDamkarLayer) liveMap.addLayer(posDamkarLayer);
      if (countyBoundaryLayer) liveMap.addLayer(countyBoundaryLayer);
      break;

    case 'filosofis':
      if (filosofisLayer) liveMap.addLayer(filosofisLayer);
      if (countyBoundaryLayer) liveMap.addLayer(countyBoundaryLayer);
      break;

    case 'srs':
      if (srsLayer) liveMap.addLayer(srsLayer);
      break;

    case 'batas-kabupaten':
      if (countyBoundaryLayer) liveMap.addLayer(countyBoundaryLayer);
      break;

    case 'batas-kecamatan':
      if (diyRegionsLayer) liveMap.addLayer(diyRegionsLayer);
      if (countyBoundaryLayer) liveMap.addLayer(countyBoundaryLayer);
      break;

    case 'desa':
    case 'titik-desa':
      if (diyVillagePointsLayer) liveMap.addLayer(diyVillagePointsLayer);
      if (countyBoundaryLayer) liveMap.addLayer(countyBoundaryLayer);
      break;

    case 'pos-damkar':
      if (posDamkarLayer) liveMap.addLayer(posDamkarLayer);
      if (bufferDamkarLayer) liveMap.addLayer(bufferDamkarLayer);
      if (countyBoundaryLayer) liveMap.addLayer(countyBoundaryLayer);
      break;

    default:
      if (countyBoundaryLayer) liveMap.addLayer(countyBoundaryLayer);
      if (diyRegionsLayer) liveMap.addLayer(diyRegionsLayer);
      if (liveMarkersLayer) liveMap.addLayer(liveMarkersLayer);
      break;
  }

  updateAdminMapLegend(theme);
}

function updateAdminMapLegend(theme) {
  const legendBox = document.getElementById('admin-map-legend-box');
  const statusBadge = document.getElementById('admin-map-status-badge');
  if (!legendBox) return;

  const legends = {
    'dasar': {
      title: 'Peta Dasar DIY',
      html: `
        <div class="legend-title">Elemen Peta Dasar</div>
        <div class="legend-item"><span class="legend-line-icon" style="background:#7c3aed;"></span> Batas Provinsi DIY</div>
        <div class="legend-item"><span class="legend-line-icon" style="background:#0f172a;"></span> Batas Kabupaten/Kota</div>
        <div class="legend-item"><span class="legend-line-icon" style="background:#374151;"></span> Batas Kapanewon</div>
        <div class="legend-item"><span class="legend-triangle-icon" style="border-bottom-color:#dc2626;"></span> Pos Pemadam Kebakaran</div>
        <div class="legend-item"><span class="legend-circle-icon" style="background:#f59e0b;"></span> Titik Desa/Kelurahan</div>
      `
    },
    'kebakaran': {
      title: 'Data Kejadian Kebakaran',
      html: `
        <div class="legend-title">Status Laporan Kebakaran</div>
        <div class="legend-item"><span class="legend-circle-icon" style="background:#f59e0b;"></span> Menunggu Respon</div>
        <div class="legend-item"><span class="legend-circle-icon" style="background:#06b6d4;"></span> Dalam Penanganan (Diproses)</div>
        <div class="legend-item"><span class="legend-circle-icon" style="background:#10b981;"></span> Selesai Ditangani</div>
        <div class="legend-item"><span class="legend-circle-icon" style="background:#ef4444; border: 2px solid #991b1b;"></span> Titik Laporan Kebakaran</div>
      `
    },
    'non-kebakaran': {
      title: 'Data Kejadian Non-Kebakaran',
      html: `
        <div class="legend-title">Laporan Penyelamatan Non-Kebakaran</div>
        <div class="legend-item"><span class="legend-circle-icon" style="background:#3b82f6;"></span> Evakuasi & Penyelamatan</div>
        <div class="legend-item"><span class="legend-circle-icon" style="background:#eab308;"></span> Penanganan Animal Rescue / Sarang Tawon</div>
        <div class="legend-item"><span class="legend-circle-icon" style="background:#10b981;"></span> Selesai</div>
      `
    },
    'pertanian': {
      title: 'Risiko Kebakaran Pertanian',
      html: `
        <div class="legend-title">Jenis Irigasi Lahan Pertanian</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#15803d;"></span> Sawah Irigasi Teknis</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#eab308;"></span> Sawah Tadah Hujan</div>
        <div class="legend-title mt-2">Tingkat Risiko Kebakaran</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#ff4d4f;"></span> SANGAT BERAT</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#ff7a45;"></span> BERAT</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#ffc53d;"></span> SEDANG</div>
        <div class="legend-title mt-2">Batas Administrasi & Titik</div>
        <div class="legend-item"><span style="color:#eab308; font-size:14px;">⬟</span> Titik BPBD DIY</div>
        <div class="legend-item"><span class="legend-line-icon" style="background:#374151;"></span> adm_kab & adm_kec</div>
      `
    },
    'wmk': {
      title: 'WMK & Pos Damkar DIY',
      html: `
        <div class="legend-title">Titik Pos Pemadam Kebakaran</div>
        <div class="legend-item"><span class="legend-triangle-icon" style="border-bottom-color:#dc2626;"></span> Pos Pemadam Kebakaran Tersedia</div>
        <div class="legend-item"><span class="legend-triangle-icon" style="border-bottom-color:#111827;"></span> Pos Pemadam Kebakaran Tambahan</div>
        <div class="legend-title mt-2">Tingkat Risiko Kebakaran WMK</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#69c0ff;"></span> SANGAT RINGAN</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#73d13d;"></span> RINGAN</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#ffc53d;"></span> SEDANG</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#ff7a45;"></span> BERAT</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#ff4d4f;"></span> SANGAT BERAT</div>
        <div class="legend-title mt-2">Jangkauan Pos Pemadam (7 Km)</div>
        <div class="legend-item"><span style="display:inline-block;width:12px;height:12px;border:2px solid #ef4444;border-radius:50%;"></span> Jangkauan Pos Tersedia</div>
        <div class="legend-item"><span style="display:inline-block;width:12px;height:12px;border:2px solid #3b82f6;border-radius:50%;"></span> Jangkauan Pos Tambahan</div>
      `
    },
    'tangki-air': {
      title: 'Jangkauan Tangki Air Damkar',
      html: `
        <div class="legend-title">Pasokan Air Damkar</div>
        <div class="legend-item"><span class="legend-circle-icon" style="background:#0284c7;"></span> Titik Pos / Hydrant Tangki Air</div>
        <div class="legend-item"><span style="display:inline-block;width:14px;height:14px;background:rgba(56,189,248,0.3);border:1px solid #0284c7;border-radius:50%;"></span> Radius Jangkauan Tangki Air</div>
      `
    },
    'wmk-cagar': {
      title: 'WMK Cagar Budaya DIY',
      html: `
        <div class="legend-title">Bangunan Cagar Budaya & Institusi</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#b91c1c;"></span> Titik Cagar Budaya</div>
        <div class="legend-item"><span style="color:#a855f7; font-size:14px;">⬟</span> Biro Organisasi, Govt & Sekolah</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#fef08a;"></span> Kawasan WMK Cagar Budaya</div>
      `
    },
    'filosofis': {
      title: 'Sumbu Filosofis Yogyakarta',
      html: `
        <div class="legend-title">Poros Kosmologi & Warisan Sejarah</div>
        <div class="legend-item"><span class="legend-line-icon" style="background:#dc2626; height:4px;"></span> Sumbu Filosofi Axis Line</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#fef08a;"></span> Area Kraton</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#2dd4bf;"></span> Area Kepatihan</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#f59e0b;"></span> Area Taman Sari</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#dc2626;"></span> Area Masjid Gede</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#c7d2fe;"></span> Buffer Zone Sumbu Filosofi</div>
      `
    },
    'srs': {
      title: 'Satuan Ruang Strategis (SRS) DIY',
      html: `
        <div class="legend-title">SATUAN RUANG STRATEGIS (SRS)</div>
        <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#ffffff;border:1px solid #64748b;border-radius:2px;margin-right:4px;"></span> Area Non-SRS</div>
        <div style="max-height:240px; overflow-y:auto; font-size:11px; line-height:1.4;">
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#D7C7EB;border:1px solid #8A63D2;border-radius:2px;margin-right:4px;"></span> Candi Prambanan – Candi Ijo</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#C8E6A6;border:1px solid #6FA832;border-radius:2px;margin-right:4px;"></span> Gunung Merapi</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#D5CD90;border:1px solid #9E9346;border-radius:2px;margin-right:4px;"></span> Karaton</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#AEE5EE;border:1px solid #38A3B8;border-radius:2px;margin-right:4px;"></span> Karst Gunungsewu</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#F3A8A8;border:1px solid #D15353;border-radius:2px;margin-right:4px;"></span> Kerto - Pleret</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#A4DFD1;border:1px solid #3EA38A;border-radius:2px;margin-right:4px;"></span> Kotabaru</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#A8BAEE;border:1px solid #5777D9;border-radius:2px;margin-right:4px;"></span> Makam Girigondo</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#9496E8;border:1px solid #4A4ED1;border-radius:2px;margin-right:4px;"></span> Makam Raja Imogiri</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#EE6EDE;border:1px solid #B823A4;border-radius:2px;margin-right:4px;"></span> Masjid Pathok Negoro</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#78DF94;border:1px solid #2BA34D;border-radius:2px;margin-right:4px;"></span> Masjid Kotagede</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#DDD177;border:1px solid #A39423;border-radius:2px;margin-right:4px;"></span> Pantai Samas – Parangtritis</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#B8CEE0;border:1px solid #527E9F;border-radius:2px;margin-right:4px;"></span> Pantai Sel. Gunungkidul</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#F3BEB2;border:1px solid #D86550;border-radius:2px;margin-right:4px;"></span> Pantai Sel. Kulon Progo</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#F7D4BF;border:1px solid #D98858;border-radius:2px;margin-right:4px;"></span> Perbukitan Menoreh</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#A0E878;border:1px solid #52B31E;border-radius:2px;margin-right:4px;"></span> Puro Pakualaman</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#EA72AD;border:1px solid #C42777;border-radius:2px;margin-right:4px;"></span> Pusat Kota Wates</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#E4D3BD;border:1px solid #A88E6B;border-radius:2px;margin-right:4px;"></span> Sokoliman</div>
          <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#FFEE44;border:1px solid #D4B800;border-radius:2px;margin-right:4px;"></span> Sumbu Filosofi</div>
        </div>
        <div class="legend-title mt-2">Overlay Risiko Kebakaran</div>
        <div class="legend-item"><span class="srs-risk-pattern srs-risk-heavy"></span> BERAT</div>
        <div class="legend-item"><span class="srs-risk-pattern srs-risk-very-heavy"></span> SANGAT BERAT</div>
        <div class="legend-title mt-2">Batas Administrasi</div>
        <div class="legend-item"><span class="legend-line-icon srs-boundary-village"></span> Kecamatan / Desa</div>
        <div class="legend-item"><span class="legend-line-icon srs-boundary-county"></span> Kabupaten / Kota</div>
      `
    },
    'batas-kabupaten': {
      title: 'Batas Kabupaten DIY',
      html: `
        <div class="legend-title">Kabupaten / Kota DIY</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#fecaca;"></span> Kota Yogyakarta</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#bfdbfe;"></span> Kabupaten Sleman</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#bbf7d0;"></span> Kabupaten Bantul</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#fef08a;"></span> Kabupaten Kulon Progo</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#fed7aa;"></span> Kabupaten Gunungkidul</div>
      `
    },
    'batas-kecamatan': {
      title: 'Batas Kapanewon / Kecamatan',
      html: `
        <div class="legend-title">Wilayah Kecamatan DIY</div>
        <div class="legend-item"><span class="legend-line-icon" style="background:#374151;"></span> Batas Kapanewon / Kecamatan</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#ff4d4f;"></span> Risiko Kebakaran Tinggi</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#ffc53d;"></span> Risiko Kebakaran Menengah</div>
        <div class="legend-item"><span class="legend-color-swatch" style="background:#52c41a;"></span> Risiko Kebakaran Rendah</div>
      `
    },
    'desa': {
      title: 'Titik Desa & Kelurahan DIY',
      html: `
        <div class="legend-title">Sebaran Titik Desa/Kelurahan</div>
        <div class="legend-item"><span class="legend-circle-icon" style="background:#f59e0b;"></span> Titik Desa / Kelurahan</div>
        <div class="legend-item"><span class="legend-line-icon" style="background:#0f172a;"></span> Batas Administrasi DIY</div>
      `
    },
    'pos-damkar': {
      title: 'Pos Pemadam Kebakaran DIY',
      html: `
        <div class="legend-title">Unit & Pos Respons Damkar</div>
        <div class="legend-item"><span class="legend-triangle-icon" style="border-bottom-color:#dc2626;"></span> Pos Pemadam Kebakaran Utama</div>
        <div class="legend-item"><span style="display:inline-block;width:12px;height:12px;border:2px solid #ef4444;border-radius:50%;"></span> Jangkauan Respons 7 KM</div>
      `
    }
  };

  const item = legends[theme] || legends['dasar'];
  legendBox.innerHTML = item.html;
  if (statusBadge) statusBadge.textContent = item.title;
}

// Palet warna per kabupaten — sesuai legenda dan map.js
const ADMIN_KAB_COLORS = {
  'yogyakarta': { fill: '#fecaca', border: '#991b1b' },
  'sleman':     { fill: '#bfdbfe', border: '#1e3a8a' },
  'bantul':     { fill: '#bbf7d0', border: '#14532d' },
  'kulon progo':{ fill: '#fef08a', border: '#713f12' },
  'gunungkidul':{ fill: '#fed7aa', border: '#7c2d12' }
};

function getAdminKabColor(name) {
  const lower = (name || '').toLowerCase();
  for (const [key, val] of Object.entries(ADMIN_KAB_COLORS)) {
    if (lower.includes(key)) return val;
  }
  return { fill: '#e2e8f0', border: '#374151' };
}

// Warna risiko kecamatan sesuai legenda dan map.js
const RISIKO_COLORS = {
  Tinggi:   { fill: '#ff4d4f', border: '#cf1322' },
  Menengah: { fill: '#ffc53d', border: '#d48806' },
  Rendah:   { fill: '#52c41a', border: '#389e0d' }
};

const RISIKO_LABEL = {
  Tinggi: 'Tinggi',
  Menengah: 'Menengah',
  Rendah: 'Rendah'
};

const assignRiskLevel = (feature) => {
  const kode = feature.properties.kode_kec || feature.properties.kode_kk || '';
  const digits = String(kode).replace(/\D/g, '');
  const value = parseInt(digits.slice(-2), 10) || 0;
  const mod = value % 10;
  if (mod <= 3) return 'Tinggi';
  if (mod <= 6) return 'Menengah';
  return 'Rendah';
};

async function renderDiyRegions() {
  if (!liveMap || !diyRegionsLayer) return;

  try {
    const res = await fetch('data/diy-kecamatan.geojson');
    if (!res.ok) throw new Error('Gagal memuat data/diy-kecamatan.geojson');
    const geojson = await res.json();

    L.geoJSON(geojson, {
      style: (feature) => {
        const level = assignRiskLevel(feature);
        const col = RISIKO_COLORS[level];
        return {
          color: col.border,
          weight: 1.5,
          fillColor: col.fill,
          fillOpacity: level === 'Tinggi' ? 0.72 : level === 'Menengah' ? 0.60 : 0.45
        };
      },
      onEachFeature: (feature, layer) => {
        const level = assignRiskLevel(feature);
        const col = RISIKO_COLORS[level];
        const districtName = feature.properties.nama || feature.properties.kecamatan || 'Kecamatan';
        const kabName = feature.properties.kab_kota || 'Kabupaten DIY';
        layer.bindPopup(`
          <strong>${districtName}</strong><br>
          Kabupaten/Kota: ${kabName}<br>
          Risiko Kebakaran: <b style="color:${col.fill}">${RISIKO_LABEL[level]}</b>
        `);
        layer.on('mouseover', () => layer.setStyle({ weight: 2.5 }));
        layer.on('mouseout',  () => layer.setStyle({ weight: 1.5 }));

        const bounds = L.geoJSON(feature).getBounds();
        if (bounds.isValid()) {
          liveMapBounds.extend(bounds);
        }
      }
    }).addTo(diyRegionsLayer);
  } catch (err) {
    console.error('Gagal memuat batas wilayah DIY:', err);
  }
}

async function renderPertanianLayer() {
  if (!pertanianLayer) return;
  try {
    const res = await fetch('data/diy-kecamatan.geojson');
    if (!res.ok) return;
    const geojson = await res.json();

    L.geoJSON(geojson, {
      style: (feature) => {
        const name = feature.properties.nama || feature.properties.kecamatan || '';
        const isIrigasi = /depok|mlati|kalasan|prambanan|sewon|sanden|wates/i.test(name);
        const isTadahHujan = /playen|wonosari|semin|panggang|semanu/i.test(name);
        const isSangatBerat = /tempel|pakem|turi|cangkringan|girimulyo/i.test(name);
        const isBerat = /dringo|imogiri|dini|samigaluh/i.test(name);

        let fillColor = '#f87171'; // SEDANG
        if (isIrigasi) fillColor = '#15803d'; // Sawah Irigasi Teknis
        else if (isTadahHujan) fillColor = '#eab308'; // Sawah Tadah Hujan
        else if (isSangatBerat) fillColor = '#8b0000'; // SANGAT BERAT
        else if (isBerat) fillColor = '#dc2626'; // BERAT

        return {
          color: '#1f2937',
          weight: 1.2,
          fillColor: fillColor,
          fillOpacity: 0.75
        };
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.nama || feature.properties.kecamatan || 'Kecamatan';
        layer.bindPopup(`
          <strong>Kecamatan ${name}</strong><br>
          <small>Peta Potensi Kebakaran Lahan Pertanian</small>
        `);
      }
    }).addTo(pertanianLayer);

    const bpbdIcon = L.divIcon({
      html: `<div style="font-size:18px; color:#eab308; text-shadow:0 0 3px #000;">⬟</div>`,
      className: 'bpbd-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    L.marker([-7.7978, 110.3688], { icon: bpbdIcon })
      .bindPopup('<strong>Titik BPBD DIY</strong><br>Pusat Pengendalian Operasi BPBD DIY')
      .addTo(pertanianLayer);
  } catch (err) {
    console.error('Gagal memuat layer pertanian:', err);
  }
}

async function renderFilosofisLayer() {
  if (!filosofisLayer) return;

  L.polygon([
    [-7.780, 110.355],
    [-7.780, 110.373],
    [-7.832, 110.369],
    [-7.832, 110.351]
  ], {
    color: '#818cf8',
    weight: 2,
    dashArray: '4 4',
    fillColor: '#c7d2fe',
    fillOpacity: 0.35
  }).bindPopup('<strong>Buffer Zone Sumbu Filosofi</strong><br>Kawasan Penyangga Warisan Budaya World Heritage').addTo(filosofisLayer);

  L.polygon([
    [-7.802, 110.360],
    [-7.802, 110.368],
    [-7.809, 110.368],
    [-7.809, 110.360]
  ], {
    color: '#dc2626',
    weight: 2,
    fillColor: '#fef08a',
    fillOpacity: 0.85
  }).bindPopup('<strong>Area Kraton Yogyakarta</strong><br>Kawasan Utama Istana Kraton').addTo(filosofisLayer);

  L.polygon([
    [-7.794, 110.365],
    [-7.794, 110.368],
    [-7.797, 110.368],
    [-7.797, 110.365]
  ], {
    color: '#0f766e',
    weight: 2,
    fillColor: '#2dd4bf',
    fillOpacity: 0.85
  }).bindPopup('<strong>Area Kepatihan</strong><br>Pusat Pemerintahan Gubernur DIY').addTo(filosofisLayer);

  L.polygon([
    [-7.809, 110.358],
    [-7.809, 110.363],
    [-7.813, 110.363],
    [-7.813, 110.358]
  ], {
    color: '#d97706',
    weight: 2,
    fillColor: '#f59e0b',
    fillOpacity: 0.85
  }).bindPopup('<strong>Area Taman Sari</strong><br>Situs Taman Air Cagar Budaya').addTo(filosofisLayer);

  L.polygon([
    [-7.803, 110.362],
    [-7.803, 110.364],
    [-7.805, 110.364],
    [-7.805, 110.362]
  ], {
    color: '#991b1b',
    weight: 2,
    fillColor: '#dc2626',
    fillOpacity: 0.9
  }).bindPopup('<strong>Area Masjid Gede Kauman</strong><br>Masjid Agung Kagungan Dalem').addTo(filosofisLayer);

  L.polyline([
    [-7.8276, 110.3606],
    [-7.8053, 110.3642],
    [-7.7829, 110.3671]
  ], {
    color: '#dc2626',
    weight: 5,
    opacity: 0.9
  }).bindPopup('<strong>Poros Kosmologi Sumbu Filosofis</strong><br>Panggung Krapyak - Kraton Yogyakarta - Tugu Golong Gilig').addTo(filosofisLayer);
}

async function renderBufferDamkar() {
  if (!bufferDamkarLayer) return;
  try {
    const res = await fetch('data/BUFFER POS DAMKAR EKSISTING.geojson');
    if (res.ok) {
      const raw = await res.json();
      const data = typeof convertUtmGeoJSON === 'function' ? convertUtmGeoJSON(raw) : raw;
      L.geoJSON(data, {
        style: {
          color: '#103B78',
          weight: 2.8,
          opacity: 0.95,
          fillColor: '#93C5FD',
          fillOpacity: 0.18
        },
        onEachFeature: (feature, layer) => {
          const nama = feature.properties?.Nama || feature.properties?.NAMA || 'Pos Damkar';
          layer.bindPopup(`<strong>🛡️ Jangkauan Layanan (${nama})</strong>`);
        }
      }).addTo(bufferDamkarLayer);
    }
  } catch (e) {
    console.warn('Buffer Damkar GeoJSON failed:', e);
  }
}

async function renderTangkiAirLayer() {
  if (!tangkiAirLayer) return;

  const waterPosts = [
    { name: 'Pos Tangki Air Sleman Utama', lat: -7.725, lng: 110.355 },
    { name: 'Pos Tangki Air Kota Tugu', lat: -7.785, lng: 110.366 },
    { name: 'Pos Tangki Air Bantul Utara', lat: -7.850, lng: 110.340 },
    { name: 'Pos Tangki Air Kulon Progo Wates', lat: -7.855, lng: 110.155 },
    { name: 'Pos Tangki Air Gunungkidul Wonosari', lat: -7.965, lng: 110.605 }
  ];

  waterPosts.forEach((wp) => {
    L.circleMarker([wp.lat, wp.lng], {
      radius: 8,
      color: '#0369a1',
      weight: 2,
      fillColor: '#0284c7',
      fillOpacity: 0.9
    }).bindPopup(`<strong>💧 ${wp.name}</strong><br>Kapasitas pasokan air darurat`).addTo(tangkiAirLayer);

    L.circle([wp.lat, wp.lng], {
      radius: 4000,
      color: '#0284c7',
      weight: 1.5,
      dashArray: '3 3',
      fillColor: '#38bdf8',
      fillOpacity: 0.12
    }).addTo(tangkiAirLayer);
  });
}

async function renderCagarBudayaLayer() {
  if (!cagarBudayaLayer) return;
  try {
    const res = await fetch('data/TITIK CAGAR BUDAYA.geojson');
    if (res.ok) {
      const rawData = await res.json();
      const data = convertUtmGeoJSON(rawData);
      L.geoJSON(data, {
        pointToLayer: (feature, latlng) => {
          return L.circleMarker(latlng, {
            radius: 5,
            color: '#7f1d1d',
            weight: 1,
            fillColor: '#b91c1c',
            fillOpacity: 0.9
          });
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          const name = props.NAMA || props.Nama || 'Cagar Budaya DIY';
          layer.bindPopup(`<strong>🏛️ ${name}</strong><br><small>Situs Cagar Budaya Dilindungi</small>`);
        }
      }).addTo(cagarBudayaLayer);
    }
  } catch (e) {
    console.warn('Cagar Budaya GeoJSON failed:', e);
  }
}

async function renderSrsLayer() {
  if (!srsLayer) return;

  const ensureRiskPatterns = () => {
    const svg = liveMap.getPanes().overlayPane.querySelector('svg');
    if (!svg || svg.querySelector('#srs-risk-heavy')) return;
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <pattern id="srs-risk-heavy" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M-2,10 L10,-2 M3,13 L13,3" stroke="#dc2626" stroke-width="2" opacity="0.7" />
      </pattern>
      <pattern id="srs-risk-very-heavy" width="12" height="12" patternUnits="userSpaceOnUse">
        <path d="M-3,3 L3,-3 M0,12 L12,0 M9,15 L15,9 M-3,9 L3,15 M9,-3 L15,3" stroke="#b91c1c" stroke-width="1.7" opacity="0.72" />
      </pattern>
    `;
    svg.insertBefore(defs, svg.firstChild);
  };

  try {
    const boundaryRes = await fetch('data/diy-kabkota.geojson');
    if (boundaryRes.ok) {
      const boundaryData = await boundaryRes.json();
      L.geoJSON(boundaryData, {
        style: {
          color: '#64748b',
          weight: 2.6,
          fillColor: '#ffffff',
          fillOpacity: 1
        }
      }).addTo(srsLayer);
    }

    const res = await fetch('data/AREA SRS.geojson');
    if (res.ok) {
      const geojson = await res.json();
      L.geoJSON(geojson, {
        style: (feature) => {
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
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          const name = props.REMARK || props.SRS_EDIT || props.SRS_FIX || props.NAMOBJ || 'Kawasan SRS DIY';
          layer.bindPopup(`<strong>Satuan Ruang Strategis (SRS)</strong><br>${name}`);
        }
      }).addTo(srsLayer);
    }

    const riskRes = await fetch('data/TINGKAT RISIKO.geojson');
    if (riskRes.ok) {
      const riskData = await riskRes.json();
      ensureRiskPatterns();
      L.geoJSON(riskData, {
        filter: (feature) => /^(BERAT|SANGAT BERAT)$/i.test(String(feature.properties?.KATEGORI || '').trim()),
        style: (feature) => ({
          color: '#b91c1c',
          weight: 0.45,
          fillColor: String(feature.properties?.KATEGORI || '').toUpperCase() === 'SANGAT BERAT'
            ? 'url(#srs-risk-very-heavy)' : 'url(#srs-risk-heavy)',
          fillOpacity: 1
        }),
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          layer.bindPopup(`<strong>Risiko Kebakaran ${props.KATEGORI}</strong><br>${props.Desa || '-'}, ${props.Kapanewon || '-'}`);
        }
      }).addTo(srsLayer);
    }

    const districtRes = await fetch('data/diy-kecamatan.geojson');
    if (districtRes.ok) {
      const districtData = await districtRes.json();
      L.geoJSON(districtData, {
        style: {
          color: '#64748b',
          weight: 0.55,
          opacity: 0.7,
          fill: false
        }
      }).addTo(srsLayer);
    }

    ensureRiskPatterns();
  } catch (e) {
    console.warn('SRS GeoJSON failed:', e);
  }
}

async function renderKabupatenBoundaries() {
  if (!liveMap || !countyBoundaryLayer) return;

  try {
    const res = await fetch('data/diy-kabkota.geojson');
    if (!res.ok) throw new Error('Gagal memuat data/diy-kabkota.geojson');
    const geojson = await res.json();

    if (!liveMap.getPane('pane_kabupaten_admin')) {
      liveMap.createPane('pane_kabupaten_admin');
      liveMap.getPane('pane_kabupaten_admin').style.zIndex = '450';
    }

    L.geoJSON(geojson, {
      pane: 'pane_kabupaten_admin',
      style: (feature) => {
        const name = feature.properties.nama || feature.properties.kab_kota || feature.properties.WADMKK || '';
        const col = getAdminKabColor(name);
        return {
          color: '#1e3a8a',
          weight: 2.8,
          dashArray: '8, 5',
          fillColor: col.fill || '#bfdbfe',
          fillOpacity: 0.12
        };
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.nama || feature.properties.kab_kota || feature.properties.WADMKK || 'Kabupaten/Kota';
        const col = getAdminKabColor(name);
        layer.bindTooltip(name.toUpperCase(), {
          permanent: true,
          direction: 'center',
          className: 'kabupaten-label'
        });
        layer.bindPopup(`<strong style="color:${col.border}">${name}</strong><br><small>Wilayah Kabupaten/Kota DIY</small>`);
        layer.on('mouseover', () => layer.setStyle({ weight: 3.8, fillOpacity: 0.25 }));
        layer.on('mouseout',  () => layer.setStyle({ weight: 2.8, fillOpacity: 0.12 }));
        const bounds = L.geoJSON(feature).getBounds();
        if (bounds.isValid()) {
          liveMapBounds.extend(bounds);
        }
      }
    }).addTo(countyBoundaryLayer);
  } catch (err) {
    console.error('Gagal memuat batas kabupaten DIY:', err);
  }
}

function addRiskLegend() {
  if (liveMap._riskLegendAdded) return;
  liveMap._riskLegendAdded = true;

  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = () => {
    const div = L.DomUtil.create('div', 'risk-legend');
    div.style.background = 'rgba(255,255,255,0.98)';
    div.style.padding = '6px 8px';
    div.style.borderRadius = '8px';
    div.style.boxShadow = '0 4px 12px rgba(15,23,42,0.14)';
    div.style.fontSize = '10px';
    div.style.lineHeight = '1.2';
    div.style.border = '1px solid rgba(148,163,184,0.42)';
    div.style.minWidth = '166px';
    div.innerHTML = `
      <div style="font-weight:900; color:#0f172a; margin-bottom:4px; letter-spacing:0.15px;">Risiko</div>
      <div style="display:flex;align-items:center;gap:5px;margin-top:2px;">
        <span style="width:12px;height:12px;background:${RISIKO_COLORS['Tinggi'].fill};display:inline-block;border-radius:2px;border:1px solid ${RISIKO_COLORS['Tinggi'].border};"></span>
        <strong style="color:#cf1322;">Tinggi</strong>
      </div>
      <div style="display:flex;align-items:center;gap:5px;margin-top:2px;">
        <span style="width:12px;height:12px;background:${RISIKO_COLORS['Menengah'].fill};display:inline-block;border-radius:2px;border:1px solid ${RISIKO_COLORS['Menengah'].border};"></span>
        <strong style="color:#d48806;">Menengah</strong>
      </div>
      <div style="display:flex;align-items:center;gap:5px;margin-top:2px;">
        <span style="width:12px;height:12px;background:${RISIKO_COLORS['Rendah'].fill};display:inline-block;border-radius:2px;border:1px solid ${RISIKO_COLORS['Rendah'].border};"></span>
        <strong style="color:#389e0d;">Rendah</strong>
      </div>
    `;
    return div;
  };
  legend.addTo(liveMap);
}

// Titik Desa/Kelurahan (data ringan hasil pra-proses, bukan poligon penuh)
async function renderDiyVillagePoints() {
  if (!liveMap || !diyVillagePointsLayer) return;
  if (diyVillagePointsLayer.getLayers().length > 0) return; // sudah dimuat

  try {
    const res = await fetch('data/diy-desa-titik.json');
    if (!res.ok) throw new Error('Gagal memuat data/diy-desa-titik.json');
    const points = await res.json();

    points.forEach((desa) => {
      const lat = Number(desa.lat);
      const lng = Number(desa.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const namaKd    = desa.kel_desa  || '-';
      const jenisKd   = desa.jenis_kd  || 'Desa/Kelurahan';
      const kecamatan = desa.kecamatan || '-';
      const kabKota   = desa.kab_kota  || '-';

      const isKota = kabKota.toLowerCase().includes('kota') || kabKota.toLowerCase().includes('yogyakarta');
      const prefixKab = (kabKota.toLowerCase().startsWith('kab') || kabKota.toLowerCase().startsWith('kota')) ? kabKota : `Kabupaten ${kabKota}`;
      const sebutanKec = isKota ? 'Kemantren' : 'Kapanewon';
      const sebutanDesa = isKota ? (jenisKd || 'Kelurahan') : (jenisKd || 'Kalurahan');
      const kodeWilayah = desa.kode_kd || desa.kode_kec || '-';
      const alamatLengkapDesa = `${sebutanDesa} ${namaKd}, ${sebutanKec} ${kecamatan}, ${prefixKab}, Daerah Istimewa Yogyakarta`;

      const marker = L.circleMarker([lat, lng], {
        radius: 5,
        color: '#92400e',
        weight: 1.2,
        fillColor: '#f59e0b',
        fillOpacity: 0.9
      }).addTo(diyVillagePointsLayer).bindPopup(`
        <div style="min-width:260px; max-width:320px; font-size:12.5px; line-height:1.6; color:#1f2937;">
          <div style="font-size:15px; font-weight:700; color:#b45309; margin-bottom:8px; display:flex; align-items:center; gap:6px; border-bottom:2px solid #fde68a; padding-bottom:5px;">
            <span>🏘️</span> <span>${escapeHtml(sebutanDesa)} ${escapeHtml(namaKd)}</span>
          </div>
          <div style="margin-bottom:8px; background:#fffbeb; border:1px solid #fef3c7; border-left:4px solid #f59e0b; border-radius:4px; padding:6px 10px;">
            <div style="font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#b45309; margin-bottom:2px;">
              📍 Alamat Lengkap
            </div>
            <div style="font-size:12.5px; font-weight:600; color:#1e293b; line-height:1.4;">
              ${escapeHtml(alamatLengkapDesa)}
            </div>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:12px;">
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap; vertical-align:top;">
                <i class="bi bi-geo-alt-fill" style="color:#f59e0b;"></i> Kab./Kota
              </td>
              <td style="font-weight:600; padding:4px 0; color:#1e293b;">${escapeHtml(kabKota)}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap; vertical-align:top;">
                <i class="bi bi-map-fill" style="color:#6366f1;"></i> ${escapeHtml(sebutanKec)}
              </td>
              <td style="font-weight:600; padding:4px 0; color:#1e293b;">${escapeHtml(kecamatan)}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap; vertical-align:top;">
                <i class="bi bi-house-fill" style="color:#10b981;"></i> ${escapeHtml(sebutanDesa)}
              </td>
              <td style="font-weight:600; padding:4px 0; color:#1e293b;">${escapeHtml(namaKd)}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap; vertical-align:top;">
                <i class="bi bi-hash" style="color:#8b5cf6;"></i> Kode Wilayah
              </td>
              <td style="font-weight:600; padding:4px 0; color:#1e293b;">${escapeHtml(kodeWilayah)}</td>
            </tr>
            <tr>
              <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap; vertical-align:top;">
                <i class="bi bi-compass" style="color:#0ea5e9;"></i> Koordinat
              </td>
              <td style="font-family:monospace; font-weight:500; padding:4px 0; color:#475569; font-size:11.5px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</td>
            </tr>
          </table>
        </div>
      `);

      liveMapBounds.extend(marker.getLatLng());
    });
  } catch (err) {
    console.error('Gagal memuat titik desa/kelurahan:', err);
  }
}

function createLabel(latlng, text) {
  // Label putih pada peta admin dihilangkan sesuai instruksi agar peta bersih
  return;
}

async function renderPosDamkarMarkers() {
  if (!liveMap || !posDamkarLayer) return;
  const damkarIcon = L.divIcon({
    className: 'damkar-map-icon',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background: #C62828;
        border: 2.5px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 14px;
      ">🚒</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });

  try {
    const res = await fetch('data/TITIK POS DAMKAR EKSISTING.geojson');
    if (res.ok) {
      const data = await res.json();
      L.geoJSON(data, {
        pointToLayer: (feature, latlng) => {
          const marker = L.marker(latlng, { icon: damkarIcon });
          marker.bindTooltip(`🚒 ${nama}`, {
            permanent: true,
            direction: 'top',
            className: 'pos-damkar-label',
            offset: [0, -16]
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
      }).addTo(posDamkarLayer);
    }
  } catch (e) {
    console.warn('Pos Damkar GeoJSON failed:', e);
  }
}

function renderLiveMap(reports) {
  if (!liveMap || !liveMarkersLayer) return;

  liveMarkersLayer.clearLayers();
  if (completedMarkersLayer) completedMarkersLayer.clearLayers();

  reports.forEach((report) => {
    const lat = parseFloat(report.latitude);
    const lng = parseFloat(report.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    // Warna marker sesuai legenda status laporan (konsisten dengan map.js)
    const status = String(report.status || '').toLowerCase();
    let fillClr = '#f59e0b'; // Menunggu = kuning
    let borderClr = '#92400e';
    if (status.includes('selesai')) {
      fillClr = '#10b981'; borderClr = '#065f46';
    } else if (status.includes('diproses') || status.includes('proses')) {
      fillClr = '#06b6d4'; borderClr = '#0e7490';
    } else if (status.includes('kebakaran') || status.includes('darurat')) {
      fillClr = '#ef4444'; borderClr = '#991b1b';
    }

    const icon = L.divIcon({
      html: `<div class="report-blinking-marker-wrapper" style="--marker-color:${fillClr};"><div class="report-blinking-marker-dot"></div></div>`,
      className: 'custom-marker-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const googleFrameUrl = `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&layer=c&cbll=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&cbp=11,0,0,0,0&output=embed`;
    const reportTitle = String(report.judul_kejadian || 'Laporan Kebakaran')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");
    const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&travelmode=driving`;

    const namaLokasi = report.alamat || 'Titik Lokasi Terdeteksi';
    const desaLokasi = report.kalurahan ? `${report.kalurahan}` : '';
    const kecLokasi = report.kecamatan ? `Kec. ${report.kecamatan}` : '';
    const kabLokasi = report.kabupaten ? `${report.kabupaten}` : '';
    const alamatParts = [namaLokasi, desaLokasi, kecLokasi, kabLokasi, 'D.I. Yogyakarta'].filter(Boolean);
    const alamatLengkapKejadian = alamatParts.join(', ');

    const popupHtml = `
      <div style="min-width:260px; max-width:320px; font-size:12.5px; line-height:1.6; color:#1f2937;">
        <div style="font-size:14.5px; font-weight:700; color:#dc2626; margin-bottom:6px; display:flex; align-items:center; gap:6px; border-bottom:2px solid #fecaca; padding-bottom:4px;">
          <span>🔥</span> <span>${escapeHtml(report.judul_kejadian || 'Laporan Kebakaran')}</span>
        </div>

        <div style="margin-bottom:8px; background:#fef2f2; border:1px solid #fee2e2; border-left:4px solid #ef4444; border-radius:4px; padding:6px 10px;">
          <div style="font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#991b1b; margin-bottom:2px;">
            📍 Alamat Lengkap
          </div>
          <div style="font-size:12.5px; font-weight:600; color:#1e293b; line-height:1.4;">
            ${escapeHtml(alamatLengkapKejadian)}
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:8px;">
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="color:#64748b; padding:3px 6px 3px 0; white-space:nowrap;">Status:</td>
            <td style="padding:3px 0;">
              <span class="badge-status badge-${status.includes('selesai') ? 'selesai' : status.includes('proses') ? 'diproses' : 'menunggu'}">
                ${escapeHtml(report.status || 'Menunggu')}
              </span>
            </td>
          </tr>
          ${report.jenis_kejadian ? `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="color:#64748b; padding:3px 6px 3px 0; white-space:nowrap;">Jenis Kejadian:</td>
            <td style="font-weight:600; padding:3px 0; color:#1e293b;">${escapeHtml(report.jenis_kejadian)}</td>
          </tr>` : ''}
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="color:#64748b; padding:3px 6px 3px 0; white-space:nowrap;">Koordinat:</td>
            <td style="font-family:monospace; padding:3px 0; color:#475569; font-size:11.5px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</td>
          </tr>
          ${report.nama_pelapor ? `
          <tr>
            <td style="color:#64748b; padding:3px 6px 3px 0; white-space:nowrap;">Pelapor:</td>
            <td style="font-weight:500; padding:3px 0; color:#1e293b;">${escapeHtml(report.nama_pelapor)}</td>
          </tr>` : ''}
        </table>

        <div style="display:flex; gap:6px; margin-top:6px;">
          <button type="button" class="btn btn-sm btn-outline-primary flex-fill" onclick="updateGoogleCameraFrame(${lat}, ${lng}, '${reportTitle}')">
            <i class="bi bi-camera-video"></i> Kamera
          </button>
          <button type="button" class="btn btn-sm btn-outline-danger flex-fill" onclick="window.open('${routeUrl}', '_blank')">
            <i class="bi bi-signpost-2"></i> Buka Rute
          </button>
        </div>
      </div>
    `;

    const targetLayer = status.includes('selesai') ? completedMarkersLayer : liveMarkersLayer;
    const marker = L.marker([lat, lng], { icon }).addTo(targetLayer).bindPopup(popupHtml);
    marker.on('click', () => {
      updateGoogleCameraFrame(lat, lng, report.judul_kejadian || 'Laporan Kebakaran');
      marker.openPopup();
    });
  });
}

// Fetch All Reports and Update Dashboard
async function fetchAdminData() {
  const tableBody = document.getElementById('table-laporan-body');
  const searchVal = document.getElementById('filter-search')?.value || '';
  const statusVal = document.getElementById('filter-status')?.value || 'Semua';
  const kabupatenVal = document.getElementById('filter-kabupaten')?.value || '';
  const kecamatanVal = document.getElementById('filter-kecamatan')?.value || '';
  const jenisVal = document.getElementById('filter-jenis')?.value || '';
  const startVal = document.getElementById('filter-start-date')?.value || '';
  const endVal = document.getElementById('filter-end-date')?.value || '';

  const queryParams = new URLSearchParams();
  if (searchVal) queryParams.append('search', searchVal);
  if (statusVal && statusVal !== 'Semua') queryParams.append('status', statusVal);
  if (kabupatenVal) queryParams.append('kabupaten', kabupatenVal);
  if (kecamatanVal) queryParams.append('kecamatan', kecamatanVal);
  if (jenisVal) queryParams.append('jenis', jenisVal);
  if (startVal) queryParams.append('startDate', startVal);
  if (endVal) queryParams.append('endDate', endVal);

  try {
  const requestUrl = `${API_BASE_URL}/laporan?${queryParams.toString()}`;

  console.log('=================================');
  console.log('FILTER ADMIN DIPANGGIL');
  console.log('Search    :', searchVal);
  console.log('Status    :', statusVal);
  console.log('Kabupaten :', kabupatenVal);
  console.log('Kecamatan :', kecamatanVal);
  console.log('Jenis     :', jenisVal);
  console.log('Start     :', startVal);
  console.log('End       :', endVal);
  console.log('REQUEST   :', requestUrl);
  console.log('=================================');

  const response = await fetch(requestUrl);
  const result = await response.json();
  
    if (response.ok && result.success) {
      currentFilteredReports = Array.isArray(result.data) ? result.data : [];
      // Update Statistics Cards
      if (result.stats) {
        document.getElementById('card-stat-total').textContent = result.stats.total || 0;
        document.getElementById('card-stat-menunggu').textContent = result.stats.menunggu || 0;
        document.getElementById('card-stat-diproses').textContent = result.stats.diproses || 0;
        document.getElementById('card-stat-selesai').textContent = result.stats.selesai || 0;

        // Update Doughnut Chart
        if (chartStatusInstance) {
          chartStatusInstance.data.datasets[0].data = [
            result.stats.menunggu || 0,
            result.stats.diproses || 0,
            result.stats.selesai || 0
          ];
          chartStatusInstance.update();
        }
      }

      // Render Table, Timeline Chart, Live Map, and Alerts
      renderTable(result.data);
      updateTimelineChart(result.data);
      updateAdditionalCharts(result.data);
      renderLiveMap(result.data);
      handleIncomingReportNotifications(result.data);

    } else {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Gagal memuat data. ${escapeHtml(result.message || '')}</td></tr>`;
    }

  } catch (error) {
    console.error('Error fetching admin data:', error);
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Terjadi kesalahan koneksi ke server.</td></tr>`;
  }
}

// Render Data Table with Direct Google Maps Link on Location Click
function renderTable(reports) {
  const tableBody = document.getElementById('table-laporan-body');
  if (!reports || reports.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <i class="bi bi-inbox fs-3 d-block mb-1"></i> Tidak ada laporan ditemukan.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  reports.forEach((item, index) => {

    // Generate Direct Google Maps Link
    let gmapsUrl = '#';
    if (item.latitude && item.longitude) {
      gmapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(item.latitude)},${encodeURIComponent(item.longitude)}`;
    } else {
      gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.alamat)}`;
    }

    html += `
      <tr>
        <td class="fw-bold text-center">${index + 1}</td>
        <td>
          <div class="fw-bold text-dark">${escapeHtml(item.judul_kejadian)}</div>
          <small class="text-muted"><i class="bi bi-telephone-fill text-success"></i> ${escapeHtml(item.nomor_hp)}</small>
        </td>
        <td class="fw-semibold text-secondary">${escapeHtml(item.nama_pelapor)}</td>
        <td class="small">
          <a href="${gmapsUrl}" target="_blank" class="text-danger fw-semibold text-decoration-none d-inline-flex align-items-center gap-1 hover-underline" title="Klik untuk membuka lokasi langsung di Google Maps">
            <i class="bi bi-geo-alt-fill text-danger"></i>
            <span class="text-truncate" style="max-width: 200px;">${escapeHtml(item.alamat)}</span>
            <i class="bi bi-box-arrow-up-right text-muted small ms-1"></i>
          </a>
        </td>
        <td class="small text-muted">${formatDate(item.created_at)}</td>
        <td class="text-center">${getStatusBadge(item.status)}</td>
        <td class="text-center">
          <div class="btn-group btn-group-sm">
            <a href="detail.html?id=${item.id}" class="btn btn-outline-primary" title="Lihat Detail">
              <i class="bi bi-eye-fill"></i>
            </a>
            <a href="${gmapsUrl}" target="_blank" class="btn btn-outline-danger" title="Buka di Google Maps">
              <i class="bi bi-geo-alt-fill"></i>
            </a>
            <button onclick="openEditModal(this, ${item.id}, '${escapeHtml(item.judul_kejadian)}', '${item.status}')" data-admin-response="${escapeHtml(item.respon_admin || '')}" class="btn btn-outline-warning text-dark" title="Ubah Status">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button onclick="deleteLaporan(${item.id}, '${escapeHtml(item.judul_kejadian)}')" class="btn btn-outline-danger" title="Hapus Laporan">
              <i class="bi bi-trash-fill"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

function downloadFilteredReports() {
  if (currentFilteredReports.length === 0) {
    alert('Tidak ada data laporan yang dapat diunduh dari hasil pencarian saat ini.');
    return;
  }

  const columns = [
    ['No', (_, index) => index + 1],
    ['Judul Kejadian', (report) => report.judul_kejadian],
    ['Nama Pelapor', (report) => report.nama_pelapor],
    ['Nomor HP', (report) => report.nomor_hp],
    ['Alamat', (report) => report.alamat],
    ['Kabupaten', (report) => report.kabupaten],
    ['Kecamatan', (report) => report.kecamatan],
    ['Jenis Kejadian', (report) => report.jenis_kejadian],
    ['Tanggal Laporan', (report) => formatDate(report.created_at)],
    ['Status', (report) => report.status],
    ['Latitude', (report) => report.latitude],
    ['Longitude', (report) => report.longitude]
  ];

  const csvEscape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csvRows = [
    columns.map(([header]) => csvEscape(header)).join(','),
    ...currentFilteredReports.map((report, index) => (
      columns.map(([, getValue]) => csvEscape(getValue(report, index))).join(',')
    ))
  ];
  const blob = new Blob([`\uFEFF${csvRows.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hasil-pencarian-laporan-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Update Bar Chart Timeline
function updateTimelineChart(reports) {
  if (!chartTimelineInstance || !reports) return;

  const dateCounts = {};
  reports.forEach(r => {
    const dateStr = new Date(r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
  });

  const labels = Object.keys(dateCounts).reverse();
  const dataValues = Object.values(dateCounts).reverse();

  chartTimelineInstance.data.labels = labels;
  chartTimelineInstance.data.datasets[0].data = dataValues;
  chartTimelineInstance.update();
}

function updateAdditionalCharts(reports) {
  if (!reports) return;

  const monthlyCounts = {};
  const districtCounts = {};
  const countyCounts = {};
  const fireTypeCounts = {};

  reports.forEach((report) => {
    const createdAt = report.created_at ? new Date(report.created_at) : null;
    if (createdAt && !Number.isNaN(createdAt.getTime())) {
      const monthKey = createdAt.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
    }

    const district = (report.kecamatan || 'Tidak diketahui').toString().trim();
    const county = (report.kabupaten || 'Tidak diketahui').toString().trim();
    const fireType = (report.jenis_kejadian || 'Tidak diketahui').toString().trim();

    districtCounts[district] = (districtCounts[district] || 0) + 1;
    countyCounts[county] = (countyCounts[county] || 0) + 1;
    fireTypeCounts[fireType] = (fireTypeCounts[fireType] || 0) + 1;
  });

  if (chartMonthlyInstance) {
    const monthlyLabels = Object.keys(monthlyCounts).sort();
    chartMonthlyInstance.data.labels = monthlyLabels;
    chartMonthlyInstance.data.datasets[0].data = monthlyLabels.map((label) => monthlyCounts[label]);
    chartMonthlyInstance.update();
  }

  if (chartDistrictInstance) {
    const districtLabels = Object.keys(districtCounts).sort();
    chartDistrictInstance.data.labels = districtLabels;
    chartDistrictInstance.data.datasets[0].data = districtLabels.map((label) => districtCounts[label]);
    chartDistrictInstance.update();
  }

  if (chartCountyInstance) {
    const countyLabels = Object.keys(countyCounts).sort();
    chartCountyInstance.data.labels = countyLabels;
    chartCountyInstance.data.datasets[0].data = countyLabels.map((label) => countyCounts[label]);
    chartCountyInstance.update();
  }

  if (chartFireTypeInstance) {
    const fireTypeLabels = Object.keys(fireTypeCounts).sort();
    chartFireTypeInstance.data.labels = fireTypeLabels;
    chartFireTypeInstance.data.datasets[0].data = fireTypeLabels.map((label) => fireTypeCounts[label]);
    chartFireTypeInstance.update();
  }
}

// Open Modal Ubah Status
function openEditModal(button, id, judul, currentStatus) {
  const adminResponse = button?.dataset?.adminResponse || '';
  document.getElementById('edit-laporan-id').value = id;
  document.getElementById('edit-judul-text').value = judul;
  document.getElementById('edit-status-select').value = currentStatus;
  document.getElementById('edit-admin-response').value = adminResponse;

  const modal = new bootstrap.Modal(document.getElementById('modalEditStatus'));
  modal.show();
}

// Save Report Status
async function saveReportStatus() {
  const id = document.getElementById('edit-laporan-id').value;
  const newStatus = document.getElementById('edit-status-select').value;
  const adminResponse = document.getElementById('edit-admin-response').value.trim();
  const token = getAuthToken();

  try {
    const response = await fetch(`${API_BASE_URL}/laporan/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus, respon_admin: adminResponse })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      const modalEl = document.getElementById('modalEditStatus');
      const modal = bootstrap.Modal.getInstance(modalEl);
      modal.hide();

      Swal.fire({
        title: 'Status Diperbarui',
          text: `Status laporan berhasil diubah menjadi "${newStatus}" dan balasan admin tersimpan.`,
          icon: 'success',
          timer: 1700,
          showCancelButton: false
      });

    } else {
      Swal.fire(
        'Gagal',
        result.message || 'Gagal memperbarui status.',
        'error'
      );
    }

  } catch (error) {
    console.error('Error saving report status:', error);
    Swal.fire(
      'Terjadi Kesalahan', 
      'Gagal memperbarui status ke server.', 
      'error'
    );
  }
}

// Delete Report Handler
function deleteLaporan(id, judul) {
  const token = getAuthToken();

  Swal.fire({
    title: 'Hapus Laporan ini?',
    text: `Anda yakin ingin menghapus laporan "${judul}"? Data yang telah dihapus tidak dapat dikembalikan.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Hapus Data',
    cancelButtonText: 'Batal'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_BASE_URL}/laporan/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const resData = await response.json();

        if (response.ok && resData.success) {
          Swal.fire({
            title: 'Berhasil Dihapus',
            text: 'Data laporan telah berhasil dihapus.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
          fetchAdminData();
        } else {
          Swal.fire('Gagal Menghapus', resData.message || 'Gagal menghapus laporan.', 'error');
        }

      } catch (err) {
        console.error('Error deleting report:', err);
        Swal.fire('Error', 'Terjadi kesalahan saat menghapus data.', 'error');
      }
    }
  });
}

async function fetchMasterData() {
  try {

    const token = getAuthToken();

    const headers = {
      'Authorization': `Bearer ${token}`
    };

    const baseUrl =
      `${API_BASE_URL.replace('/api', '')}/api/master`;

    const [
      kabupatenRes,
      kecamatanRes,
      posRes,
      petugasRes,
      perangkatRes
    ] = await Promise.all([

      fetch(`${baseUrl}/kabupaten`, {
        headers
      }),

      fetch(`${baseUrl}/kecamatan`, {
        headers
      }),

      fetch(`${baseUrl}/pos-damkar`, {
        headers
      }),

      fetch(`${baseUrl}/petugas`, {
        headers
      }),

      fetch(`${baseUrl}/perangkat`, {
        headers
      })

    ]);

    const kabupatenData = await kabupatenRes.json();
    const kecamatanData = await kecamatanRes.json();
    const posData = await posRes.json();
    const petugasData = await petugasRes.json();
    const perangkatData = await perangkatRes.json();

    renderMasterList(
      'kabupaten',
      kabupatenData.data || []
    );

    renderMasterList(
      'kecamatan',
      kecamatanData.data || []
    );

    renderMasterList(
      'pos-damkar',
      posData.data || []
    );

    renderMasterList(
      'petugas',
      petugasData.data || []
    );

    renderMasterList(
      'perangkat',
      perangkatData.data || []
    );

  } catch (error) {

    console.error(
      'Error fetching master data:',
      error
    );

  }
}

function renderMasterList(type, items) {
  const container = document.getElementById(`master-${type === 'pos-damkar' ? 'pos' : type === 'petugas' ? 'petugas' : type}-list`);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<div class="text-muted">Belum ada data.</div>';
    return;
  }

  const html = items.map((item) => {
    if (type === 'kabupaten') {
      return `<div class="d-flex justify-content-between align-items-center border-bottom py-2"><span>${escapeHtml(item.nama)}</span><div><button class="btn btn-link btn-sm p-0 text-warning me-2" onclick="openMasterModal('kabupaten', ${item.id}, ${JSON.stringify(item).replace(/"/g, '&quot;')})">Edit</button><button class="btn btn-link btn-sm p-0 text-danger" onclick="deleteMasterData('kabupaten', ${item.id})">Hapus</button></div></div>`;
    }

    if (type === 'kecamatan') {
      return `<div class="d-flex justify-content-between align-items-center border-bottom py-2"><span>${escapeHtml(item.nama)}${item.kabupaten_nama ? ` • ${escapeHtml(item.kabupaten_nama)}` : ''}</span><div><button class="btn btn-link btn-sm p-0 text-warning me-2" onclick="openMasterModal('kecamatan', ${item.id}, ${JSON.stringify(item).replace(/"/g, '&quot;')})">Edit</button><button class="btn btn-link btn-sm p-0 text-danger" onclick="deleteMasterData('kecamatan', ${item.id})">Hapus</button></div></div>`;
    }

    if (type === 'pos-damkar') {
      return `<div class="d-flex justify-content-between align-items-center border-bottom py-2"><span>${escapeHtml(item.nama)}${item.kecamatan_nama ? ` • ${escapeHtml(item.kecamatan_nama)}` : ''}</span><div><button class="btn btn-link btn-sm p-0 text-warning me-2" onclick="openMasterModal('pos-damkar', ${item.id}, ${JSON.stringify(item).replace(/"/g, '&quot;')})">Edit</button><button class="btn btn-link btn-sm p-0 text-danger" onclick="deleteMasterData('pos-damkar', ${item.id})">Hapus</button></div></div>`;
    }

    if (type === 'perangkat') {
      return `<div class="d-flex justify-content-between align-items-center border-bottom py-2"><span>${escapeHtml(item.nama)} • ${escapeHtml(item.jenis)} • ${escapeHtml(item.status || 'Siap Pakai')}${item.petugas_nama ? ` • ${escapeHtml(item.petugas_nama)}` : ''}</span><div><button class="btn btn-link btn-sm p-0 text-warning me-2" onclick="openMasterModal('perangkat', ${item.id}, ${JSON.stringify(item).replace(/"/g, '&quot;')})">Edit</button><button class="btn btn-link btn-sm p-0 text-danger" onclick="deleteMasterData('perangkat', ${item.id})">Hapus</button></div></div>`;
    }

    return `<div class="d-flex justify-content-between align-items-center border-bottom py-2"><span>${escapeHtml(item.nama)}${item.pos_nama ? ` • ${escapeHtml(item.pos_nama)}` : ''}</span><div><button class="btn btn-link btn-sm p-0 text-warning me-2" onclick="openMasterModal('petugas', ${item.id}, ${JSON.stringify(item).replace(/"/g, '&quot;')})">Edit</button><button class="btn btn-link btn-sm p-0 text-danger" onclick="deleteMasterData('petugas', ${item.id})">Hapus</button></div></div>`;
  }).join('');

  container.innerHTML = html;
}

function openMasterModal(type, id = null, data = null) {
  const modalTitle = document.getElementById('master-modal-title');
  const typeInput = document.getElementById('master-type');
  const idInput = document.getElementById('master-id');
  const formFields = document.getElementById('master-form-fields');

  typeInput.value = type;
  idInput.value = id || '';
  modalTitle.innerHTML = `<i class="bi bi-pencil-square text-danger me-2"></i>${type === 'kabupaten' ? 'Kabupaten' : type === 'kecamatan' ? 'Kecamatan' : type === 'pos-damkar' ? 'Pos Damkar' : 'Petugas'}`;

  let fieldsHtml = '';

  if (type === 'kabupaten') {
    fieldsHtml = `
      <div class="mb-3">
        <label class="form-label fw-bold">Nama Kabupaten</label>
        <input type="text" id="master-name" class="form-control" value="${data ? escapeHtml(data.nama) : ''}">
      </div>
    `;
  } else if (type === 'kecamatan') {
    fieldsHtml = `
      <div class="mb-3">
        <label class="form-label fw-bold">Nama Kecamatan</label>
        <input type="text" id="master-name" class="form-control" value="${data ? escapeHtml(data.nama) : ''}">
      </div>
      <div class="mb-3">
        <label class="form-label fw-bold">Kabupaten</label>
        <select id="master-kabupaten-id" class="form-select"></select>
      </div>
    `;
  } else if (type === 'pos-damkar') {
    fieldsHtml = `
      <div class="mb-3">
        <label class="form-label fw-bold">Nama Pos</label>
        <input type="text" id="master-name" class="form-control" value="${data ? escapeHtml(data.nama) : ''}">
      </div>
      <div class="mb-3">
        <label class="form-label fw-bold">Alamat</label>
        <input type="text" id="master-alamat" class="form-control" value="${data ? escapeHtml(data.alamat || '') : ''}">
      </div>
      <div class="mb-3">
        <label class="form-label fw-bold">Kecamatan</label>
        <select id="master-kecamatan-id" class="form-select"></select>
      </div>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label fw-bold">Latitude</label>
          <input type="text" id="master-latitude" class="form-control" value="${data ? escapeHtml(data.latitude || '') : ''}">
        </div>
        <div class="col-md-6">
          <label class="form-label fw-bold">Longitude</label>
          <input type="text" id="master-longitude" class="form-control" value="${data ? escapeHtml(data.longitude || '') : ''}">
        </div>
      </div>
    `;
  } else if (type === 'petugas') {
    fieldsHtml = `
      <div class="mb-3">
        <label class="form-label fw-bold">Nama Petugas</label>
        <input type="text" id="master-name" class="form-control" value="${data ? escapeHtml(data.nama) : ''}">
      </div>
      <div class="mb-3">
        <label class="form-label fw-bold">NIP</label>
        <input type="text" id="master-nip" class="form-control" value="${data ? escapeHtml(data.nip || '') : ''}">
      </div>
      <div class="mb-3">
        <label class="form-label fw-bold">Jabatan</label>
        <input type="text" id="master-jabatan" class="form-control" value="${data ? escapeHtml(data.jabatan || '') : ''}">
      </div>
      <div class="mb-3">
        <label class="form-label fw-bold">Pos Damkar</label>
        <select id="master-pos-id" class="form-select"></select>
      </div>
      <div class="mb-3">
        <label class="form-label fw-bold">Nomor HP</label>
        <input type="text" id="master-phone" class="form-control" value="${data ? escapeHtml(data.nomor_hp || '') : ''}">
      </div>
      <div class="mb-3">
        <label class="form-label fw-bold">Status</label>
        <select id="master-status" class="form-select">
          <option value="Aktif" ${data && data.status === 'Aktif' ? 'selected' : ''}>Aktif</option>
          <option value="Tidak Aktif" ${data && data.status === 'Tidak Aktif' ? 'selected' : ''}>Tidak Aktif</option>
        </select>
      </div>
    `;
  } else {
    fieldsHtml = `
      <div class="mb-3">
        <label class="form-label fw-bold">Nama Perangkat</label>
        <input type="text" id="master-name" class="form-control" value="${data ? escapeHtml(data.nama) : ''}">
      </div>
      <div class="mb-3">
        <label class="form-label fw-bold">Jenis</label>
        <select id="master-jenis" class="form-select">
          <option value="HP" ${data && data.jenis === 'HP' ? 'selected' : ''}>HP</option>
          <option value="Tablet" ${data && data.jenis === 'Tablet' ? 'selected' : ''}>Tablet</option>
          <option value="Laptop" ${data && data.jenis === 'Laptop' ? 'selected' : ''}>Laptop</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label fw-bold">Status</label>
        <select id="master-status" class="form-select">
          <option value="Siap Pakai" ${data && data.status === 'Siap Pakai' ? 'selected' : ''}>Siap Pakai</option>
          <option value="Rusak" ${data && data.status === 'Rusak' ? 'selected' : ''}>Rusak</option>
          <option value="Dipinjam" ${data && data.status === 'Dipinjam' ? 'selected' : ''}>Dipinjam</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label fw-bold">Petugas</label>
        <select id="master-petugas-id" class="form-select"></select>
      </div>
    `;
  }

  formFields.innerHTML = fieldsHtml;
  populateMasterSelects(type, data);
  const modal = new bootstrap.Modal(document.getElementById('modalMasterData'));
  modal.show();
}

async function populateMasterSelects(type, data) {
  const baseUrl = `${API_BASE_URL.replace('/api', '')}/api/master`;

  if (type === 'kecamatan') {
    const res = await fetch(`${baseUrl}/kabupaten`);
    const result = await res.json();
    const select = document.getElementById('master-kabupaten-id');
    select.innerHTML = '<option value="">-- Pilih Kabupaten --</option>' + (result.data || []).map((item) => `<option value="${item.id}" ${data && String(data.kabupaten_id) === String(item.id) ? 'selected' : ''}>${escapeHtml(item.nama)}</option>`).join('');
  }

  if (type === 'pos-damkar') {
    const res = await fetch(`${baseUrl}/kecamatan`);
    const result = await res.json();
    const select = document.getElementById('master-kecamatan-id');
    select.innerHTML = '<option value="">-- Pilih Kecamatan --</option>' + (result.data || []).map((item) => `<option value="${item.id}" ${data && String(data.kecamatan_id) === String(item.id) ? 'selected' : ''}>${escapeHtml(item.nama)}</option>`).join('');
  }

  if (type === 'petugas') {
    const res = await fetch(`${baseUrl}/pos-damkar`);
    const result = await res.json();
    const select = document.getElementById('master-pos-id');
    select.innerHTML = '<option value="">-- Pilih Pos Damkar --</option>' + (result.data || []).map((item) => `<option value="${item.id}" ${data && String(data.pos_damkar_id) === String(item.id) ? 'selected' : ''}>${escapeHtml(item.nama)}</option>`).join('');
  }

  if (type === 'perangkat') {
    const res = await fetch(`${baseUrl}/petugas`);
    const result = await res.json();
    const select = document.getElementById('master-petugas-id');
    select.innerHTML = '<option value="">-- Pilih Petugas --</option>' + (result.data || []).map((item) => `<option value="${item.id}" ${data && String(data.petugas_id) === String(item.id) ? 'selected' : ''}>${escapeHtml(item.nama)}</option>`).join('');
  }
}

async function saveMasterData() {
  const type = document.getElementById('master-type').value;
  const id = document.getElementById('master-id').value;
  const name = document.getElementById('master-name')?.value || '';
  const token = getAuthToken();

  const payload = { nama: name };

  if (type === 'kecamatan') {
    payload.kabupaten_id = document.getElementById('master-kabupaten-id')?.value || null;
  } else if (type === 'pos-damkar') {
    payload.alamat = document.getElementById('master-alamat')?.value || '';
    payload.kecamatan_id = document.getElementById('master-kecamatan-id')?.value || null;
    payload.latitude = document.getElementById('master-latitude')?.value || '';
    payload.longitude = document.getElementById('master-longitude')?.value || '';
  } else if (type === 'petugas') {
    payload.nip = document.getElementById('master-nip')?.value || '';
    payload.jabatan = document.getElementById('master-jabatan')?.value || '';
    payload.pos_damkar_id = document.getElementById('master-pos-id')?.value || null;
    payload.nomor_hp = document.getElementById('master-phone')?.value || '';
    payload.status = document.getElementById('master-status')?.value || 'Aktif';
  } else if (type === 'perangkat') {
    payload.jenis = document.getElementById('master-jenis')?.value || 'HP';
    payload.status = document.getElementById('master-status')?.value || 'Siap Pakai';
    payload.petugas_id = document.getElementById('master-petugas-id')?.value || null;
  }

  const method = id ? 'PUT' : 'POST';
  const url = `${API_BASE_URL.replace('/api', '')}/api/master/${type}${id ? `/${id}` : ''}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (response.ok && result.success) {
      Swal.fire({ title: 'Berhasil', text: 'Data master berhasil disimpan.', icon: 'success', timer: 1200, showConfirmButton: false });
      bootstrap.Modal.getInstance(document.getElementById('modalMasterData')).hide();
      fetchMasterData();
    } else {
      Swal.fire('Gagal', result.message || 'Gagal menyimpan data.', 'error');
    }
  } catch (error) {
    console.error('Error saving master data:', error);
    Swal.fire('Error', 'Terjadi kesalahan saat menyimpan data.', 'error');
  }
}

async function deleteMasterData(type, id) {
  const token = getAuthToken();
  const result = await Swal.fire({
    title: 'Hapus data ini?',
    text: 'Tindakan ini tidak dapat dibatalkan.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, hapus',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/master/${type}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();

    if (response.ok && data.success) {
      Swal.fire({ title: 'Berhasil', text: 'Data dihapus.', icon: 'success', timer: 1000, showConfirmButton: false });
      fetchMasterData();
    } else {
      Swal.fire('Gagal', data.message || 'Gagal menghapus data.', 'error');
    }
  } catch (error) {
    console.error('Error deleting master data:', error);
    Swal.fire('Error', 'Terjadi kesalahan saat menghapus data.', 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============================================================
   KELOLA & GRAFIK STATISTIK ARSIP DATA OPERASIONAL JS
   ============================================================ */

let chartArsipStatistikInstance = null;
let activeArsipPeriodeMode = 'tahun';
let activeArsipSumberDataMode = 'isi';
let activeArsipChartType = 'wave'; // 'bar' atau 'doughnut' (Gelembung / Donut)
let selectedArsipChartFilter = null;
let selectedArsipIds = new Set();
let currentAvailableFolders = ['Umum'];
let allFetchedArsipData = [];
let currentArsipList = [];
let explorerActiveFolder = 'Semua';
let explorerSearchQuery = '';
let explorerSelectedIds = new Set();
const ARCHIVE_FOLDER_STATE_KEY = 'damkarArchiveFolderState';

function normalizeArchiveFolderPath(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '').trim();
}

function getArchiveFolderState() {
  try {
    const raw = localStorage.getItem(ARCHIVE_FOLDER_STATE_KEY);
    if (!raw) return { folders: {}, files: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { folders: {}, files: [] };
    return {
      folders: parsed.folders && typeof parsed.folders === 'object' ? parsed.folders : {},
      files: Array.isArray(parsed.files) ? parsed.files : []
    };
  } catch (error) {
    return { folders: {}, files: [] };
  }
}

function saveArchiveFolderState(state) {
  try {
    localStorage.setItem(ARCHIVE_FOLDER_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Gagal menyimpan state folder arsip di localStorage:', error.message);
  }
}

function removeArchiveFolderFromLocalState(folderName) {
  const state = getArchiveFolderState();
  const targetPath = normalizeArchiveFolderPath(folderName);
  const targetKey = (targetPath || '').toLowerCase();
  if (!targetPath || !targetKey) return;

  const updatedFolders = { ...(state.folders || {}) };
  Object.keys(updatedFolders).forEach((key) => {
    const item = updatedFolders[key];
    if (!item || item.kind !== 'folder') return;

    const itemPath = normalizeArchiveFolderPath(item.path || item.name || '');
    const itemKey = itemPath.toLowerCase();
    const shouldRemove = itemKey === targetKey || itemKey.startsWith(`${targetKey}/`);
    if (shouldRemove) delete updatedFolders[key];
  });

  const updatedFiles = (state.files || []).filter((file) => {
    const filePath = normalizeArchiveFolderPath(file.path || file.relativePath || '');
    const parentPath = normalizeArchiveFolderPath(file.parentFolderPath || '');
    const rootPath = normalizeArchiveFolderPath(file.rootFolderPath || '');
    const fileKey = filePath.toLowerCase();
    const parentKey = parentPath.toLowerCase();
    const rootKey = rootPath.toLowerCase();
    return !(fileKey === targetKey || fileKey.startsWith(`${targetKey}/`) || parentKey === targetKey || rootKey === targetKey);
  });

  saveArchiveFolderState({ folders: updatedFolders, files: updatedFiles });
}

function getArchiveRootFolders() {
  const state = getArchiveFolderState();
  const rootPaths = new Set();
  Object.values(state.folders || {}).forEach(folder => {
    if (folder && folder.kind === 'folder' && !folder.parentPath) {
      const path = normalizeArchiveFolderPath(folder.path);
      if (path) rootPaths.add(path.split('/')[0]);
    }
  });
  (currentAvailableFolders || []).forEach(folder => {
    const path = normalizeArchiveFolderPath(folder);
    if (path) rootPaths.add(path.split('/')[0]);
  });
  return Array.from(rootPaths).sort((a, b) => a.localeCompare(b));
}

function getArchiveFolderChildren(folderPath) {
  const state = getArchiveFolderState();
  const normalizedPath = normalizeArchiveFolderPath(folderPath);
  if (!normalizedPath || normalizedPath === 'Semua') {
    return { folders: [], files: [] };
  }

  const folderMap = new Map();
  Object.values(state.folders || {})
    .filter(folder => folder && folder.kind === 'folder' && normalizeArchiveFolderPath(folder.parentPath) === normalizedPath)
    .forEach(folder => {
      const path = normalizeArchiveFolderPath(folder.path || folder.name);
      if (path) folderMap.set(path.toLowerCase(), { ...folder, path });
    });

  (currentAvailableFolders || []).forEach(folder => {
    const path = normalizeArchiveFolderPath(folder);
    const prefix = `${normalizedPath}/`;
    if (!path.toLowerCase().startsWith(prefix.toLowerCase())) return;

    const remainder = path.slice(prefix.length);
    const childName = remainder.split('/')[0];
    if (!childName) return;

    const childPath = `${normalizedPath}/${childName}`;
    const key = childPath.toLowerCase();
    if (!folderMap.has(key)) {
      folderMap.set(key, {
        id: `db-folder-${key}`,
        name: childName,
        path: childPath,
        parentPath: normalizedPath,
        kind: 'folder'
      });
    }
  });

  const folders = Array.from(folderMap.values())
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const files = (state.files || [])
    .filter(file => normalizeArchiveFolderPath(file.parentFolderPath) === normalizedPath)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return { folders, files };
}

function getArchiveFolderFileCount(folderPath) {
  const normalizedPath = normalizeArchiveFolderPath(folderPath);
  if (!normalizedPath || normalizedPath === 'Semua') {
    return 0;
  }

  const folderKey = normalizedPath.toLowerCase();
  const databaseCount = (allFetchedArsipData || []).filter(item => {
    const itemFolder = normalizeArchiveFolderPath(item.nama_folder || 'Umum').toLowerCase();
    return itemFolder === folderKey || itemFolder.startsWith(`${folderKey}/`);
  }).length;

  const state = getArchiveFolderState();
  const localCount = (state.files || []).filter(file => {
    const filePath = normalizeArchiveFolderPath(file.path || file.relativePath || '').toLowerCase();
    const parentPath = normalizeArchiveFolderPath(file.parentFolderPath || '').toLowerCase();
    return filePath.startsWith(`${folderKey}/`) || parentPath === folderKey || filePath === folderKey;
  }).length;

  return Math.max(databaseCount, localCount);
}

function getArchiveFolderDirectFiles(folderPath) {
  const state = getArchiveFolderState();
  const normalizedPath = normalizeArchiveFolderPath(folderPath);
  if (!normalizedPath || normalizedPath === 'Semua') {
    return [];
  }

  return (state.files || [])
    .filter(file => normalizeArchiveFolderPath(file.parentFolderPath || '') === normalizedPath)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

function registerUploadedFolderStructure(folderName, uploadedFiles, sourceRootName = '') {
  const state = getArchiveFolderState();
  const folderMap = { ...(state.folders || {}) };
  const fileList = Array.isArray(state.files) ? [...state.files] : [];
  const rootFolderPath = normalizeArchiveFolderPath(folderName || 'Umum');
  if (!rootFolderPath) return;

  const rootFolderKey = rootFolderPath;
  const rootFolderId = `folder-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  if (!folderMap[rootFolderKey]) {
    folderMap[rootFolderKey] = {
      id: rootFolderId,
      name: rootFolderPath.split('/').pop() || rootFolderPath,
      path: rootFolderPath,
      parentPath: null,
      kind: 'folder'
    };
  }

  const seenPaths = new Set(fileList.map(file => normalizeArchiveFolderPath(file.path || file.relativePath || '') ));
  (uploadedFiles || []).forEach(file => {
    const rawRelativePath = normalizeArchiveFolderPath(file && (file.webkitRelativePath || file.name));
    if (!rawRelativePath) return;

    const segments = rawRelativePath.split('/').filter(Boolean);
    if (segments.length === 0) return;

    let folderPath = rootFolderPath;
    const rootPrefix = normalizeArchiveFolderPath(sourceRootName || rootFolderPath).toLowerCase();
    const relativeSegments = segments.slice();
    if (relativeSegments[0] && relativeSegments[0].toLowerCase() === rootPrefix) {
      relativeSegments.shift();
    }

    if (relativeSegments.length > 1) {
      const parentSegments = relativeSegments.slice(0, -1);
      let currentParentPath = rootFolderPath;
      parentSegments.forEach((segment, index) => {
        const childPath = `${rootFolderPath}/${parentSegments.slice(0, index + 1).join('/')}`;
        if (!folderMap[childPath]) {
          folderMap[childPath] = {
            id: `folder-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            name: segment,
            path: childPath,
            parentPath: currentParentPath,
            kind: 'folder'
          };
        }
        currentParentPath = childPath;
      });
      folderPath = `${rootFolderPath}/${parentSegments.join('/')}`;
    }

    const fileName = relativeSegments.length > 0 ? relativeSegments[relativeSegments.length - 1] : segments[segments.length - 1];
    const normalizedFilePath = normalizeArchiveFolderPath([rootFolderPath, ...relativeSegments].join('/'));
    if (seenPaths.has(normalizedFilePath)) return;

    seenPaths.add(normalizedFilePath);
    fileList.push({
      id: `file-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: fileName,
      path: normalizedFilePath,
      parentFolderPath: folderPath,
      rootFolderPath,
      size: Number(file.size || 0),
      type: (file.name || '').split('.').pop() || 'file',
      kind: 'file'
    });
  });

  saveArchiveFolderState({ folders: folderMap, files: fileList });
}

function getMergedArchiveFolders() {
  const state = getArchiveFolderState();
  const folderNames = new Set();

  (currentAvailableFolders || []).forEach(folder => {
    if (folder && folder.trim() !== '') folderNames.add(folder.trim());
  });

  Object.values(state.folders || {}).forEach(folder => {
    if (folder && folder.kind === 'folder') {
      const itemPath = normalizeArchiveFolderPath(folder.path || folder.name || '');
      if (itemPath) folderNames.add(itemPath.split('/')[0]);
    }
  });

  return Array.from(folderNames)
    .filter(Boolean)
    .filter((name) => name.toLowerCase() !== 'semua')
    .sort((a, b) => a.localeCompare(b));
}

function formatBytes(bytes, decimals = 2) {
  if (!bytes || parseInt(bytes, 10) === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFileBadgeHtml(tipeFile) {
  const ext = (tipeFile || '').toLowerCase().replace('.', '');
  switch (ext) {
    case 'pdf':
      return `<span class="badge bg-danger-subtle text-danger border border-danger-subtle"><i class="bi bi-file-earmark-pdf-fill me-1"></i>PDF</span>`;
    case 'doc':
    case 'docx':
      return `<span class="badge bg-primary-subtle text-primary border border-primary-subtle"><i class="bi bi-file-earmark-word-fill me-1"></i>DOCX</span>`;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return `<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-file-earmark-excel-fill me-1"></i>EXCEL</span>`;
    case 'zip':
    case 'rar':
    case '7z':
      return `<span class="badge bg-warning-subtle text-warning border border-warning-subtle"><i class="bi bi-file-earmark-zip-fill me-1"></i>ZIP</span>`;
    case 'json':
    case 'geojson':
    case 'mpk':
    case 'shp':
      return `<span class="badge bg-info-subtle text-info border border-info-subtle"><i class="bi bi-map-fill me-1"></i>SPASIAL</span>`;
    case 'qmd':
    case 'md':
      return `<span class="badge bg-primary-subtle text-primary border border-primary-subtle"><i class="bi bi-file-earmark-text-fill me-1"></i>DOKUMEN</span>`;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
      return `<span class="badge bg-purple-subtle text-purple border border-purple-subtle" style="background-color: #f3e8ff; color: #7e22ce;"><i class="bi bi-file-earmark-image-fill me-1"></i>GAMBAR</span>`;
    default:
      return `<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle"><i class="bi bi-file-earmark-fill me-1"></i>${ext.toUpperCase() || 'FILE'}</span>`;
  }
}

// MULTI-SELECT & BATCH FOLDER FUNCTIONS
function toggleSelectAllArsip(selectAllCheckbox) {
  const checkboxes = document.querySelectorAll('.arsip-row-check');
  checkboxes.forEach(cb => {
    cb.checked = selectAllCheckbox.checked;
    const id = parseInt(cb.dataset.id, 10);
    if (selectAllCheckbox.checked) {
      selectedArsipIds.add(id);
    } else {
      selectedArsipIds.delete(id);
    }
  });
  updateArsipBatchActionBar();
}

function toggleArsipSelection(id, cbElement) {
  const fileId = parseInt(id, 10);
  if (cbElement.checked) {
    selectedArsipIds.add(fileId);
  } else {
    selectedArsipIds.delete(fileId);
  }
  updateArsipBatchActionBar();
}

function updateArsipBatchActionBar() {
  const actionBar = document.getElementById('arsip-batch-action-bar');
  const countBadge = document.getElementById('arsip-selected-count');
  const selectAllCb = document.getElementById('arsip-select-all');

  if (countBadge) countBadge.textContent = selectedArsipIds.size;

  if (actionBar) {
    if (selectedArsipIds.size > 0) {
      actionBar.classList.remove('d-none');
    } else {
      actionBar.classList.add('d-none');
    }
  }

  const allCheckboxes = document.querySelectorAll('.arsip-row-check');
  if (selectAllCb && allCheckboxes.length > 0) {
    selectAllCb.checked = Array.from(allCheckboxes).every(cb => cb.checked);
  }
}

function clearArsipSelections() {
  selectedArsipIds.clear();
  const selectAllCb = document.getElementById('arsip-select-all');
  if (selectAllCb) selectAllCb.checked = false;
  const checkboxes = document.querySelectorAll('.arsip-row-check');
  checkboxes.forEach(cb => { cb.checked = false; });
  updateArsipBatchActionBar();
}

let activeSelectedFolder = 'Semua';

async function renameFolderPrompt(event, oldFolderName) {
  if (event) event.stopPropagation();

  if (!oldFolderName || oldFolderName.toLowerCase() === 'umum' || oldFolderName.toLowerCase() === 'semua') {
    Swal.fire('Info', 'Folder bawaan sistem (Umum/Semua) tidak dapat diubah namanya.', 'info');
    return;
  }

  const { value: newName } = await Swal.fire({
    title: `Ubah Nama Folder "${oldFolderName}"`,
    input: 'text',
    inputValue: oldFolderName,
    inputLabel: 'Nama Folder Baru:',
    inputPlaceholder: 'Ketik nama folder baru...',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Simpan Nama Baru',
    cancelButtonText: 'Batal',
    inputValidator: (val) => {
      if (!val || !val.trim()) {
        return 'Nama folder tidak boleh kosong!';
      }
    }
  });

  if (!newName || newName.trim() === '' || newName.trim().toLowerCase() === oldFolderName.trim().toLowerCase()) return;

  const targetName = newName.trim();
  const token = getAuthToken();

  try {
    const response = await fetch(`${API_BASE_URL}/arsip/folders/rename`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        old_name: oldFolderName,
        new_name: targetName
      })
    });

    const data = await response.json();
    if (response.ok && data.success) {
      Swal.fire({
        icon: 'success',
        title: 'Nama Folder Diperbarui',
        text: data.message || `Folder berhasil diubah namanya menjadi "${targetName}".`,
        timer: 1800,
        showConfirmButton: false
      });

      if (activeSelectedFolder.trim().toLowerCase() === oldFolderName.trim().toLowerCase()) activeSelectedFolder = targetName;
      if (explorerActiveFolder.trim().toLowerCase() === oldFolderName.trim().toLowerCase()) explorerActiveFolder = targetName;

      fetchArsipData();
    } else {
      Swal.fire('Gagal Ubah Nama', data.message || 'Gagal mengubah nama folder.', 'error');
    }
  } catch (err) {
    console.error('Error renaming folder:', err);
    Swal.fire('Error', 'Terjadi kesalahan saat mengubah nama folder.', 'error');
  }
}

function downloadFolderFiles(event, folderName) {
  if (event) event.stopPropagation();

  let targetFiles = Array.isArray(allFetchedArsipData) ? [...allFetchedArsipData] : [];
  if (folderName && folderName !== 'Semua') {
    targetFiles = targetFiles.filter(item => (item.nama_folder || 'Umum').trim().toLowerCase() === folderName.trim().toLowerCase());
  }

  if (targetFiles.length === 0) {
    Swal.fire('Info', `Belum ada berkas tersimpan di dalam folder "${folderName}".`, 'info');
    return;
  }

  Swal.fire({
    title: `Download Berkas Folder "${folderName}"?`,
    text: `Terdapat ${targetFiles.length} berkas di dalam folder ini. Klik Mulai Download untuk mengunduh berkas.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: `Mulai Download (${targetFiles.length} Berkas)`,
    cancelButtonText: 'Batal'
  }).then((res) => {
    if (res.isConfirmed) {
      targetFiles.forEach((file, index) => {
        setTimeout(() => {
          const downloadUrl = `${API_BASE_URL}/arsip/${file.id}/download`;
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = file.nama_asli || 'berkas_arsip';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, index * 400);
      });
    }
  });
}


async function deleteFolderConfirm(event, folderName) {
  if (event) event.stopPropagation();

  if (!folderName || folderName.toLowerCase() === 'umum' || folderName.toLowerCase() === 'semua') {
    Swal.fire('Info', 'Folder bawaan sistem (Umum/Semua) tidak dapat dihapus.', 'info');
    return;
  }

  const confirmRes = await Swal.fire({
    title: `Hapus Folder "${folderName}"?`,
    text: `Folder, seluruh subfolder, dan semua berkas di dalamnya akan dihapus permanen dari database dan laptop server. Data tidak dapat dipulihkan.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Ya, Hapus Folder',
    cancelButtonText: 'Batal'
  });

  if (!confirmRes.isConfirmed) return;

  const token = getAuthToken();

  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/arsip/folders/${encodeURIComponent(folderName)}`, {
      method: 'DELETE',
      headers: headers
    });

    const data = await response.json();
    if (response.ok && data.success) {
      Swal.fire({
        icon: 'success',
        title: 'Folder Dihapus',
        text: data.message || `Folder "${folderName}" dan seluruh isinya berhasil dihapus permanen.`,
        timer: 1800,
        showConfirmButton: false
      });

      const folderKey = folderName.trim().toLowerCase();
      currentAvailableFolders = currentAvailableFolders.filter(f => (f || '').trim().toLowerCase() !== folderKey);
      allFetchedArsipData = allFetchedArsipData.filter(item => ((item.nama_folder || 'Umum').trim().toLowerCase() !== folderKey));
      currentArsipList = currentArsipList.filter(item => ((item.nama_folder || 'Umum').trim().toLowerCase() !== folderKey));
      selectedArsipIds.clear();
      explorerSelectedIds.clear();
      removeArchiveFolderFromLocalState(folderName);

      activeSelectedFolder = 'Semua';
      explorerActiveFolder = 'Semua';
      const filterSelect = document.getElementById('filter-arsip-folder');
      if (filterSelect) filterSelect.value = 'Semua';

      renderArsipFolderGrid(currentAvailableFolders, allFetchedArsipData);
      renderExplorerFolderGrid();
      renderExplorerFilesTable();
      fetchArsipData();
    } else {
      Swal.fire('Gagal Hapus', data.message || 'Gagal menghapus folder.', 'error');
    }
  } catch (err) {
    console.error('Error deleting folder:', err);
    Swal.fire('Error', 'Terjadi kesalahan saat menghapus folder.', 'error');
  }
}


function renderArsipFolderGrid(availableFolders = [], arsipDataList = []) {
  const gridContainer = document.getElementById('arsip-folder-grid');
  const countBadge = document.getElementById('arsip-folder-count-badge');
  if (!gridContainer) return;

  const uniqueFolderSet = new Set();
  const folders = [];
  (availableFolders || []).forEach(f => {
    const trimmed = (f || '').trim();
    if (trimmed && !uniqueFolderSet.has(trimmed.toLowerCase())) {
      uniqueFolderSet.add(trimmed.toLowerCase());
      folders.push(trimmed);
    }
  });
  if (folders.length === 0) folders.push('Umum');

  if (countBadge) countBadge.textContent = `${folders.length} Folder`;

  const countsMap = {};
  if (Array.isArray(arsipDataList)) {
    arsipDataList.forEach(item => {
      const folderName = (item.nama_folder || 'Umum').trim();
      const matchName = folders.find(f => f.toLowerCase() === folderName.toLowerCase()) || folderName;
      countsMap[matchName] = (countsMap[matchName] || 0) + 1;
    });
  }

  const state = getArchiveFolderState();
  const stateFiles = Array.isArray(state.files) ? state.files : [];
  if (stateFiles.length > 0) {
    folders.forEach(folderName => {
      const normalizedFolder = normalizeArchiveFolderPath(folderName);
      countsMap[folderName] = getArchiveFolderFileCount(normalizedFolder);
    });
  }

  let cardsHtml = `
    <div class="col-md-3 col-sm-6">
      <div class="p-3 border rounded-3 bg-white d-flex align-items-center justify-content-between shadow-sm cursor-pointer ${activeSelectedFolder === 'Semua' ? 'border-danger border-2' : ''}" onclick="filterByFolderCard('Semua')">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-collection-fill text-danger fs-3"></i>
          <div>
            <strong class="d-block text-dark small mb-0">Semua Berkas</strong>
            <small class="text-muted">${arsipDataList.length} Total Berkas</small>
          </div>
        </div>
        ${activeSelectedFolder === 'Semua' ? '<span class="badge bg-danger">Aktif</span>' : ''}
      </div>
    </div>
  `;

  cardsHtml += folders.map(fName => {
    const normalizedPath = normalizeArchiveFolderPath(fName);
    const fileCount = getArchiveFolderFileCount(normalizedPath) || countsMap[fName] || 0;
    const isActive = activeSelectedFolder.toLowerCase() === fName.toLowerCase();
    const isSystemFolder = fName.toLowerCase() === 'umum' || fName.toLowerCase() === 'semua';
    return `
      <div class="col-md-3 col-sm-6">
        <div class="p-3 border rounded-3 bg-white d-flex align-items-center justify-content-between shadow-sm cursor-pointer ${isActive ? 'border-danger border-2' : ''}" onclick="filterByFolderCard('${escapeHtml(fName)}')">
          <div class="d-flex align-items-center gap-2 text-truncate">
            <i class="bi bi-folder-fill text-warning fs-3 flex-shrink-0"></i>
            <div class="text-truncate">
              <strong class="d-block text-dark small mb-0 text-truncate" title="${escapeHtml(fName)}">${escapeHtml(fName)}</strong>
              <small class="text-muted">${fileCount} File Arsip</small>
            </div>
          </div>
          <div class="d-flex align-items-center gap-1 flex-shrink-0">
            ${isActive ? '<span class="badge bg-danger me-1">Aktif</span>' : ''}
            <div class="dropdown" onclick="event.stopPropagation();">
              <button class="btn btn-sm btn-light border-0 text-muted p-1 rounded-circle" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Opsi Folder ${escapeHtml(fName)}">
                <i class="bi bi-three-dots-vertical fs-6"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow border-0 text-start" style="font-size: 0.85rem;">
                ${!isSystemFolder ? `<li><a class="dropdown-item py-2 fw-semibold" href="#" onclick="renameFolderPrompt(event, '${escapeHtml(fName)}'); return false;"><i class="bi bi-pencil-square text-warning me-2"></i> Ubah Nama Folder</a></li>` : ''}
                <li><a class="dropdown-item py-2 fw-semibold" href="#" onclick="downloadFolderFiles(event, '${escapeHtml(fName)}'); return false;"><i class="bi bi-download text-primary me-2"></i> Download Berkas Folder</a></li>
                ${!isSystemFolder ? `<li><hr class="dropdown-divider my-1"></li><li><a class="dropdown-item py-2 fw-semibold text-danger" href="#" onclick="deleteFolderConfirm(event, '${escapeHtml(fName)}'); return false;"><i class="bi bi-trash-fill text-danger me-2"></i> Hapus Folder</a></li>` : ''}
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  gridContainer.innerHTML = cardsHtml;
}

function filterByFolderCard(folderName) {
  activeSelectedFolder = folderName;
  const selectFolder = document.getElementById('filter-arsip-folder');
  if (selectFolder) {
    selectFolder.value = folderName;
  }
  fetchArsipData();
}

function triggerDirectDrivePicker(event) {
  if (event) event.preventDefault();
  if (!explorerActiveFolder || explorerActiveFolder === 'Semua') {
    Swal.fire({
      icon: 'info',
      title: 'Pilih Folder Terlebih Dahulu',
      text: 'Silakan klik dan buka salah satu folder tujuan sebelum mengunggah file berkas.',
      confirmButtonColor: '#dc3545'
    });
    return;
  }
  const input = document.getElementById('direct-drive-file-input');
  if (input) {
    input.value = '';
    input.click();
  }
}

function triggerDirectDriveFolderPicker(event) {
  if (event) event.preventDefault();
  if (!explorerActiveFolder || explorerActiveFolder === 'Semua') {
    Swal.fire({
      icon: 'info',
      title: 'Pilih Folder Terlebih Dahulu',
      text: 'Silakan klik dan buka salah satu folder tujuan sebelum mengunggah folder.',
      confirmButtonColor: '#0d6efd'
    });
    return;
  }
  const input = document.getElementById('direct-drive-folder-input');
  if (input) {
    input.value = '';
    input.click();
  }
}

function openFolderAndUploadFile(event, folderName) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  selectExplorerFolder(folderName);
  setTimeout(() => {
    const input = document.getElementById('direct-drive-file-input');
    if (input) {
      input.value = '';
      input.click();
    }
  }, 100);
}

function openFolderAndUploadSubfolder(event, folderName) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  selectExplorerFolder(folderName);
  setTimeout(() => {
    const input = document.getElementById('direct-drive-folder-input');
    if (input) {
      input.value = '';
      input.click();
    }
  }, 100);
}

/**
 * Membaca semua file dan struktur folder secara rekursif dari event Drag & Drop
 */
async function extractEntriesFromDataTransfer(dataTransfer) {
  const items = dataTransfer.items;
  const results = [];
  let rootDetectedName = '';

  async function readEntry(entry, currentPath = '') {
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => {
        entry.file(resolve, reject);
      });
      const relativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      results.push({ file, relativePath });
    } else if (entry.isDirectory) {
      if (!rootDetectedName && !currentPath) {
        rootDetectedName = entry.name;
      }
      const dirReader = entry.createReader();
      const readDirBatch = async () => {
        const entries = await new Promise((resolve, reject) => {
          dirReader.readEntries(resolve, reject);
        });
        if (entries && entries.length > 0) {
          const dirPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          for (const child of entries) {
            await readEntry(child, dirPath);
          }
          await readDirBatch();
        }
      };
      await readDirBatch();
    }
  }

  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) {
          await readEntry(entry, '');
        } else {
          const file = item.getAsFile();
          if (file) results.push({ file, relativePath: file.name });
        }
      }
    }
  } else if (dataTransfer.files && dataTransfer.files.length > 0) {
    for (const file of dataTransfer.files) {
      results.push({ file, relativePath: file.webkitRelativePath || file.name });
    }
  }

  return { results, rootDetectedName };
}

/**
 * Menangani proses unggah otomatis saat folder/file diseret (Drag & Drop)
 */
async function handleDroppedFilesOrFolders(dataTransfer, explicitTargetFolder = null) {
  const token = getAuthToken();
  if (!token) {
    Swal.fire('Login Diperlukan', 'Silakan login sebagai admin sebelum mengunggah berkas.', 'warning');
    return;
  }

  Swal.fire({
    title: 'Membaca Folder & Berkas...',
    text: 'Sedang memindai seluruh berkas dan struktur folder yang diseret...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  let extracted;
  try {
    extracted = await extractEntriesFromDataTransfer(dataTransfer);
  } catch (err) {
    console.error('Gagal membaca drag and drop:', err);
    Swal.fire('Gagal', 'Terjadi kendala saat membaca folder yang diseret.', 'error');
    return;
  }

  const { results: filesWithPaths, rootDetectedName } = extracted;

  if (!filesWithPaths || filesWithPaths.length === 0) {
    if (rootDetectedName) {
      try {
        await fetch(`${API_BASE_URL}/arsip/folders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ nama_folder: rootDetectedName })
        });
        activeSelectedFolder = rootDetectedName;
        explorerActiveFolder = rootDetectedName;
        await fetchArsipData();
        selectExplorerFolder(rootDetectedName);
        Swal.fire('Folder Dibuat', `Folder "${rootDetectedName}" berhasil dibuat (folder kosong).`, 'success');
        return;
      } catch (e) {}
    }
    Swal.fire('Informasi', 'Tidak ada berkas yang ditemukan pada item yang diseret.', 'info');
    return;
  }

  let baseFolderName = '';
  if (explicitTargetFolder && explicitTargetFolder !== 'Semua') {
    baseFolderName = normalizeArchiveFolderPath(explicitTargetFolder);
  } else if (explorerActiveFolder && explorerActiveFolder !== 'Semua') {
    baseFolderName = normalizeArchiveFolderPath(explorerActiveFolder);
  } else if (rootDetectedName) {
    baseFolderName = rootDetectedName;
  } else {
    baseFolderName = 'Umum';
  }

  Swal.fire({
    title: `Mengunggah ke Folder "${baseFolderName}"`,
    html: `Ditemukan <b>${filesWithPaths.length} berkas</b>.<br>Sedang menyiapkan folder dan mengunggah ke sistem...`,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  const folderPathsToCreate = new Set([baseFolderName]);
  filesWithPaths.forEach(item => {
    const rel = normalizeArchiveFolderPath(item.relativePath || item.file.name);
    const parts = rel.split('/').filter(Boolean);
    if (rootDetectedName && parts[0]?.toLowerCase() === rootDetectedName.toLowerCase()) {
      parts.shift();
    }
    if (parts.length > 1) {
      const sub = parts.slice(0, -1).join('/');
      folderPathsToCreate.add(`${baseFolderName}/${sub}`);
    }
  });

  for (const fPath of folderPathsToCreate) {
    try {
      await fetch(`${API_BASE_URL}/arsip/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nama_folder: fPath })
      });
    } catch (e) {}
  }

  let successCount = 0;
  let failedCount = 0;
  const headers = { 'Authorization': `Bearer ${token}` };

  for (let i = 0; i < filesWithPaths.length; i++) {
    const { file, relativePath } = filesWithPaths[i];
    const rel = normalizeArchiveFolderPath(relativePath || file.name);
    const parts = rel.split('/').filter(Boolean);
    if (rootDetectedName && parts[0]?.toLowerCase() === rootDetectedName.toLowerCase()) {
      parts.shift();
    }
    const effectiveFolder = parts.length > 1
      ? `${baseFolderName}/${parts.slice(0, -1).join('/')}`
      : baseFolderName;

    const title = file.name.replace(/\.[^/.]+$/, "");
    const formData = new FormData();
    formData.append('file', file);
    formData.append('judul_arsip', title);
    formData.append('nama_folder', effectiveFolder);
    formData.append('kategori', 'Laporan Kebakaran');
    formData.append('deskripsi', `Diunggah otomatis via Seret & Lepas (Drag & Drop) ke folder ${effectiveFolder}`);

    if (Swal.isVisible()) {
      Swal.update({
        html: `Mengunggah berkas <b>${i + 1}</b> dari <b>${filesWithPaths.length}</b>:<br><small class="text-muted text-truncate d-block mt-1">${escapeHtml(file.name)}</small>`
      });
    }

    try {
      const res = await fetch(`${API_BASE_URL}/arsip`, {
        method: 'POST',
        headers: headers,
        body: formData
      });
      if (res.ok) {
        successCount++;
      } else {
        failedCount++;
      }
    } catch (err) {
      failedCount++;
      console.error('Error uploading dropped file:', err);
    }
  }

  activeSelectedFolder = baseFolderName;
  explorerActiveFolder = baseFolderName;

  Swal.fire({
    icon: successCount > 0 ? 'success' : 'error',
    title: successCount > 0 ? 'Upload Folder Berhasil!' : 'Upload Gagal',
    text: `${successCount} berkas berhasil diunggah ke folder "${baseFolderName}"${failedCount > 0 ? ` (${failedCount} gagal)` : ''}. Jumlah berkas otomatis diperbarui!`,
    timer: 2500,
    showConfirmButton: false
  });

  await fetchArsipData();
  selectExplorerFolder(baseFolderName);
}

function handleFolderCardDragOver(event, el) {
  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  el.classList.add('border-danger', 'border-2', 'bg-danger-subtle');
}

function handleFolderCardDragLeave(event, el, isActive) {
  event.preventDefault();
  event.stopPropagation();
  if (!isActive) {
    el.classList.remove('border-danger', 'border-2', 'bg-danger-subtle');
  }
}

function handleFolderCardDrop(event, folderName) {
  event.preventDefault();
  event.stopPropagation();
  const overlay = document.getElementById('explorer-drag-overlay');
  if (overlay) overlay.classList.add('d-none');
  handleDroppedFilesOrFolders(event.dataTransfer, folderName);
}

function handleDropInPanel(event) {
  event.preventDefault();
  event.stopPropagation();
  const overlay = document.getElementById('explorer-drag-overlay');
  if (overlay) overlay.classList.add('d-none');
  handleDroppedFilesOrFolders(event.dataTransfer);
}

function initExplorerDragAndDrop() {
  const modalEl = document.getElementById('modalBatchFolder');
  const overlay = document.getElementById('explorer-drag-overlay');
  const targetLabel = document.getElementById('explorer-drag-target-label');
  if (!modalEl || modalEl.dataset.dragDropInitialized === 'true') return;
  modalEl.dataset.dragDropInitialized = 'true';

  let dragCounter = 0;

  modalEl.addEventListener('dragenter', function(e) {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
      dragCounter++;
      if (overlay) {
        overlay.classList.remove('d-none');
        if (targetLabel) {
          if (explorerActiveFolder && explorerActiveFolder !== 'Semua') {
            targetLabel.textContent = `Akan otomatis diunggah ke folder aktif: "${explorerActiveFolder}"`;
          } else {
            targetLabel.textContent = `Folder baru akan otomatis dibuat sesuai nama folder yang diseret`;
          }
        }
      }
    }
  });

  modalEl.addEventListener('dragover', function(e) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  });

  modalEl.addEventListener('dragleave', function(e) {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      if (overlay) overlay.classList.add('d-none');
    }
  });

  modalEl.addEventListener('drop', function(e) {
    e.preventDefault();
    dragCounter = 0;
    if (overlay) overlay.classList.add('d-none');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleDroppedFilesOrFolders(e.dataTransfer);
    }
  });
}

async function handleDirectDriveUpload(fileInput) {
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;

  const files = Array.from(fileInput.files);
  const targetFolder = (explorerActiveFolder && explorerActiveFolder !== 'Semua') 
    ? explorerActiveFolder 
    : ((activeSelectedFolder && activeSelectedFolder !== 'Semua') ? activeSelectedFolder : 'Umum');

  Swal.fire({
    title: `Mengunggah ${files.length} Berkas...`,
    text: `Sedang mengunggah berkas dari Drive/Laptop ke folder "${targetFolder}"...`,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  let successCount = 0;
  const token = getAuthToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const title = file.name.replace(/\.[^/.]+$/, "");
    const formData = new FormData();
    formData.append('file', file);
    formData.append('judul_arsip', title);
    formData.append('nama_folder', targetFolder);
    formData.append('kategori', 'Laporan Kebakaran');
    formData.append('deskripsi', `Diunggah langsung dari Drive/Laptop ke folder ${targetFolder}`);

    try {
      const response = await fetch(`${API_BASE_URL}/arsip`, {
        method: 'POST',
        headers: headers,
        body: formData
      });
      if (response.ok) successCount++;
    } catch (err) {
      console.error('Error uploading direct file:', err);
    }
  }

  activeSelectedFolder = targetFolder;
  explorerActiveFolder = targetFolder;

  Swal.fire({
    icon: 'success',
    title: 'Upload Berkas Berhasil!',
    text: `${successCount} berkas telah berhasil diunggah langsung dari Drive/Laptop ke folder "${targetFolder}".`,
    timer: 2000,
    showConfirmButton: false
  });

  fetchArsipData();
}

async function handleDirectDriveFolderUpload(folderInput) {
  if (!folderInput || !folderInput.files || folderInput.files.length === 0) return;

  const files = Array.from(folderInput.files);
  const token = getAuthToken();
  if (!token) {
    Swal.fire('Login Diperlukan', 'Silakan login sebagai admin sebelum mengunggah folder.', 'warning');
    return;
  }

  const firstPath = normalizeArchiveFolderPath(files[0].webkitRelativePath || files[0].name);
  const sourceFolderName = firstPath.includes('/') ? firstPath.split('/')[0] : (files[0].name || 'Folder Drive Upload');
  const selectedParentFolder = (explorerActiveFolder && explorerActiveFolder !== 'Semua')
    ? normalizeArchiveFolderPath(explorerActiveFolder)
    : ((activeSelectedFolder && activeSelectedFolder !== 'Semua') ? normalizeArchiveFolderPath(activeSelectedFolder) : '');
  const folderName = selectedParentFolder
    ? `${selectedParentFolder}/${sourceFolderName}`
    : sourceFolderName;

  Swal.fire({
    title: `Mengunggah Folder "${folderName}"...`,
    text: `Membaca struktur folder dan ${files.length} berkas dari Drive/Laptop ke folder "${folderName}"...`,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  const folderPaths = new Set([folderName]);
  files.forEach(file => {
    const relativePath = normalizeArchiveFolderPath(file.webkitRelativePath || file.name);
    const pathParts = relativePath.split('/').filter(Boolean);
    if (pathParts[0]?.toLowerCase() === sourceFolderName.toLowerCase()) pathParts.shift();
    if (pathParts.length > 1) {
      folderPaths.add([folderName, ...pathParts.slice(1, -1)].join('/'));
    }
  });

  for (const folderPath of folderPaths) {
    try {
      await fetch(`${API_BASE_URL}/arsip/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nama_folder: folderPath })
      });
    } catch (e) {}
  }

  let successCount = 0;
  let failedCount = 0;
  const uploadedIdsByPath = new Map();
  const headers = { 'Authorization': `Bearer ${token}` };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relativePath = normalizeArchiveFolderPath(file.webkitRelativePath || file.name);
    const title = file.name.replace(/\.[^/.]+$/, "");
    const pathParts = relativePath.split('/').filter(Boolean);
    if (pathParts[0]?.toLowerCase() === sourceFolderName.toLowerCase()) pathParts.shift();
    const effectiveFolderName = pathParts.length > 1
      ? [folderName, ...pathParts.slice(1, -1)].join('/')
      : folderName;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('judul_arsip', title);
    formData.append('nama_folder', effectiveFolderName);
    formData.append('kategori', 'Laporan Kebakaran');
    formData.append('deskripsi', `Diunggah via Folder Upload (${relativePath})`);

    try {
      const response = await fetch(`${API_BASE_URL}/arsip`, {
        method: 'POST',
        headers: headers,
        body: formData
      });
      const result = await response.json();
      if (response.ok && result.success) {
        successCount++;
        const databaseId = Number(result?.data?.id);
        if (Number.isInteger(databaseId) && databaseId > 0) {
          const uploadedRecord = {
            ...result.data,
            id: databaseId,
            nama_folder: effectiveFolderName,
            file_url: result.data.file_url || `/uploads/arsip/${result.data.nama_file || ''}`,
            ukuran_file: result.data.ukuran_file || file.size || 0,
            tipe_file: result.data.tipe_file || (file.name.split('.').pop() || 'file').toLowerCase()
          };
          const existingIndex = allFetchedArsipData.findIndex(item => Number(item.id) === databaseId);
          if (existingIndex >= 0) allFetchedArsipData[existingIndex] = uploadedRecord;
          else allFetchedArsipData.push(uploadedRecord);
          currentArsipList = allFetchedArsipData;
          uploadedIdsByPath.set(
            normalizeArchiveFolderPath([folderName, ...pathParts].join('/')),
            databaseId
          );
        }
      } else {
        failedCount++;
        console.error('Upload file folder gagal:', {
          file: relativePath,
          status: response.status,
          response: result
        });
      }
    } catch (err) {
      failedCount++;
      console.error('Error uploading file in folder:', err);
    }
  }

  activeSelectedFolder = folderName;
  explorerActiveFolder = folderName;

  if (uploadedIdsByPath.size > 0) {
    registerUploadedFolderStructure(folderName, files.filter(file => {
      const relativePath = normalizeArchiveFolderPath(file.webkitRelativePath || file.name);
      const pathParts = relativePath.split('/').filter(Boolean);
      if (pathParts[0]?.toLowerCase() === sourceFolderName.toLowerCase()) pathParts.shift();
      const filePath = normalizeArchiveFolderPath([folderName, ...pathParts].join('/'));
      return uploadedIdsByPath.has(filePath);
    }), sourceFolderName);

    const state = getArchiveFolderState();
    (state.files || []).forEach(entry => {
      const databaseId = uploadedIdsByPath.get(normalizeArchiveFolderPath(entry.path || ''));
      if (databaseId) {
        entry.id = databaseId;
        entry.databaseId = databaseId;
      }
    });
    saveArchiveFolderState(state);
  }

  Swal.fire({
    icon: successCount > 0 && failedCount === 0 ? 'success' : successCount > 0 ? 'warning' : 'error',
    title: successCount > 0 ? 'Upload Folder Selesai' : 'Upload Folder Gagal',
    text: `${successCount} berhasil, ${failedCount} gagal dari ${files.length} berkas folder "${folderName}".`,
    timer: 2200,
    showConfirmButton: false
  });

  await fetchArsipData();
  renderExplorerFolderGrid();
  renderExplorerFilesTable();
}


function openModalUploadArsip() {
  const selectFolder = document.getElementById('upload-arsip-folder');
  if (selectFolder) {
    const folders = (currentAvailableFolders && currentAvailableFolders.length > 0) ? currentAvailableFolders : ['Umum'];
    selectFolder.innerHTML = folders.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
    if (activeSelectedFolder && activeSelectedFolder !== 'Semua') {
      selectFolder.value = activeSelectedFolder;
    } else if (explorerActiveFolder && explorerActiveFolder !== 'Semua') {
      selectFolder.value = explorerActiveFolder;
    }
  }

  const form = document.getElementById('form-upload-arsip-drive');
  if (form) form.reset();

  const modalEl = document.getElementById('modalUploadArsip');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

function autoFillUploadTitle(fileInput) {
  const judulInput = document.getElementById('upload-arsip-judul');
  if (fileInput && fileInput.files && fileInput.files[0] && judulInput) {
    if (!judulInput.value || judulInput.value.trim() === '') {
      const name = fileInput.files[0].name.replace(/\.[^/.]+$/, "");
      judulInput.value = name;
    }
  }
}

async function submitUploadArsip(event) {
  if (event) event.preventDefault();

  const fileInput = document.getElementById('upload-arsip-file');
  const judulInput = document.getElementById('upload-arsip-judul');
  const folderInput = document.getElementById('upload-arsip-folder');
  const kategoriInput = document.getElementById('upload-arsip-kategori');
  const deskripsiInput = document.getElementById('upload-arsip-deskripsi');
  const btnSubmit = document.getElementById('btn-submit-upload-arsip');

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    Swal.fire('Peringatan', 'Harap pilih file dari Drive/Laptop Anda terlebih dahulu.', 'warning');
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('judul_arsip', judulInput ? judulInput.value.trim() : file.name);
  formData.append('nama_folder', folderInput ? folderInput.value.trim() : 'Umum');
  formData.append('kategori', kategoriInput ? kategoriInput.value.trim() : 'Lainnya');
  formData.append('deskripsi', deskripsiInput ? deskripsiInput.value.trim() : '');

  const token = getAuthToken();

  try {
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span> Mengunggah...`;
    }

    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/arsip`, {
      method: 'POST',
      headers: headers,
      body: formData
    });

    const result = await response.json();

    if (response.ok && result.success) {
      const modalEl = document.getElementById('modalUploadArsip');
      if (modalEl) {
        const bsModal = bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();
      }

      const targetFolder = folderInput ? folderInput.value.trim() : 'Umum';
      activeSelectedFolder = targetFolder;
      explorerActiveFolder = targetFolder;

      Swal.fire({
        icon: 'success',
        title: 'Upload Berkas Berhasil!',
        text: result.message || `File "${file.name}" berhasil diunggah dan disimpan ke folder "${targetFolder}".`,
        confirmButtonColor: '#dc2626'
      });

      fetchArsipData();
    } else {
      Swal.fire('Gagal Upload', result.message || 'Terjadi kesalahan saat mengunggah berkas.', 'error');
    }
  } catch (err) {
    console.error('Error uploading file:', err);
    Swal.fire('Error', 'Terjadi kesalahan saat mengunggah berkas dari Drive/Laptop.', 'error');
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<i class="bi bi-cloud-upload-fill me-1"></i> Upload Sekarang`;
    }
  }
}


function promptCreateNewFolder() {
  const inputNew = document.getElementById('input-new-folder-name');
  if (inputNew) inputNew.value = '';
  const modalEl = document.getElementById('modalCreateNewFolder');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

async function submitCreateNewFolder() {
  const inputNew = document.getElementById('input-new-folder-name');
  const name = inputNew ? inputNew.value.trim() : '';

  if (!name) {
    Swal.fire('Peringatan', 'Masukkan nama folder terlebih dahulu.', 'warning');
    return;
  }

  const token = getAuthToken();

  try {
    const response = await fetch(`${API_BASE_URL}/arsip/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nama_folder: name })
    });

    const result = await response.json();
    if (response.ok && result.success) {
      if (!currentAvailableFolders.includes(name)) {
        currentAvailableFolders.push(name);
      }

      const modalEl = document.getElementById('modalCreateNewFolder');
      if (modalEl) {
        const bsModal = bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();
      }

      Swal.fire({
        icon: 'success',
        title: 'Folder Tersimpan Permanen',
        text: `Folder "${name}" telah disimpan secara permanen ke database MySQL dan siap diisi berkas.`,
        timer: 1800,
        showConfirmButton: false
      });

      activeSelectedFolder = name;
      selectExplorerFolder(name);
      fetchArsipData();
    } else {
      Swal.fire('Gagal', result.message || 'Gagal menyimpan folder.', 'error');
    }
  } catch (error) {
    console.error('Error creating folder:', error);
    Swal.fire('Error', 'Terjadi kesalahan saat menyimpan folder.', 'error');
  }
}


function openModalManageFolders() {
  openBatchFolderModal();
}

function openBatchFolderModal() {
  initExplorerDragAndDrop();
  const uploadActions = document.getElementById('explorer-folder-upload-actions');
  if (uploadActions) {
    if (explorerActiveFolder && explorerActiveFolder !== 'Semua') {
      uploadActions.classList.remove('d-none');
    } else {
      uploadActions.classList.add('d-none');
    }
  }
  renderExplorerFolderGrid();
  renderExplorerFilesTable();

  const modalEl = document.getElementById('modalBatchFolder');
  if (modalEl) {
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
  }
}

function goBackExplorerFolder() {
  const activePath = normalizeArchiveFolderPath(explorerActiveFolder);
  if (!activePath || activePath === 'Semua' || activePath === 'Umum') {
    selectExplorerFolder('Semua');
    return;
  }

  const parentPath = activePath.includes('/') ? activePath.substring(0, activePath.lastIndexOf('/')) : 'Semua';
  selectExplorerFolder(parentPath === '' ? 'Semua' : parentPath);
}

function updateExplorerBackButton() {
  const btn = document.getElementById('explorer-back-button');
  if (!btn) return;

  const activePath = normalizeArchiveFolderPath(explorerActiveFolder);
  const shouldShow = activePath && activePath !== 'Semua' && activePath !== 'Umum';
  btn.style.display = shouldShow ? 'inline-flex' : 'none';
}

function getExplorerFolderPathSegments(folderName) {
  const activePath = normalizeArchiveFolderPath(folderName);
  if (!activePath || activePath === 'Semua' || activePath === 'Umum') return [];
  return activePath.split('/').filter(Boolean);
}

function renderExplorerBreadcrumb() {
  const breadcrumbList = document.getElementById('explorer-breadcrumb-list');
  if (!breadcrumbList) return;

  const segments = getExplorerFolderPathSegments(explorerActiveFolder);
  const items = [
    `<li class="breadcrumb-item"><a href="#" onclick="selectExplorerFolder('Semua'); return false;" class="text-danger text-decoration-none">📁 Damkar Arsip Data</a></li>`
  ];

  let currentPath = [];
  segments.forEach((segment, index) => {
    currentPath.push(segment);
    const currentValue = currentPath.join('/');
    const isLast = index === segments.length - 1;
    items.push(`
      <li class="breadcrumb-item ${isLast ? 'active' : ''}" ${isLast ? 'aria-current="page"' : ''}>
        ${isLast
          ? `<span class="text-dark">${escapeHtml(segment)}</span>`
          : `<a href="#" onclick="selectExplorerFolder('${escapeHtml(currentValue)}'); return false;" class="text-danger text-decoration-none">${escapeHtml(segment)}</a>`}
      </li>
    `);
  });

  if (segments.length === 0) {
    items.push('<li class="breadcrumb-item active" aria-current="page">Semua Berkas</li>');
  }

  breadcrumbList.innerHTML = items.join('');

  const activeBreadcrumb = document.getElementById('explorer-breadcrumb-active');
  if (activeBreadcrumb) activeBreadcrumb.textContent = explorerActiveFolder === 'Semua' ? 'Semua Berkas' : explorerActiveFolder;
}

function selectExplorerFolder(folderName) {
  explorerActiveFolder = folderName;
  explorerSearchQuery = '';
  const searchInput = document.getElementById('explorer-search-input');
  if (searchInput) searchInput.value = '';

  const activeBreadcrumb = document.getElementById('explorer-breadcrumb-active');
  if (activeBreadcrumb) activeBreadcrumb.textContent = folderName === 'Semua' ? 'Semua Berkas' : folderName;

  const titleDisplay = document.getElementById('explorer-folder-title-display');
  if (titleDisplay) titleDisplay.textContent = folderName === 'Semua' ? 'Semua Berkas' : folderName;

  const listFolderSelect = document.getElementById('filter-arsip-folder');
  if (listFolderSelect) listFolderSelect.value = folderName;

  const uploadActions = document.getElementById('explorer-folder-upload-actions');
  if (uploadActions) {
    if (folderName && folderName !== 'Semua') {
      uploadActions.classList.remove('d-none');
    } else {
      uploadActions.classList.add('d-none');
    }
  }

  updateExplorerBackButton();
  renderExplorerBreadcrumb();
  renderExplorerFolderGrid();
  renderExplorerFilesTable();
}

function renderExplorerFolderGrid() {
  const container = document.getElementById('modal-folder-explorer-list');
  const countBadge = document.getElementById('modal-folder-count-badge');
  if (!container) return;

  let folders = [];
  const rootFolders = getArchiveRootFolders();

  if (explorerActiveFolder === 'Semua') {
    folders = rootFolders;
    if (folders.length === 0) folders.push('Umum');
  } else {
    const activePath = normalizeArchiveFolderPath(explorerActiveFolder);
    const childFolders = getArchiveFolderChildren(activePath).folders || [];
    folders = childFolders.map(folder => folder.path || folder.name);
    if (folders.length === 0) folders = [];
  }

  if (countBadge) countBadge.textContent = `${folders.length} Folder`;

  let cardsHtml = `
    <div class="mb-3">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span class="fw-bold text-dark small text-uppercase" style="letter-spacing: 0.08em;">Folder</span>
        <span class="text-muted small">${folders.length} item</span>
      </div>
      <div class="row g-2">
        <div class="col-md-4 col-sm-6">
          <div class="p-3 border rounded-3 bg-white d-flex align-items-center justify-content-between shadow-sm cursor-pointer hover-bg-light ${explorerActiveFolder === 'Semua' ? 'border-danger border-2 bg-danger-subtle' : ''}" onclick="selectExplorerFolder('Semua')" style="transition: all 0.2s ease;">
            <div class="d-flex align-items-center gap-2 text-truncate">
              <i class="bi bi-collection-fill text-danger fs-3 flex-shrink-0"></i>
              <div class="text-truncate">
                <strong class="d-block text-dark small mb-0 text-truncate">Semua Berkas</strong>
                <small class="text-muted">${allFetchedArsipData.length} Total Berkas</small>
              </div>
            </div>
            ${explorerActiveFolder === 'Semua' ? '<span class="badge bg-danger flex-shrink-0 ms-1">Aktif</span>' : ''}
          </div>
        </div>
      </div>
    </div>
  `;

  cardsHtml += `
    <div class="row g-2">
      ${folders.map(fName => {
        const normalizedPath = normalizeArchiveFolderPath(fName);
        const fileCount = getArchiveFolderFileCount(normalizedPath);
        const isActive = normalizeArchiveFolderPath(explorerActiveFolder) === normalizedPath;
        const isSystemFolder = (normalizedPath || '').toLowerCase() === 'umum' || (normalizedPath || '').toLowerCase() === 'semua';
        const displayName = normalizedPath.includes('/') ? normalizedPath.split('/').pop() : normalizedPath;
        return `
          <div class="col-md-4 col-sm-6">
            <div class="p-3 border rounded-3 bg-white d-flex align-items-center justify-content-between shadow-sm cursor-pointer ${isActive ? 'border-danger border-2 bg-danger-subtle' : ''}" 
              onclick="selectExplorerFolder('${escapeHtml(normalizedPath)}')" 
              ondragover="handleFolderCardDragOver(event, this)" 
              ondragleave="handleFolderCardDragLeave(event, this, ${isActive})" 
              ondrop="handleFolderCardDrop(event, '${escapeHtml(normalizedPath)}')"
              data-folder-path="${escapeHtml(normalizedPath)}"
              title="Klik untuk membuka folder, atau seret & jatuhkan berkas ke kartu ini"
              style="transition: all 0.2s ease;">
              <div class="d-flex align-items-center gap-2 text-truncate">
                <i class="bi bi-folder-fill text-warning fs-3 flex-shrink-0"></i>
                <div class="text-truncate">
                  <strong class="d-block text-dark small mb-0 text-truncate" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</strong>
                  <small class="text-muted">${fileCount} File Arsip</small>
                </div>
              </div>
              <div class="d-flex align-items-center gap-1 flex-shrink-0">
                ${isActive ? '<span class="badge bg-danger me-1">Aktif</span>' : ''}
                <div class="dropdown" onclick="event.stopPropagation();">
                  <button class="btn btn-sm btn-light border-0 text-muted p-1 rounded-circle" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Opsi Folder ${escapeHtml(displayName)}">
                    <i class="bi bi-three-dots-vertical fs-6"></i>
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end shadow border-0 text-start" style="font-size: 0.85rem;">
                    <li><a class="dropdown-item py-2 fw-semibold" href="#" onclick="openFolderAndUploadFile(event, '${escapeHtml(normalizedPath)}'); return false;"><i class="bi bi-file-earmark-arrow-up-fill text-danger me-2"></i> Upload File ke Folder Ini</a></li>
                    <li><a class="dropdown-item py-2 fw-semibold" href="#" onclick="openFolderAndUploadSubfolder(event, '${escapeHtml(normalizedPath)}'); return false;"><i class="bi bi-folder-symlink-fill text-primary me-2"></i> Upload Folder ke Sini</a></li>
                    <li><hr class="dropdown-divider my-1"></li>
                    ${!isSystemFolder ? `<li><a class="dropdown-item py-2 fw-semibold" href="#" onclick="renameFolderPrompt(event, '${escapeHtml(displayName)}'); return false;"><i class="bi bi-pencil-square text-warning me-2"></i> Ubah Nama Folder</a></li>` : ''}
                    <li><a class="dropdown-item py-2 fw-semibold" href="#" onclick="downloadFolderFiles(event, '${escapeHtml(displayName)}'); return false;"><i class="bi bi-download text-primary me-2"></i> Download Berkas Folder</a></li>
                    ${!isSystemFolder ? `<li><hr class="dropdown-divider my-1"></li><li><a class="dropdown-item py-2 fw-semibold text-danger" href="#" onclick="deleteFolderConfirm(event, '${escapeHtml(displayName)}'); return false;"><i class="bi bi-trash-fill text-danger me-2"></i> Hapus Folder</a></li>` : ''}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.innerHTML = cardsHtml;
}

function renderExplorerFilesTable() {
  const tbody = document.getElementById('explorer-table-body');
  const countBadge = document.getElementById('explorer-file-count-badge');
  if (!tbody) return;

  let filtered = Array.isArray(allFetchedArsipData) ? [...allFetchedArsipData] : [];
  const state = getArchiveFolderState();
  const activeFolderPath = normalizeArchiveFolderPath(explorerActiveFolder);

  if (explorerActiveFolder !== 'Semua') {
    const storedFiles = (state.files || []).filter(file => normalizeArchiveFolderPath(file.parentFolderPath || '') === activeFolderPath);
    if (storedFiles.length > 0) {
      filtered = storedFiles.map(file => {
        const storedName = String(file.name || '').toLowerCase();
        const databaseItem = allFetchedArsipData.find(item =>
          String(item.nama_asli || '').toLowerCase() === storedName &&
          normalizeArchiveFolderPath(item.nama_folder || '') === activeFolderPath
        ) || allFetchedArsipData.find(item =>
          String(item.nama_asli || '').toLowerCase() === storedName
        );
        return databaseItem || null;
      }).filter(Boolean);
    } else {
      filtered = filtered.filter(item => (item.nama_folder || 'Umum') === explorerActiveFolder);
    }
  }

  if (explorerSearchQuery.trim() !== '') {
    const q = explorerSearchQuery.toLowerCase().trim();
    filtered = filtered.filter(item => 
      (item.judul_arsip || '').toLowerCase().includes(q) ||
      (item.nama_asli || '').toLowerCase().includes(q) ||
      (item.kategori || '').toLowerCase().includes(q) ||
      (item.deskripsi || '').toLowerCase().includes(q)
    );
  }

  if (countBadge) countBadge.textContent = `${filtered.length} Berkas`;

  if (filtered.length === 0) {
    if (explorerActiveFolder !== 'Semua') {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-5">
            <div class="p-4 mx-auto border border-2 border-dashed rounded-4 bg-white shadow-sm" style="max-width: 560px; border-color: #dee2e6;" ondragover="event.preventDefault();" ondrop="handleDropInPanel(event)">
              <i class="bi bi-folder2-open text-warning display-4 d-block mb-2"></i>
              <h6 class="fw-bold text-dark mb-1">Folder "${escapeHtml(explorerActiveFolder)}" Masih Kosong</h6>
              <p class="small text-muted mb-3">Tarik & seret (drag & drop) folder atau berkas dari komputer langsung ke sini, atau klik tombol di bawah:</p>
              <div class="d-inline-flex gap-2 flex-wrap justify-content-center">
                <button type="button" class="btn btn-danger btn-sm fw-bold px-3 py-2 shadow-sm" onclick="triggerDirectDrivePicker(event)">
                  <i class="bi bi-file-earmark-arrow-up-fill me-1"></i> Upload File ke Folder Ini
                </button>
                <button type="button" class="btn btn-primary btn-sm fw-bold px-3 py-2 shadow-sm" onclick="triggerDirectDriveFolderPicker(event)">
                  <i class="bi bi-folder-symlink-fill me-1"></i> Upload Folder ke Sini
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-5 text-muted">
            <div class="p-4 mx-auto border border-2 border-dashed rounded-4 bg-white shadow-sm" style="max-width: 560px; border-color: #dee2e6;" ondragover="event.preventDefault();" ondrop="handleDropInPanel(event)">
              <i class="bi bi-folder-x fs-1 d-block mb-2 text-warning"></i>
              <h6 class="fw-bold text-dark mb-1">Belum ada berkas arsip tersimpan</h6>
              <p class="small text-muted mb-0">Tarik & seret folder dari laptop ke sini untuk membuat folder baru dan mengunggah isinya secara otomatis.</p>
            </div>
          </td>
        </tr>
      `;
    }
    return;
  }

  const activeDisplayLabel = explorerActiveFolder === 'Semua' ? 'Semua Berkas' : explorerActiveFolder;
  const headingLabel = document.getElementById('explorer-folder-title-display');
  if (headingLabel) headingLabel.textContent = activeDisplayLabel;

  const monthNamesIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  tbody.innerHTML = filtered.map((item, index) => {
    const badgeHtml = getFileBadgeHtml(item.tipe_file);
    const formattedSize = formatBytes(item.ukuran_file);
    const databaseId = Number(item.id);
    const hasDatabaseId = Number.isInteger(databaseId) && databaseId > 0;
    const downloadUrl = hasDatabaseId ? `${API_BASE_URL}/arsip/${databaseId}/download` : '#';

    const dateObj = new Date(item.created_at || Date.now());
    const day = dateObj.getDate();
    const monthIdx = dateObj.getMonth();
    const year = item.file_year || dateObj.getFullYear();
    const monthName = monthNamesIndo[monthIdx] || 'Januari';
    const formattedDateSeq = `${day} ${monthName} ${year}`;

    const isChecked = hasDatabaseId && explorerSelectedIds.has(databaseId);
    const rowClick = hasDatabaseId ? `onclick="previewArsip(${databaseId})"` : '';
    const actionHtml = hasDatabaseId
      ? `<button type="button" class="btn btn-outline-info" onclick="previewArsip(${databaseId}); event.stopPropagation();" title="Lihat / Preview File Langsung">
              <i class="bi bi-eye-fill"></i>
            </button>
            <a href="${downloadUrl}" class="btn btn-outline-primary" title="Unduh File" onclick="event.stopPropagation();">
              <i class="bi bi-download"></i>
            </a>
            <button type="button" class="btn btn-outline-danger" onclick="deleteArsip(${databaseId}, '${escapeHtml(item.judul_arsip)}'); event.stopPropagation();" title="Hapus Berkas">
              <i class="bi bi-trash-fill"></i>
            </button>`
      : `<span class="badge bg-warning-subtle text-warning border border-warning-subtle">Belum tersimpan</span>`;

    return `
      <tr class="file-row-clickable" style="${hasDatabaseId ? 'cursor:pointer;' : ''}" ${rowClick}>
        <td class="text-center" onclick="event.stopPropagation();">
          <input type="checkbox" class="form-check-input explorer-row-check" data-id="${hasDatabaseId ? databaseId : ''}" ${isChecked ? 'checked' : ''} ${hasDatabaseId ? `onchange="toggleExplorerSelection(${databaseId}, this)"` : 'disabled'}>
        </td>
        <td class="fw-bold text-muted" onclick="event.stopPropagation();">${index + 1}</td>
        <td onclick="event.stopPropagation();">
          <div class="fw-bold text-dark">${escapeHtml(item.judul_arsip)}</div>
          <small class="text-muted"><i class="bi bi-paperclip me-1"></i>${escapeHtml(item.nama_asli)}</small>
        </td>
        <td onclick="event.stopPropagation();">
          <span class="badge bg-secondary-subtle text-dark border"><i class="bi bi-folder-fill text-warning me-1"></i>${escapeHtml(item.nama_folder || 'Umum')}</span>
        </td>
        <td onclick="event.stopPropagation();">
          <div class="d-flex align-items-center gap-1 flex-wrap">
            ${badgeHtml}
            <small class="text-muted">${formattedSize}</small>
          </div>
        </td>
        <td onclick="event.stopPropagation();">
          <span class="badge bg-danger-subtle text-danger border border-danger-subtle fw-semibold">
            <i class="bi bi-calendar-check me-1"></i>${formattedDateSeq}
          </span>
        </td>
        <td class="text-center" onclick="event.stopPropagation();">
          <div class="btn-group btn-group-sm">${actionHtml}</div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterExplorerFiles(query) {
  explorerSearchQuery = query;
  renderExplorerFilesTable();
}

function toggleSelectAllExplorer(selectAllCb) {
  const checkboxes = document.querySelectorAll('.explorer-row-check');
  checkboxes.forEach(cb => {
    cb.checked = selectAllCb.checked;
    const id = parseInt(cb.dataset.id, 10);
    if (selectAllCb.checked) {
      explorerSelectedIds.add(id);
    } else {
      explorerSelectedIds.delete(id);
    }
  });
  updateExplorerBatchActionBar();
}

function toggleExplorerSelection(id, cbElement) {
  const fileId = parseInt(id, 10);
  if (cbElement.checked) {
    explorerSelectedIds.add(fileId);
  } else {
    explorerSelectedIds.delete(fileId);
  }
  updateExplorerBatchActionBar();
}

function updateExplorerBatchActionBar() {
  const bar = document.getElementById('explorer-batch-action-bar');
  const countBadge = document.getElementById('explorer-selected-count');
  const selectTargetFolder = document.getElementById('explorer-batch-target-folder');

  if (countBadge) countBadge.textContent = explorerSelectedIds.size;

  if (selectTargetFolder && Array.isArray(currentAvailableFolders)) {
    selectTargetFolder.innerHTML = currentAvailableFolders.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
  }

  if (bar) {
    if (explorerSelectedIds.size > 0) {
      bar.classList.remove('d-none');
    } else {
      bar.classList.add('d-none');
    }
  }
}

async function submitExplorerBatchMove() {
  if (explorerSelectedIds.size === 0) return;
  const targetFolder = document.getElementById('explorer-batch-target-folder')?.value || 'Umum';
  const token = getAuthToken();

  try {
    const response = await fetch(`${API_BASE_URL}/arsip/batch-folder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ids: Array.from(explorerSelectedIds),
        nama_folder: targetFolder
      })
    });

    const result = await response.json();
    if (response.ok && result.success) {
      Swal.fire({ icon: 'success', title: 'Berhasil', text: result.message, timer: 1200, showConfirmButton: false });
      explorerSelectedIds.clear();
      updateExplorerBatchActionBar();
      fetchArsipData();
      renderExplorerFolderGrid();
      renderExplorerFilesTable();
    } else {
      Swal.fire('Gagal', result.message || 'Gagal memindahkan berkas.', 'error');
    }
  } catch (err) {
    console.error('Error batch moving files:', err);
    Swal.fire('Error', 'Gagal memindahkan berkas.', 'error');
  }
}

async function deleteSelectedExplorerFiles() {
  const idsToDelete = Array.from(explorerSelectedIds);
  if (idsToDelete.length === 0) {
    Swal.fire('Info', 'Pilih minimal 1 berkas arsip yang ingin dihapus.', 'info');
    return;
  }

  const confirmRes = await Swal.fire({
    title: `Hapus ${idsToDelete.length} berkas terpilih?`,
    text: 'File yang dihapus akan hilang dari database dan daftar tampilan.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Ya, Hapus Semua',
    cancelButtonText: 'Batal'
  });

  if (!confirmRes.isConfirmed) return;

  const token = getAuthToken();
  let successCount = 0;
  let failedCount = 0;

  try {
    for (const id of idsToDelete) {
      const response = await fetch(`${API_BASE_URL}/arsip/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        successCount += 1;
      } else {
        failedCount += 1;
      }
    }

    if (successCount > 0) {
      allFetchedArsipData = allFetchedArsipData.filter(item => !idsToDelete.includes(Number(item.id)));
      currentArsipList = currentArsipList.filter(item => !idsToDelete.includes(Number(item.id)));
      explorerSelectedIds.clear();
      updateExplorerBatchActionBar();
      renderExplorerFilesTable();
      renderArsipFolderGrid(currentAvailableFolders, allFetchedArsipData);
      fetchArsipData();
      fetchArsipStatistik();
    }

    if (successCount > 0 && failedCount === 0) {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Dihapus',
        text: `${successCount} berkas berhasil dihapus.`,
        timer: 1800,
        showConfirmButton: false
      });
    } else if (successCount > 0 && failedCount > 0) {
      Swal.fire('Sebagian Berhasil', `${successCount} berkas berhasil dihapus, ${failedCount} gagal.`, 'warning');
    } else {
      Swal.fire('Gagal', 'Tidak ada berkas yang berhasil dihapus.', 'error');
    }
  } catch (error) {
    console.error('Error deleting selected explorer files:', error);
    Swal.fire('Error', 'Terjadi kesalahan saat menghapus berkas terpilih.', 'error');
  }
}

async function submitBatchFolder() {
  const idsToMove = selectedArsipIds.size > 0 ? Array.from(selectedArsipIds) : Array.from(explorerSelectedIds);

  if (idsToMove.length === 0) {
    Swal.fire('Info', 'Pilih minimal 1 berkas arsip terlebih dahulu.', 'info');
    return;
  }

  const folderSelect = document.getElementById('batch-folder-select')?.value || 'Umum';
  const folderNewInput = document.getElementById('batch-folder-new-name')?.value.trim() || '';
  const targetFolder = folderNewInput !== '' ? folderNewInput : folderSelect;
  const token = getAuthToken();

  try {
    const response = await fetch(`${API_BASE_URL}/arsip/batch-folder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ids: idsToMove,
        nama_folder: targetFolder
      })
    });

    const result = await response.json();
    if (response.ok && result.success) {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Dipindahkan',
        text: `${idsToMove.length} berkas telah dimasukkan ke folder "${targetFolder}". Berkas otomatis hilang dari daftar ini agar tidak menumpuk.`,
        timer: 1800,
        showConfirmButton: false
      });

      const modalEl = document.getElementById('modalBatchFolder');
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();

      clearArsipSelections();
      explorerSelectedIds.clear();

      // Pindahkan aktif tampilan ke folder tujuan agar berkas langsung terlihat di foldernya
      filterByFolderCard(targetFolder);
    } else {
      Swal.fire('Gagal', result.message || 'Gagal menyimpan ke folder.', 'error');
    }
  } catch (error) {
    console.error('Error submitting batch folder:', error);
    Swal.fire('Error', 'Terjadi kesalahan saat memindahkan berkas ke folder.', 'error');
  }
}

async function deleteSelectedArsipFiles() {
  const idsToDelete = Array.from(selectedArsipIds);
  if (idsToDelete.length === 0) {
    Swal.fire('Info', 'Pilih minimal 1 berkas arsip yang ingin dihapus.', 'info');
    return;
  }

  const confirmRes = await Swal.fire({
    title: `Hapus ${idsToDelete.length} berkas terpilih?`,
    text: 'File yang dihapus akan hilang dari database dan daftar tampilan.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Ya, Hapus Semua',
    cancelButtonText: 'Batal'
  });

  if (!confirmRes.isConfirmed) return;

  const token = getAuthToken();
  let successCount = 0;
  let failedCount = 0;

  try {
    for (const id of idsToDelete) {
      const response = await fetch(`${API_BASE_URL}/arsip/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        successCount += 1;
      } else {
        failedCount += 1;
      }
    }

    if (successCount > 0) {
      allFetchedArsipData = allFetchedArsipData.filter(item => !idsToDelete.includes(Number(item.id)));
      currentArsipList = currentArsipList.filter(item => !idsToDelete.includes(Number(item.id)));
      selectedArsipIds.clear();
      clearArsipSelections();
      updateArsipBatchActionBar();
      renderArsipFolderGrid(currentAvailableFolders, allFetchedArsipData);
      renderExplorerFilesTable();
      fetchArsipData();
      fetchArsipStatistik();
    }

    if (successCount > 0 && failedCount === 0) {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Dihapus',
        text: `${successCount} berkas berhasil dihapus.`,
        timer: 1800,
        showConfirmButton: false
      });
    } else if (successCount > 0 && failedCount > 0) {
      Swal.fire('Sebagian Berhasil', `${successCount} berkas berhasil dihapus, ${failedCount} gagal.` , 'warning');
    } else {
      Swal.fire('Gagal', 'Tidak ada berkas yang berhasil dihapus.', 'error');
    }
  } catch (error) {
    console.error('Error deleting selected arsip files:', error);
    Swal.fire('Error', 'Terjadi kesalahan saat menghapus berkas terpilih.', 'error');
  }
}

let chartPamorStatusPenangananInstance = null;
let chartPamorTrenKorbanInstance = null;
let chartPamorDistribusiJenisInstance = null;
let chartPamorTop10JenisInstance = null;
let chartPamorDistribusiTop8Instance = null;
let chartPamorTop15DampakInstance = null;
let activeArsipPamorSubtab = 'statistik';

function switchArsipPamorSubtab(tabName) {
  activeArsipPamorSubtab = tabName;
  const viewStatistik = document.getElementById('pamor-view-statistik');
  const viewGrafik = document.getElementById('pamor-view-grafik');
  const viewBerkas = document.getElementById('pamor-view-berkas');

  const btnStatistik = document.getElementById('subtab-pamor-statistik');
  const btnGrafik = document.getElementById('subtab-pamor-grafik');
  const btnBerkas = document.getElementById('subtab-pamor-berkas');

  [btnStatistik, btnGrafik, btnBerkas].forEach(btn => {
    if (btn) {
      btn.classList.remove('active', 'bg-danger', 'text-white');
      btn.classList.add('text-secondary');
    }
  });

  if (viewStatistik) viewStatistik.classList.add('d-none');
  if (viewGrafik) viewGrafik.classList.add('d-none');
  if (viewBerkas) viewBerkas.classList.add('d-none');

  if (tabName === 'statistik') {
    if (viewStatistik) viewStatistik.classList.remove('d-none');
    if (btnStatistik) {
      btnStatistik.classList.add('active', 'bg-danger', 'text-white');
      btnStatistik.classList.remove('text-secondary');
    }
  } else if (tabName === 'grafik') {
    if (viewGrafik) viewGrafik.classList.remove('d-none');
    if (btnGrafik) {
      btnGrafik.classList.add('active', 'bg-danger', 'text-white');
      btnGrafik.classList.remove('text-secondary');
    }
  } else if (tabName === 'berkas') {
    if (viewBerkas) viewBerkas.classList.remove('d-none');
    if (btnBerkas) {
      btnBerkas.classList.add('active', 'bg-danger', 'text-white');
      btnBerkas.classList.remove('text-secondary');
    }
  }
}

async function fetchArsipStatistik() {
  const divisiVal = document.getElementById('stat-filter-divisi')?.value || 'Semua';
  const tahunVal = document.getElementById('stat-filter-tahun')?.value || new Date().getFullYear();
  const bulanVal = document.getElementById('stat-filter-bulan')?.value || 'Semua';

  const queryParams = new URLSearchParams();
  queryParams.append('periode', activeArsipPeriodeMode);
  queryParams.append('kategori', divisiVal);
  queryParams.append('sumberData', activeArsipSumberDataMode);
  if (tahunVal) queryParams.append('tahun', tahunVal);
  if (bulanVal && bulanVal !== 'Semua') queryParams.append('bulan', bulanVal);

  try {
    const response = await fetch(`${API_BASE_URL}/arsip/statistik?${queryParams.toString()}`);
    const result = await response.json();

    if (response.ok && result.success) {
      // Update Dropdown Tahun Tersedia jika belum ada atau berubah
      const selectTahun = document.getElementById('stat-filter-tahun');
      if (selectTahun && result.filters && result.filters.availableYears) {
        const currVal = selectTahun.value;
        const yearOptionsHtml = result.filters.availableYears.map(y => `<option value="${y}" ${parseInt(currVal, 10) === y ? 'selected' : ''}>${y}</option>`).join('');
        if (selectTahun.innerHTML !== yearOptionsHtml) {
          selectTahun.innerHTML = yearOptionsHtml;
          if (!currVal && result.filters.availableYears.length > 0) {
            selectTahun.value = result.filters.availableYears[0];
          }
        }
      }

      // Update PAMOR STATISTIK (Halaman 1)
      if (result.pamorStatistik) {
        const pStat = result.pamorStatistik;
        const totalAduanEl = document.getElementById('pamor-stat-total-aduan');
        const lastUpdateEl = document.getElementById('pamor-stat-last-update');
        if (totalAduanEl) totalAduanEl.textContent = pStat.totalAduan?.toLocaleString('id-ID') || '215';
        if (lastUpdateEl) lastUpdateEl.textContent = pStat.lastUpdate || 'Real-time';

        if (pStat.korbanJiwa) {
          const k = pStat.korbanJiwa;
          const elMeninggal = document.getElementById('pamor-korban-meninggal');
          const elHilang = document.getElementById('pamor-korban-hilang');
          const elLukaBerat = document.getElementById('pamor-korban-luka-berat');
          const elLukaSedang = document.getElementById('pamor-korban-luka-sedang');
          const elLukaRingan = document.getElementById('pamor-korban-luka-ringan');
          const elSelamat = document.getElementById('pamor-korban-selamat');
          const elMengungsi = document.getElementById('pamor-korban-mengungsi');

          if (elMeninggal) elMeninggal.textContent = k.meninggal || 0;
          if (elHilang) elHilang.textContent = k.hilang || 0;
          if (elLukaBerat) elLukaBerat.textContent = k.lukaBerat || 0;
          if (elLukaSedang) elLukaSedang.textContent = k.lukaSedang || 0;
          if (elLukaRingan) elLukaRingan.textContent = k.lukaRingan || 0;
          if (elSelamat) elSelamat.textContent = k.selamat || 0;
          if (elMengungsi) elMengungsi.textContent = k.mengungsi || 0;

          const tMen = document.getElementById('table-korban-meninggal');
          const tHil = document.getElementById('table-korban-hilang');
          const tBerat = document.getElementById('table-korban-berat');
          const tMeng = document.getElementById('table-korban-mengungsi');
          if (tMen) tMen.textContent = k.meninggal || 0;
          if (tHil) tHil.textContent = k.hilang || 0;
          if (tBerat) tBerat.textContent = k.lukaBerat || 0;
          if (tMeng) tMeng.textContent = k.mengungsi || 0;
        }

        if (pStat.penanganan) {
          const p = pStat.penanganan;
          const elBelum = document.getElementById('pamor-penanganan-belum');
          const elProses = document.getElementById('pamor-penanganan-proses');
          const elSelesai = document.getElementById('pamor-penanganan-selesai');
          if (elBelum) elBelum.textContent = p.belumDitangani || 0;
          if (elProses) elProses.textContent = p.dalamProses || 0;
          if (elSelesai) elSelesai.textContent = p.selesai || 0;

          const tBelum = document.getElementById('table-stat-belum');
          const tProses = document.getElementById('table-stat-proses');
          const tLanjut = document.getElementById('table-stat-lanjut');
          const tSelesai = document.getElementById('table-stat-selesai');
          if (tBelum) tBelum.textContent = p.belumDitangani || 0;
          if (tProses) tProses.textContent = p.dalamProses || 0;
          if (tLanjut) tLanjut.textContent = p.perluPenangananLanjut || 0;
          if (tSelesai) tSelesai.textContent = p.selesai || 0;
        }

        renderPamorStatusPenangananChart(pStat.statusPenangananBulanan);
        renderPamorTrenKorbanChart(pStat.trenKorbanBulanan);
        renderPamorDistribusiJenisChart(pStat.distribusiJenis);
      }

      // Update PAMOR GRAFIK (Halaman 2)
      if (result.pamorGrafik) {
        const pGraf = result.pamorGrafik;
        const elTotJenis = document.getElementById('pamor-grafik-total-jenis');
        const elTotDampak = document.getElementById('pamor-grafik-total-dampak');
        const elTop10Sub = document.getElementById('pamor-top10-total-sub');
        const elTop15Sub = document.getElementById('pamor-top15-dampak-sub');

        if (elTotJenis) elTotJenis.textContent = Number(pGraf.totalJenisKejadian || 0).toLocaleString('id-ID');
        if (elTotDampak) elTotDampak.textContent = Number(pGraf.totalDampakKejadian || 0).toLocaleString('id-ID');
        if (elTop10Sub) elTop10Sub.textContent = Number(pGraf.totalJenisKejadian || 0).toLocaleString('id-ID');
        if (elTop15Sub) elTop15Sub.textContent = Number(pGraf.totalDampakKejadian || 0).toLocaleString('id-ID');

        renderPamorTop10JenisChart(pGraf.top10Jenis);
        renderPamorDistribusiTop8Chart(pGraf.distribusiTop8);
        renderPamorTop15DampakChart(pGraf.top15Dampak);
      }
    }
  } catch (error) {
    console.error('Error fetching arsip statistik:', error);
  }
}

function renderPamorStatusPenangananChart(data) {
  const canvas = document.getElementById('chart-pamor-status-penanganan');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (chartPamorStatusPenangananInstance) {
    chartPamorStatusPenangananInstance.destroy();
  }

  const months = data?.months || ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  chartPamorStatusPenangananInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Belum Ditangani',
          data: data?.belumDitangani || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          backgroundColor: '#ff4d4f',
          borderRadius: 4
        },
        {
          label: 'Dalam Proses',
          data: data?.dalamProses || [10, 12, 15, 18, 22, 28, 25, 20, 15, 12, 10, 8],
          backgroundColor: '#fa8c16',
          borderRadius: 4
        },
        {
          label: 'Perlu Penanganan Lanjut',
          data: data?.perluPenangananLanjut || [0, 0, 1, 0, 2, 1, 0, 0, 0, 0, 0, 0],
          backgroundColor: '#13c2c2',
          borderRadius: 4
        },
        {
          label: 'Selesai',
          data: data?.selesai || [15, 18, 20, 25, 30, 35, 32, 28, 22, 18, 15, 12],
          backgroundColor: '#52c41a',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Inter', size: 10 }, boxWidth: 10 }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 } } },
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { precision: 0, font: { family: 'Inter', size: 10 } } }
      }
    }
  });
}

function renderPamorTrenKorbanChart(data) {
  const canvas = document.getElementById('chart-pamor-tren-korban');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (chartPamorTrenKorbanInstance) {
    chartPamorTrenKorbanInstance.destroy();
  }

  const months = data?.months || ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  chartPamorTrenKorbanInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Meninggal',
          data: data?.meninggal || [0, 1, 0, 1, 0, 2, 0, 0, 1, 0, 0, 0],
          borderColor: '#f5222d',
          backgroundColor: 'rgba(245, 34, 45, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3
        },
        {
          label: 'Hilang',
          data: data?.hilang || [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          borderColor: '#722ed1',
          backgroundColor: 'rgba(114, 46, 209, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3
        },
        {
          label: 'Luka Berat',
          data: data?.lukaBerat || [1, 0, 2, 1, 3, 2, 1, 0, 1, 0, 1, 0],
          borderColor: '#fa8c16',
          backgroundColor: 'rgba(250, 140, 22, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3
        },
        {
          label: 'Luka Sedang',
          data: data?.lukaSedang || [2, 3, 1, 4, 6, 8, 4, 3, 2, 1, 1, 2],
          borderColor: '#faad14',
          backgroundColor: 'rgba(250, 173, 20, 0.15)',
          fill: true,
          tension: 0.4,
          pointRadius: 3
        },
        {
          label: 'Luka Ringan',
          data: data?.lukaRingan || [4, 5, 3, 7, 10, 12, 8, 6, 4, 3, 2, 3],
          borderColor: '#13c2c2',
          backgroundColor: 'rgba(19, 194, 194, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3
        },
        {
          label: 'Mengungsi',
          data: data?.mengungsi || [0, 2, 0, 0, 5, 8, 4, 0, 0, 0, 0, 0],
          borderColor: '#1890ff',
          backgroundColor: 'rgba(24, 144, 255, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Inter', size: 10 }, boxWidth: 10 }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 } } },
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { precision: 0, font: { family: 'Inter', size: 10 } } }
      }
    }
  });
}

function renderPamorDistribusiJenisChart(data) {
  const canvas = document.getElementById('chart-pamor-distribusi-jenis');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (chartPamorDistribusiJenisInstance) {
    chartPamorDistribusiJenisInstance.destroy();
  }

  const labels = data?.labels || [
    'Gempa Bumi', 'Kebakaran Hutan/Lahan', 'Kebakaran Bangunan', 'Kekeringan', 
    'Gelombang Pasang', 'Tanah Longsor', 'Laka Laut', 'Bangunan Roboh', 'Pohon Tumbang'
  ];
  const counts = data?.counts || [53, 10, 9, 4, 2, 2, 2, 1, 1];
  const colors = [
    '#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', 
    '#faad14', '#13c2c2', '#2f54eb', '#a0d911', '#f5222d'
  ];

  const totalBadge = document.getElementById('pamor-donut-total-badge');
  if (totalBadge && data?.total) {
    totalBadge.textContent = `Total: ${data.total}`;
  }

  chartPamorDistribusiJenisInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: counts,
        backgroundColor: colors.slice(0, counts.length),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Inter', size: 10 }, boxWidth: 10 }
        }
      }
    }
  });
}

function renderPamorTop10JenisChart(data) {
  const canvas = document.getElementById('chart-pamor-top10-jenis');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (chartPamorTop10JenisInstance) {
    chartPamorTop10JenisInstance.destroy();
  }

  const labels = data?.labels || ['Gempa Bumi', 'Kebakaran Bangunan', 'Kebakaran Hutan/Lahan', 'Tanah Longsor', 'Cuaca Ekstrem', 'Pohon Tumbang', 'Kekeringan', 'Lain - Lain', 'Bangunan Roboh', 'Gelombang Pasang'];
  const counts = data?.counts || [2072, 85, 42, 28, 20, 18, 14, 10, 5, 3];

  chartPamorTop10JenisInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Jenis Kejadian',
        data: counts,
        backgroundColor: '#1890ff',
        borderRadius: 4,
        hoverBackgroundColor: '#096dd9'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Inter', size: 10 } } },
        y: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 } } }
      }
    }
  });
}

function renderPamorDistribusiTop8Chart(data) {
  const canvas = document.getElementById('chart-pamor-distribusi-top8');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (chartPamorDistribusiTop8Instance) {
    chartPamorDistribusiTop8Instance.destroy();
  }

  const labels = data?.labels || ['Gempa Bumi', 'Kebakaran Bangunan', 'Kebakaran Hutan/Lahan', 'Tanah Longsor', 'Cuaca Ekstrem', 'Pohon Tumbang', 'Kekeringan', 'Lain-Lain'];
  const counts = data?.counts || [2072, 85, 42, 28, 20, 18, 14, 10];
  const colors = [
    '#1890ff', '#52c41a', '#fa8c16', '#722ed1', 
    '#eb2f96', '#faad14', '#13c2c2', '#8c8c8c'
  ];

  chartPamorDistribusiTop8Instance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: counts,
        backgroundColor: colors.slice(0, counts.length),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Inter', size: 10 }, boxWidth: 10 }
        }
      }
    }
  });
}

function renderPamorTop15DampakChart(data) {
  const canvas = document.getElementById('chart-pamor-top15-dampak');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (chartPamorTop15DampakInstance) {
    chartPamorTop15DampakInstance.destroy();
  }

  const labels = data?.labels || [
    'Rumah', 'Pohon Tumbang', 'Akses Jalan', 'Jaringan Listrik', 'Jalan', 
    'Pohon Terbakar', 'Kapal Jungkung', 'Perabotan Rumah Tangga', 'Talud', 'Lahan', 
    'Dapur', 'Kandang', 'Motor', 'Warung', 'Toko/Kedai'
  ];
  const counts = data?.counts || [226, 173, 86, 51, 22, 22, 20, 17, 17, 16, 15, 14, 13, 12, 11];
  const colors = data?.colors || [
    '#1890ff', '#52c41a', '#722ed1', '#eb2f96', '#faad14', 
    '#13c2c2', '#fa8c16', '#2f54eb', '#a0d911', '#f5222d', 
    '#fa541c', '#fa8c16', '#722ed1', '#52c41a', '#a0d911'
  ];

  chartPamorTop15DampakInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Dampak Kejadian',
        data: counts,
        backgroundColor: colors.slice(0, counts.length),
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Inter', size: 10 } } },
        y: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 } } }
      }
    }
  });
}

function handleArsipChartClick(label, index, filters) {
  const activeYear = filters?.tahun || new Date().getFullYear();
  const activeMonth = filters?.bulan || (new Date().getMonth() + 1);

  if (activeArsipPeriodeMode === 'tahun') {
    const yearNum = parseInt(label, 10);
    if (!isNaN(yearNum)) {
      selectedArsipChartFilter = { tahun: yearNum };
      setArsipActiveFilterBadge(`Tahun ${yearNum}`);
    }
  } else if (activeArsipPeriodeMode === 'bulan') {
    const monthNum = index + 1; // 1-12
    selectedArsipChartFilter = { tahun: activeYear, bulan: monthNum };
    setArsipActiveFilterBadge(`Bulan ${label} ${activeYear}`);
  } else if (activeArsipPeriodeMode === 'minggu') {
    const weekMap = [
      { start: 1, end: 7 },
      { start: 8, end: 14 },
      { start: 15, end: 21 },
      { start: 22, end: 28 },
      { start: 29, end: 31 }
    ];
    const w = weekMap[index] || { start: 1, end: 31 };
    const monthStr = String(activeMonth).padStart(2, '0');
    const startDayStr = String(w.start).padStart(2, '0');
    const endDayStr = String(w.end).padStart(2, '0');

    selectedArsipChartFilter = {
      startDate: `${activeYear}-${monthStr}-${startDayStr}`,
      endDate: `${activeYear}-${monthStr}-${endDayStr}`
    };
    setArsipActiveFilterBadge(`${label} ${activeYear}`);
  } else if (activeArsipPeriodeMode === 'hari') {
    const dayNum = index + 1;
    selectedArsipChartFilter = { tahun: activeYear, bulan: activeMonth, hari: dayNum };
    setArsipActiveFilterBadge(`Tanggal ${dayNum} ${label.split(' ')[1] || ''} ${activeYear}`);
  }

  fetchArsipData();
}

function setArsipActiveFilterBadge(text) {
  const badge = document.getElementById('arsip-active-filter-badge');
  const badgeText = document.getElementById('arsip-active-filter-text');
  if (badge && badgeText) {
    badgeText.textContent = text;
    badge.classList.remove('d-none');
  }
}

function clearArsipChartFilter() {
  selectedArsipChartFilter = null;
  const badge = document.getElementById('arsip-active-filter-badge');
  if (badge) badge.classList.add('d-none');
  fetchArsipData();
}

function initArsipStatistikControls() {
  // Toggle Tipe Grafik (Batang vs Gelembung / Donut)
  const chartTypeTabs = document.querySelectorAll('#arsip-chart-type-tabs button');
  chartTypeTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      chartTypeTabs.forEach(b => {
        b.classList.remove('btn-danger', 'active');
        b.classList.add('btn-outline-danger');
      });
      btn.classList.remove('btn-outline-danger');
      btn.classList.add('btn-danger', 'active');

      activeArsipChartType = btn.dataset.chartType || 'bar';
      fetchArsipStatistik();
    });
  });

  // Sumber Data Tab Buttons (Pembacaan Isi Berkas vs Tanggal Upload)
  const sumberTabs = document.querySelectorAll('#arsip-sumber-data-tabs button');
  sumberTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      sumberTabs.forEach(b => {
        b.classList.remove('btn-danger', 'active');
        b.classList.add('btn-outline-danger');
      });
      btn.classList.remove('btn-outline-danger');
      btn.classList.add('btn-danger', 'active');

      activeArsipSumberDataMode = btn.dataset.sumber || 'isi';
      fetchArsipStatistik();
    });
  });

  // Mode Tab Buttons (Tahun, Bulan, Minggu, Hari)
  const tabButtons = document.querySelectorAll('#arsip-stat-tabs button');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => {
        b.classList.remove('btn-danger', 'active');
        b.classList.add('btn-outline-danger');
      });
      btn.classList.remove('btn-outline-danger');
      btn.classList.add('btn-danger', 'active');

      activeArsipPeriodeMode = btn.dataset.periode || 'tahun';

      // Toggle Filter Controls Visibility
      const containerTahun = document.getElementById('container-stat-filter-tahun');
      const containerBulan = document.getElementById('container-stat-filter-bulan');
      const containerMinggu = document.getElementById('container-stat-filter-minggu');
      const containerHari = document.getElementById('container-stat-filter-hari');

      if (activeArsipPeriodeMode === 'tahun') {
        if (containerTahun) containerTahun.classList.remove('d-none');
        if (containerBulan) containerBulan.classList.add('d-none');
        if (containerMinggu) containerMinggu.classList.add('d-none');
        if (containerHari) containerHari.classList.add('d-none');
      } else if (activeArsipPeriodeMode === 'bulan') {
        if (containerTahun) containerTahun.classList.remove('d-none');
        if (containerBulan) containerBulan.classList.remove('d-none');
        if (containerMinggu) containerMinggu.classList.add('d-none');
        if (containerHari) containerHari.classList.add('d-none');
      } else if (activeArsipPeriodeMode === 'minggu') {
        if (containerTahun) containerTahun.classList.remove('d-none');
        if (containerBulan) containerBulan.classList.remove('d-none');
        if (containerMinggu) containerMinggu.classList.remove('d-none');
        if (containerHari) containerHari.classList.add('d-none');
      } else if (activeArsipPeriodeMode === 'hari') {
        if (containerTahun) containerTahun.classList.remove('d-none');
        if (containerBulan) containerBulan.classList.remove('d-none');
        if (containerMinggu) containerMinggu.classList.add('d-none');
        if (containerHari) containerHari.classList.remove('d-none');
      }

      fetchArsipStatistik();
    });
  });

  // Filter Divisi Dropdown
  const statDivisiSelect = document.getElementById('stat-filter-divisi');
  const listKategoriSelect = document.getElementById('filter-arsip-kategori');

  if (statDivisiSelect) {
    statDivisiSelect.addEventListener('change', () => {
      if (listKategoriSelect) {
        listKategoriSelect.value = statDivisiSelect.value;
      }
      fetchArsipStatistik();
      fetchArsipData();
    });
  }

  // Filter Folder Dropdown
  const listFolderSelect = document.getElementById('filter-arsip-folder');
  if (listFolderSelect) {
    listFolderSelect.addEventListener('change', () => {
      fetchArsipData();
    });
  }

  // Filter Dropdown Listeners: Tahun, Bulan, Minggu, Hari
  const statTahunSelect = document.getElementById('stat-filter-tahun');
  const statBulanSelect = document.getElementById('stat-filter-bulan');
  const statMingguSelect = document.getElementById('stat-filter-minggu');
  const statHariSelect = document.getElementById('stat-filter-hari');

  if (statTahunSelect) statTahunSelect.addEventListener('change', fetchArsipStatistik);
  if (statBulanSelect) statBulanSelect.addEventListener('change', fetchArsipStatistik);
  if (statMingguSelect) statMingguSelect.addEventListener('change', fetchArsipStatistik);
  if (statHariSelect) statHariSelect.addEventListener('change', fetchArsipStatistik);
}

let chartDamkarJenisTugasInstance = null;
let chartDamkarWilayahInstance = null;
let chartDamkarTrenBulananInstance = null;

function renderAdditionalDamkarTaskCharts(dataList = []) {
  const canvasJenis = document.getElementById('chart-damkar-jenis-tugas');
  const canvasWilayah = document.getElementById('chart-damkar-wilayah');
  const canvasTren = document.getElementById('chart-damkar-tren-bulanan');

  if (!canvasJenis || !canvasWilayah || !canvasTren) return;

  if (!Array.isArray(dataList) || dataList.length === 0) {
    const emptyLabels = ['Tidak Ada Data'];

    if (chartDamkarJenisTugasInstance) chartDamkarJenisTugasInstance.destroy();
    chartDamkarJenisTugasInstance = new Chart(canvasJenis, {
      type: 'doughnut',
      data: {
        labels: emptyLabels,
        datasets: [{
          label: 'Jumlah',
          data: [0],
          backgroundColor: ['rgba(148, 163, 184, 0.7)'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'bottom' } }
      }
    });

    if (chartDamkarWilayahInstance) chartDamkarWilayahInstance.destroy();
    chartDamkarWilayahInstance = new Chart(canvasWilayah, {
      type: 'bar',
      data: {
        labels: emptyLabels,
        datasets: [{
          label: 'Wilayah',
          data: [0],
          backgroundColor: ['rgba(148, 163, 184, 0.7)'],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
      }
    });

    if (chartDamkarTrenBulananInstance) chartDamkarTrenBulananInstance.destroy();
    chartDamkarTrenBulananInstance = new Chart(canvasTren, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
        datasets: [{
          label: 'Volume',
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          borderColor: '#94a3b8',
          backgroundColor: 'rgba(148, 163, 184, 0.15)',
          fill: true,
          tension: 0.4,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
      }
    });

    return;
  }

  // 1. Hitung Distribusi Jenis Tugas Damkar
  const jenisCategories = {
    'Kebakaran Pemukiman / Bangunan': 0,
    'Kebakaran Lahan / Hutan': 0,
    'Evakuasi Sarang Tawon': 0,
    'Evakuasi Satwa Liar (Ular/Kucing)': 0,
    'Pelepasan Cincin Terjepit': 0,
    'Evakuasi Pohon Tumbang': 0,
    'Penyelamatan Korban': 0,
    'Darurat Non-Kebakaran Lainnya': 0
  };

  dataList.forEach(item => {
    let parsedData = null;
    try {
      parsedData = typeof item.parsed_data === 'string' ? JSON.parse(item.parsed_data) : item.parsed_data;
    } catch (error) {
      parsedData = null;
    }

    if (parsedData?.category_counts && typeof parsedData.category_counts === 'object') {
      Object.entries(parsedData.category_counts).forEach(([category, count]) => {
        const categoryMap = {
          'Kebakaran Bangunan': 'Kebakaran Pemukiman / Bangunan',
          'Kebakaran Hutan / Lahan': 'Kebakaran Lahan / Hutan',
          'Evakuasi Sarang Tawon': 'Evakuasi Sarang Tawon',
          'Evakuasi Satwa Liar (Ular/Kucing)': 'Evakuasi Satwa Liar (Ular/Kucing)',
          'Evakuasi Pohon Tumbang': 'Evakuasi Pohon Tumbang',
          'Penyelamatan Korban & Laka Air': 'Penyelamatan Korban',
          'Pelepasan Cincin Terjepit': 'Pelepasan Cincin Terjepit',
          'Cuaca Ekstrem & Angin Kencang': 'Darurat Non-Kebakaran Lainnya',
          'Tanah Longsor': 'Darurat Non-Kebakaran Lainnya',
          'Darurat Non-Kebakaran Lainnya': 'Darurat Non-Kebakaran Lainnya'
        };
        const target = categoryMap[category] || 'Darurat Non-Kebakaran Lainnya';
        jenisCategories[target] += Math.max(0, Number(count) || 0);
      });
      return;
    }

    const text = ((item.judul_arsip || '') + ' ' + (item.kategori || '') + ' ' + (item.deskripsi || '') + ' ' + (item.parsed_data || '')).toLowerCase();

    if (text.includes('bangunan') || text.includes('rumah') || text.includes('gedung') || text.includes('pemukiman')) {
      jenisCategories['Kebakaran Pemukiman / Bangunan'] += (item.record_count || 1);
    } else if (text.includes('lahan') || text.includes('hutan') || text.includes('semak') || text.includes('kebun')) {
      jenisCategories['Kebakaran Lahan / Hutan'] += (item.record_count || 1);
    } else if (text.includes('tawon') || text.includes('vespa') || text.includes('sarang')) {
      jenisCategories['Evakuasi Sarang Tawon'] += (item.record_count || 1);
    } else if (text.includes('ular') || text.includes('kucing') || text.includes('anjing') || text.includes('satwa') || text.includes('hewan')) {
      jenisCategories['Evakuasi Satwa Liar (Ular/Kucing)'] += (item.record_count || 1);
    } else if (text.includes('cincin') || text.includes('terjepit') || text.includes('jari')) {
      jenisCategories['Pelepasan Cincin Terjepit'] += (item.record_count || 1);
    } else if (text.includes('pohon') || text.includes('tumbang') || text.includes('dahan')) {
      jenisCategories['Evakuasi Pohon Tumbang'] += (item.record_count || 1);
    } else if (text.includes('sumur') || text.includes('tenggelam') || text.includes('korban') || text.includes('evakuasi')) {
      jenisCategories['Penyelamatan Korban'] += (item.record_count || 1);
    } else {
      jenisCategories['Darurat Non-Kebakaran Lainnya'] += (item.record_count || 1);
    }
  });

  const jenisLabels = Object.keys(jenisCategories);
  const jenisValues = Object.values(jenisCategories);

  // Render Grafik 1: Jenis Tugas Damkar (Horizontal Bar Chart)
  if (chartDamkarJenisTugasInstance) chartDamkarJenisTugasInstance.destroy();
  chartDamkarJenisTugasInstance = new Chart(canvasJenis, {
    type: 'bar',
    data: {
      labels: jenisLabels,
      datasets: [{
        label: 'Jumlah Penanganan Kejadian',
        data: jenisValues,
        backgroundColor: [
          'rgba(220, 38, 38, 0.85)',
          'rgba(234, 88, 12, 0.85)',
          'rgba(217, 119, 6, 0.85)',
          'rgba(16, 185, 129, 0.85)',
          'rgba(6, 182, 212, 0.85)',
          'rgba(59, 130, 246, 0.85)',
          'rgba(139, 92, 246, 0.85)',
          'rgba(107, 114, 128, 0.85)'
        ],
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        y: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } }
      }
    }
  });

  // 2. Hitung Distribusi Per Wilayah DIY
  const wilayahCategories = {
    'Kota Yogyakarta': 0,
    'Sleman': 0,
    'Bantul': 0,
    'Kulon Progo': 0,
    'Gunungkidul': 0
  };

  dataList.forEach(item => {
    const text = ((item.judul_arsip || '') + ' ' + (item.deskripsi || '') + ' ' + (item.parsed_data || '')).toLowerCase();
    if (text.includes('sleman')) wilayahCategories['Sleman'] += (item.record_count || 1);
    else if (text.includes('bantul')) wilayahCategories['Bantul'] += (item.record_count || 1);
    else if (text.includes('kulon') || text.includes('progo')) wilayahCategories['Kulon Progo'] += (item.record_count || 1);
    else if (text.includes('gunung') || text.includes('kidul')) wilayahCategories['Gunungkidul'] += (item.record_count || 1);
    else wilayahCategories['Kota Yogyakarta'] += (item.record_count || 1);
  });

  const wilayahLabels = Object.keys(wilayahCategories);
  const wilayahValues = Object.values(wilayahCategories);

  // Render Grafik 2: Wilayah Operasional (Bar Chart)
  if (chartDamkarWilayahInstance) chartDamkarWilayahInstance.destroy();
  chartDamkarWilayahInstance = new Chart(canvasWilayah, {
    type: 'bar',
    data: {
      labels: wilayahLabels,
      datasets: [{
        label: 'Total Penanganan Wilayah',
        data: wilayahValues,
        backgroundColor: [
          'rgba(239, 68, 68, 0.85)',
          'rgba(249, 115, 22, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(16, 185, 129, 0.85)',
          'rgba(14, 165, 233, 0.85)'
        ],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false }, ticks: { font: { weight: 'bold' } } }
      }
    }
  });

  // 3. Tren Volume Tugas Bulanan (Smooth Line Chart)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthCounts = new Array(12).fill(0);

  dataList.forEach(item => {
    const d = new Date(item.created_at || Date.now());
    const m = d.getMonth();
    monthCounts[m] += (item.record_count || 1);
  });

  const monthlyValues = monthCounts;

  // Render Grafik 3: Tren Bulanan (Smooth Area Line Chart)
  if (chartDamkarTrenBulananInstance) chartDamkarTrenBulananInstance.destroy();
  chartDamkarTrenBulananInstance = new Chart(canvasTren, {
    type: 'line',
    data: {
      labels: monthNames,
      datasets: [{
        label: 'Volume Penanganan Kejadian (Tugas Damkar)',
        data: monthlyValues,
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.15)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#dc2626',
        pointRadius: 5,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

async function fetchArsipData() {
  const tableBody = document.getElementById('table-arsip-body');
  if (!tableBody) return;

  const searchVal = document.getElementById('filter-arsip-search')?.value || '';
  const kategoriVal = document.getElementById('filter-arsip-kategori')?.value || 'Semua';
  const folderVal = document.getElementById('filter-arsip-folder')?.value || 'Semua';

  const queryParams = new URLSearchParams();
  if (searchVal) queryParams.append('search', searchVal);
  if (kategoriVal && kategoriVal !== 'Semua') queryParams.append('kategori', kategoriVal);
  if (folderVal && folderVal !== 'Semua') queryParams.append('folder', folderVal);

  if (selectedArsipChartFilter) {
    if (selectedArsipChartFilter.tahun) queryParams.append('tahun', selectedArsipChartFilter.tahun);
    if (selectedArsipChartFilter.bulan) queryParams.append('bulan', selectedArsipChartFilter.bulan);
    if (selectedArsipChartFilter.hari) queryParams.append('hari', selectedArsipChartFilter.hari);
    if (selectedArsipChartFilter.startDate) queryParams.append('startDate', selectedArsipChartFilter.startDate);
    if (selectedArsipChartFilter.endDate) queryParams.append('endDate', selectedArsipChartFilter.endDate);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/arsip?${queryParams.toString()}`);
    const result = await response.json();

    if (response.ok && result.success) {
      const arsipList = result.data || [];
      allFetchedArsipData = arsipList;
      currentArsipList = arsipList;

      // Update Dropdown Filter Folder
      if (result.stats && Array.isArray(result.stats.availableFolders)) {
        currentAvailableFolders = result.stats.availableFolders
          .map((folder) => String(folder || '').trim())
          .filter(Boolean)
          .filter((folder) => folder.toLowerCase() !== 'semua');

        if (currentAvailableFolders.length === 0) {
          currentAvailableFolders = ['Umum'];
        }

        renderArsipFolderGrid(currentAvailableFolders, result.data || []);
        renderAdditionalDamkarTaskCharts(result.data || []);
        const selectFolder = document.getElementById('filter-arsip-folder');
        if (selectFolder) {
          const currFolderVal = selectFolder.value || 'Semua';
          let folderOptionsHtml = `<option value="Semua">-- Semua Folder --</option>`;
          currentAvailableFolders.forEach(f => {
            folderOptionsHtml += `<option value="${escapeHtml(f)}" ${currFolderVal === f ? 'selected' : ''}>📁 ${escapeHtml(f)}</option>`;
          });
          selectFolder.innerHTML = folderOptionsHtml;
        }
      }

      if (arsipList.length === 0) {
        renderAdditionalDamkarTaskCharts([]);
        tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-4 text-muted">
              <i class="bi bi-inbox fs-3 d-block mb-1"></i>
              Belum ada file arsip data yang sesuai dengan filter.
            </td>
          </tr>
        `;
        return;
      }

      renderAdditionalDamkarTaskCharts(arsipList);

      const monthNamesIndo = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];

      tableBody.innerHTML = arsipList.map((item, index) => {
        const badgeHtml = getFileBadgeHtml(item.tipe_file);
        const formattedSize = formatBytes(item.ukuran_file);
        const fileUrl = `${API_BASE_URL.replace('/api', '')}${item.file_url}`;
        const downloadUrl = `${API_BASE_URL}/arsip/${item.id}/download`;

        // Parse Date & Grouping Format
        const dateObj = new Date(item.created_at || Date.now());
        const day = dateObj.getDate();
        const monthIdx = dateObj.getMonth();
        const year = item.file_year || dateObj.getFullYear();
        const monthName = monthNamesIndo[monthIdx] || 'Januari';
        const formattedDateSeq = `${day} ${monthName} ${year}`;

        const parsedBadge = (item.record_count || item.file_year) 
          ? `<span class="badge bg-danger-subtle text-danger border border-danger-subtle ms-1" title="Data hasil ekstraksi isi berkas"><i class="bi bi-cpu-fill me-1"></i>${item.record_count || 1} Data (${item.file_year || 2024})</span>`
          : '';

        const folderBadge = `<span class="badge bg-secondary-subtle text-dark border ms-1" title="Folder Penyimpanan Berkas"><i class="bi bi-folder-fill text-warning me-1"></i>${escapeHtml(item.nama_folder || 'Umum')}</span>`;
        const isChecked = selectedArsipIds.has(parseInt(item.id, 10));

        return `
          <tr class="file-row-clickable" style="cursor:pointer;" onclick="previewArsip(${item.id})">
            <td class="text-center" onclick="event.stopPropagation();">
              <input type="checkbox" class="form-check-input arsip-row-check" data-id="${item.id}" ${isChecked ? 'checked' : ''} onchange="toggleArsipSelection(${item.id}, this)">
            </td>
            <td class="fw-bold text-muted" onclick="event.stopPropagation();">${index + 1}</td>
            <td onclick="event.stopPropagation();">
              <div class="fw-bold text-dark">${escapeHtml(item.judul_arsip)}</div>
              <small class="text-muted"><i class="bi bi-paperclip me-1"></i>${escapeHtml(item.nama_asli)}</small>
            </td>
            <td onclick="event.stopPropagation();">
              <div class="d-flex align-items-center gap-1 flex-wrap">
                <span class="badge bg-light text-dark border">${escapeHtml(item.kategori || 'Lainnya')}</span>
                ${folderBadge}
              </div>
            </td>
            <td onclick="event.stopPropagation();">
              <div class="d-flex align-items-center gap-2 flex-wrap">
                ${badgeHtml}
                ${parsedBadge}
                <small class="text-muted">${formattedSize}</small>
              </div>
            </td>
            <td onclick="event.stopPropagation();">
              <span class="badge bg-danger-subtle text-danger border border-danger-subtle fw-semibold">
                <i class="bi bi-calendar-check me-1"></i>${formattedDateSeq}
              </span>
            </td>
            <td class="small text-muted" style="max-width: 220px;" onclick="event.stopPropagation();">
              ${escapeHtml(item.deskripsi || '-')}
            </td>
            <td class="text-center" onclick="event.stopPropagation();">
              <div class="btn-group btn-group-sm">
                <button type="button" class="btn btn-outline-info" onclick="previewArsip(${item.id}); event.stopPropagation();" title="Lihat / Preview File Langsung">
                  <i class="bi bi-eye-fill"></i>
                </button>
                <a href="${downloadUrl}" class="btn btn-outline-primary" title="Unduh File Dalam Berbagai Format" onclick="event.stopPropagation();">
                  <i class="bi bi-download"></i>
                </a>
                <button type="button" class="btn btn-outline-danger" onclick="deleteArsip(${item.id}, '${escapeHtml(item.judul_arsip)}'); event.stopPropagation();" title="Hapus File Arsip">
                  <i class="bi bi-trash-fill"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      updateArsipBatchActionBar();

    } else {
      allFetchedArsipData = [];
      currentArsipList = [];
      renderAdditionalDamkarTaskCharts([]);
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4 text-danger">
            <i class="bi bi-exclamation-triangle-fill me-1"></i> Gagal memuat data arsip.
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error('Error fetching arsip data:', error);
    allFetchedArsipData = [];
    currentArsipList = [];
    renderAdditionalDamkarTaskCharts([]);
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-4 text-danger">
          Terjadi kesalahan koneksi ke server saat memuat data arsip.
        </td>
      </tr>
    `;
  }
}

function openModalUploadArsip() {
  const form = document.getElementById('form-upload-arsip');
  if (form) form.reset();

  const folderSelect = document.getElementById('arsip-nama-folder');
  if (folderSelect && Array.isArray(currentAvailableFolders)) {
    const optionsHtml = currentAvailableFolders.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
    folderSelect.innerHTML = optionsHtml || '<option value="Umum">Folder Umum</option>';
  }

  const customFolderInput = document.getElementById('arsip-nama-folder-custom');
  if (customFolderInput) customFolderInput.value = '';

  const fileInfo = document.getElementById('arsip-file-info');
  if (fileInfo) fileInfo.classList.add('d-none');

  const dateInput = document.getElementById('arsip-tanggal-upload');
  if (dateInput) dateInput.value = '';

  const modalElement = document.getElementById('modalUploadArsip');
  if (modalElement) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();
  }
}

function initArsipFormAndDropzone() {
  const dropzone = document.getElementById('arsip-dropzone');
  const fileInput = document.getElementById('arsip-file-input');
  const fileInfo = document.getElementById('arsip-file-info');
  const fileName = document.getElementById('arsip-file-name');
  const fileSize = document.getElementById('arsip-file-size');
  const form = document.getElementById('form-upload-arsip');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-danger', 'bg-danger-subtle');
    });

    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-danger', 'bg-danger-subtle');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-danger', 'bg-danger-subtle');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        updateArsipFileInputDisplay();
      }
    });

    fileInput.addEventListener('change', updateArsipFileInputDisplay);
  }

  function updateArsipFileInputDisplay() {
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (fileName) fileName.textContent = file.name;
      if (fileSize) fileSize.textContent = formatBytes(file.size);
      if (fileInfo) fileInfo.classList.remove('d-none');
    } else {
      if (fileInfo) fileInfo.classList.add('d-none');
    }
  }

  if (form) {
    form.addEventListener('submit', handleUploadArsipSubmit);
  }
}

async function handleUploadArsipSubmit(e) {
  e.preventDefault();
  const token = getAuthToken();
  const form = e.target;
  const submitBtn = document.getElementById('btn-submit-upload-arsip');

  const formData = new FormData(form);

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Mengunggah...`;
    }

    const response = await fetch(`${API_BASE_URL}/arsip`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();

    if (response.ok && result.success) {
      Swal.fire({
        title: 'Berhasil!',
        text: result.message || 'File arsip data berhasil diunggah.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      const modalElement = document.getElementById('modalUploadArsip');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
      }

      form.reset();
      const fileInfo = document.getElementById('arsip-file-info');
      if (fileInfo) fileInfo.classList.add('d-none');

      fetchArsipData();
      fetchArsipStatistik();
    } else {
      Swal.fire('Gagal Upload', result.message || 'Terjadi kesalahan saat mengunggah file arsip.', 'error');
    }
  } catch (error) {
    console.error('Error uploading arsip:', error);
    Swal.fire('Error', 'Terjadi kesalahan jaringan atau server saat mengunggah file.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="bi bi-cloud-upload-fill me-1"></i> Unggah Arsip`;
    }
  }
}

async function deleteArsip(id, judul) {
  const idNumber = Number(id);
  if (!Number.isInteger(idNumber) || idNumber <= 0) {
    Swal.fire('Gagal Hapus', 'ID berkas tidak valid untuk dihapus.', 'error');
    return;
  }

  const token = getAuthToken();
  const result = await Swal.fire({
    title: 'Hapus file arsip?',
    text: `File "${judul}" akan dihapus secara permanen dari server.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    confirmButtonText: 'Ya, Hapus File',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  try {
    const response = await fetch(`${API_BASE_URL}/arsip/${idNumber}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      Swal.fire({
        title: 'Terhapus!',
        text: data.message || 'File arsip telah dihapus.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });

      allFetchedArsipData = allFetchedArsipData.filter(item => Number(item.id) !== idNumber);
      currentArsipList = currentArsipList.filter(item => Number(item.id) !== idNumber);
      selectedArsipIds.delete(idNumber);
      explorerSelectedIds.delete(idNumber);
      updateArsipBatchActionBar();
      renderArsipFolderGrid(currentAvailableFolders, allFetchedArsipData);
      renderExplorerFilesTable();
      fetchArsipData();
      fetchArsipStatistik();
    } else {
      Swal.fire('Gagal Hapus', data.message || 'Gagal menghapus file arsip.', 'error');
    }
  } catch (error) {
    console.error('Error deleting arsip:', error);
    Swal.fire('Error', 'Terjadi kesalahan jaringan saat menghapus file arsip.', 'error');
  }
}

let previewMapInstance = null;
let previewObjectUrls = [];

function getPreviewFileUrl(item) {
  if (!item.file_url) return '';
  return item.file_url.startsWith('http')
    ? item.file_url
    : `${API_BASE_URL.replace('/api', '')}${item.file_url}`;
}

function showPreviewError(containerEl, item, error) {
  console.error(`Preview gagal untuk ${item.nama_asli}:`, error);
  containerEl.innerHTML = `
    <div class="alert alert-warning border-warning-subtle shadow-sm">
      <h6 class="fw-bold"><i class="bi bi-exclamation-triangle-fill me-2"></i>Preview gagal</h6>
      <div class="small"><strong>File:</strong> ${escapeHtml(item.nama_asli)}</div>
      <div class="small"><strong>Penyebab:</strong> ${escapeHtml(error.message || 'Format tidak didukung atau file tidak dapat dibaca.')}</div>
      <a href="${API_BASE_URL}/arsip/${item.id}/download" class="btn btn-warning btn-sm fw-bold mt-3" download>
        <i class="bi bi-download me-1"></i> Unduh File
      </a>
    </div>
  `;
}

async function fetchPreviewResponse(url) {
  if (!url) throw new Error('URL file tidak tersedia.');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`File tidak dapat diakses (HTTP ${response.status}).`);
  return response;
}

function renderTextPreview(text, item, containerEl, label) {
  containerEl.innerHTML = `
    <div class="bg-white p-3 rounded-3 border shadow-sm">
      <h6 class="fw-bold mb-3 pb-2 border-bottom"><i class="bi bi-file-earmark-code-fill text-primary me-2"></i>${label}</h6>
      <pre class="mb-0 p-3 rounded border bg-light" style="max-height: 520px; overflow: auto; white-space: pre-wrap;"></pre>
    </div>
  `;
  const pre = containerEl.querySelector('pre');
  if (pre) pre.textContent = text;
}

function parseCsvRows(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const delimiters = [',', ';', '\t'];
  const delimiter = delimiters.sort((a, b) =>
    (firstLine.split(b).length - 1) - (firstLine.split(a).length - 1)
  )[0];
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      if (row.some(value => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some(value => value.trim() !== '')) rows.push(row);
  return rows;
}

function renderCsvPreview(text, containerEl) {
  const rows = parseCsvRows(text);
  const headers = rows.shift() || [];
  const table = document.createElement('table');
  table.className = 'table table-sm table-striped table-hover align-middle mb-0';
  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  headers.forEach(header => {
    const cell = document.createElement('th');
    cell.textContent = header;
    headerRow.appendChild(cell);
  });
  const tbody = table.createTBody();
  rows.slice(0, 10000).forEach(row => {
    const tableRow = tbody.insertRow();
    headers.forEach((_, index) => {
      const cell = tableRow.insertCell();
      cell.textContent = row[index] || '';
    });
  });
  containerEl.innerHTML = '<div class="bg-white p-3 rounded-3 border shadow-sm"><h6 class="fw-bold mb-3 pb-2 border-bottom"><i class="bi bi-table text-success me-2"></i>Tabel Data CSV</h6><div class="table-responsive" style="max-height: 520px;"></div></div>';
  const tableContainer = containerEl.querySelector('.table-responsive');
  if (tableContainer) tableContainer.appendChild(table);
}

function renderMediaPreview(item, containerEl, type, label, icon) {
  const url = getPreviewFileUrl(item);
  const wrapper = document.createElement('div');
  wrapper.className = 'text-center p-3 bg-white rounded-3 border shadow-sm';
  const media = document.createElement(type);
  media.src = url;
  media.className = 'img-fluid rounded';
  media.style.cssText = 'max-height: 520px; max-width: 100%; object-fit: contain;';
  media.alt = item.nama_asli;
  if (type !== 'img') media.controls = true;
  wrapper.appendChild(media);
  containerEl.replaceChildren(wrapper);
  if (media && type === 'img') media.addEventListener('error', () => showPreviewError(containerEl, item, new Error('Gambar tidak dapat dimuat.')));
  if (media && type !== 'img') media.addEventListener('error', () => showPreviewError(containerEl, item, new Error(`${label} tidak dapat diputar oleh browser.`)));
  icon.className = type === 'video' ? 'bi bi-camera-video-fill text-danger fs-4' : 'bi bi-music-note-beamed text-primary fs-4';
}

function renderUnsupportedPreview(item, bodyEl, label) {
  bodyEl.innerHTML = `
    <div class="bg-white p-4 rounded-3 border shadow-sm text-center">
      <i class="bi bi-file-earmark-x text-secondary" style="font-size: 3rem;"></i>
      <h5 class="fw-bold mt-3">Preview ${label} tidak tersedia</h5>
      <p class="text-muted mb-3">Format ini tidak dapat dibuka langsung di browser. Silakan unduh file untuk membukanya.</p>
      <a href="${API_BASE_URL}/arsip/${item.id}/download" class="btn btn-danger fw-bold" download><i class="bi bi-download me-1"></i>Unduh File</a>
    </div>
  `;
}

async function renderGeoJsonPreview(item, bodyEl, iconEl) {
  iconEl.className = 'bi bi-geo-alt-fill text-info fs-4';
  bodyEl.innerHTML = '<div class="bg-white p-3 rounded-3 border shadow-sm"><h6 class="fw-bold mb-2 text-dark"><i class="bi bi-map-fill text-danger me-1"></i>Visualisasi Peta Spasial GeoJSON</h6><div id="preview-map-container" class="rounded-3 border mb-3" style="height: 400px; width: 100%;"></div><div id="preview-geojson-info" class="small text-muted bg-light p-2 rounded border">Memuat fitur spasial...</div></div>';
  try {
    if (previewMapInstance) previewMapInstance.remove();
    const mapContainer = document.getElementById('preview-map-container');
    if (!mapContainer || !window.L) throw new Error('Leaflet map viewer tidak tersedia.');
    previewMapInstance = L.map(mapContainer).setView([-7.7978, 110.3688], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(previewMapInstance);
    const response = await fetchPreviewResponse(getPreviewFileUrl(item));
    const geojson = await response.json();
    const validTypes = ['FeatureCollection', 'Feature', 'Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection'];
    if (!geojson || !validTypes.includes(geojson.type)) throw new Error('Isi file bukan GeoJSON yang valid.');
    const sanitizedResult = sanitizeGeoJSONForPreview(geojson);
    const preparedGeoJSON = sanitizedResult.data;
    const validFeatureCount = preparedGeoJSON.type === 'FeatureCollection'
      ? preparedGeoJSON.features.length
      : preparedGeoJSON.type === 'Feature' ? 1 : 0;
    const geoLayer = L.geoJSON(preparedGeoJSON, {
      onEachFeature: (feature, layer) => {
        if (feature.properties) {
          const popup = document.createElement('div');
          Object.entries(feature.properties).forEach(([key, value]) => {
            const line = document.createElement('div');
            const strong = document.createElement('strong');
            strong.textContent = `${key}: `;
            line.append(strong, document.createTextNode(String(value)));
            popup.appendChild(line);
          });
          layer.bindPopup(popup);
        }
      }
    }).addTo(previewMapInstance);
    const bounds = geoLayer.getBounds();
    if (bounds.isValid()) previewMapInstance.fitBounds(bounds, { padding: [20, 20] });
    const skippedCount = sanitizedResult.skippedFeatures + sanitizedResult.skippedGeometries;
    const info = document.getElementById('preview-geojson-info');
    if (info) {
      info.textContent = validFeatureCount === 0
        ? 'Tidak ada fitur spasial dengan koordinat valid untuk ditampilkan.'
        : `Berhasil memuat ${validFeatureCount} fitur spasial${skippedCount ? `. ${skippedCount} fitur memiliki koordinat tidak valid dan dilewati.` : '.'} Klik marker/polygon untuk melihat atribut.`;
    }
  } catch (error) {
    showPreviewError(bodyEl, item, error);
  }
}

async function renderSpreadsheetPreview(item, bodyEl, iconEl) {
  iconEl.className = 'bi bi-file-earmark-spreadsheet-fill text-success fs-4';
  if (!window.XLSX) throw new Error('Library spreadsheet tidak tersedia.');
  const response = await fetchPreviewResponse(getPreviewFileUrl(item));
  const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
  if (!workbook.SheetNames.length) throw new Error('Workbook tidak memiliki sheet.');
  bodyEl.innerHTML = '<div class="bg-white p-3 rounded-3 border shadow-sm"><div id="excel-sheet-tabs" class="nav nav-tabs mb-3"></div><div id="excel-sheet-content" class="overflow-auto" style="max-height: 520px;"></div></div>';
  const tabs = document.getElementById('excel-sheet-tabs');
  const content = document.getElementById('excel-sheet-content');
  const renderSheet = index => {
    content.innerHTML = XLSX.utils.sheet_to_html(workbook.Sheets[workbook.SheetNames[index]], { editable: false });
    const table = content.querySelector('table');
    if (table) table.className = 'table table-bordered table-striped table-hover align-middle mb-0 small';
  };
  workbook.SheetNames.forEach((name, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `nav-link ${index === 0 ? 'active' : ''}`;
    button.textContent = name;
    button.addEventListener('click', () => {
      tabs.querySelectorAll('button').forEach(tab => tab.classList.remove('active'));
      button.classList.add('active');
      renderSheet(index);
    });
    tabs.appendChild(button);
  });
  renderSheet(0);
}

async function previewArsip(id) {
  const idNum = Number(id);
  const sourceList = Array.isArray(currentArsipList) && currentArsipList.length > 0 ? currentArsipList : allFetchedArsipData;
  const item = sourceList.find(file => Number(file.id) === idNum);
  if (!item || !Number.isInteger(idNum) || idNum <= 0) {
    console.warn('previewArsip: database ID tidak valid', id);
    return;
  }
  const modalEl = document.getElementById('modalPreviewArsip');
  const titleEl = document.getElementById('preview-arsip-title');
  const subtitleEl = document.getElementById('preview-arsip-subtitle');
  const bodyEl = document.getElementById('preview-arsip-body');
  const iconEl = document.getElementById('preview-arsip-icon');
  const downloadBtn = document.getElementById('preview-btn-download');
  if (!modalEl || !bodyEl) return;
  if (!modalEl.dataset.previewCleanupBound) {
    modalEl.addEventListener('hidden.bs.modal', () => {
      if (previewMapInstance) { previewMapInstance.remove(); previewMapInstance = null; }
      previewObjectUrls.forEach(objectUrl => URL.revokeObjectURL(objectUrl));
      previewObjectUrls = [];
      bodyEl.replaceChildren();
    });
    modalEl.dataset.previewCleanupBound = 'true';
  }
  previewObjectUrls.forEach(url => URL.revokeObjectURL(url));
  previewObjectUrls = [];
  if (previewMapInstance) { previewMapInstance.remove(); previewMapInstance = null; }
  const ext = String(item.tipe_file || item.nama_asli.split('.').pop() || '').toLowerCase().replace('.', '');
  const url = getPreviewFileUrl(item);
  titleEl.textContent = item.judul_arsip || item.nama_asli;
  subtitleEl.textContent = `${item.nama_asli} (${formatBytes(item.ukuran_file)}) - ${item.kategori || 'Lainnya'}`;
  downloadBtn.href = `${API_BASE_URL}/arsip/${idNum}/download`;
  bodyEl.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-danger me-2"></div><span class="fw-semibold text-muted">Memuat preview...</span></div>';
  const previewModal = bootstrap.Modal.getOrCreateInstance(modalEl);
  previewModal.show();
  modalEl.addEventListener('shown.bs.modal', () => {
    const modalBody = modalEl.querySelector('.modal-body');
    if (modalBody) modalBody.scrollTop = 0;
    modalEl.scrollTop = 0;
    modalEl.focus({ preventScroll: true });
  }, { once: true });
  try {
    if (['geojson'].includes(ext)) return renderGeoJsonPreview(item, bodyEl, iconEl);
    if (['xlsx', 'xls'].includes(ext)) return await renderSpreadsheetPreview(item, bodyEl, iconEl);
    if (ext === 'csv') { iconEl.className = 'bi bi-file-earmark-spreadsheet-fill text-success fs-4'; return renderCsvPreview(await (await fetchPreviewResponse(url)).text(), bodyEl); }
    if (ext === 'pdf') { iconEl.className = 'bi bi-file-earmark-pdf-fill text-danger fs-4'; bodyEl.innerHTML = `<iframe src="${escapeHtml(url)}" title="PDF ${escapeHtml(item.nama_asli)}" style="width:100%;height:550px;border:0;"></iframe>`; return; }
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) return renderMediaPreview(item, bodyEl, 'img', 'Gambar', iconEl);
    if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return renderMediaPreview(item, bodyEl, 'video', 'Video', iconEl);
    if (['mp3', 'wav', 'm4a', 'ogg'].includes(ext)) return renderMediaPreview(item, bodyEl, 'audio', 'Audio', iconEl);
    if (['qmd', 'txt', 'log', 'xml', 'html', 'md'].includes(ext)) { iconEl.className = 'bi bi-file-earmark-text-fill text-primary fs-4'; return renderTextPreview(await (await fetchPreviewResponse(url)).text(), item, bodyEl, ext === 'qmd' ? 'Dokumen Quarto' : 'Isi Dokumen'); }
    if (ext === 'json') {
      const text = await (await fetchPreviewResponse(url)).text();
      try { return renderTextPreview(JSON.stringify(JSON.parse(text), null, 2), item, bodyEl, 'JSON Viewer'); } catch { return renderTextPreview(text, item, bodyEl, 'JSON (format tidak valid)'); }
    }
    if (['doc', 'docx'].includes(ext)) { iconEl.className = 'bi bi-file-earmark-word-fill text-primary fs-4'; return renderUnsupportedPreview(item, bodyEl, 'dokumen Word'); }
    if (['zip', 'rar', '7z', 'mpk', 'shp'].includes(ext)) { iconEl.className = 'bi bi-file-earmark-zip-fill text-warning fs-4'; return renderUnsupportedPreview(item, bodyEl, 'arsip'); }
    iconEl.className = 'bi bi-file-earmark-fill text-secondary fs-4';
    renderUnsupportedPreview(item, bodyEl, 'format ini');
  } catch (error) {
    showPreviewError(bodyEl, item, error);
  }
}

/*
async function previewArsipLegacy(id) {
  const idNum = Number(id);
  const sourceList = Array.isArray(currentArsipList) && currentArsipList.length > 0
    ? currentArsipList
    : Array.isArray(allFetchedArsipData) ? allFetchedArsipData : [];

  const item = sourceList.find(a => Number(a.id) === idNum) || sourceList.find(a => String(a.id) === String(id));
  if (!item) {
    console.warn('previewArsip: item not found for id', id, 'in current list', sourceList.length);
    return;
  }

  const modalEl = document.getElementById('modalPreviewArsip');
  const titleEl = document.getElementById('preview-arsip-title');
  const subtitleEl = document.getElementById('preview-arsip-subtitle');
  const bodyEl = document.getElementById('preview-arsip-body');
  const iconEl = document.getElementById('preview-arsip-icon');
  const downloadBtn = document.getElementById('preview-btn-download');

  if (!modalEl || !bodyEl) return;

  titleEl.textContent = item.judul_arsip;
  subtitleEl.textContent = `${item.nama_asli} (${formatBytes(item.ukuran_file)}) - ${item.kategori || 'Lainnya'}`;

  const fileUrl = item.file_url ? (item.file_url.startsWith('http') ? item.file_url : `${API_BASE_URL.replace('/api', '')}${item.file_url}`) : '#';
  downloadBtn.href = `${API_BASE_URL}/arsip/${item.id}/download`;

  const ext = (item.tipe_file || '').toLowerCase();

  // Loading state
  bodyEl.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-danger me-2" role="status"></div>
      <span class="fw-semibold text-muted">Memuat pratinjau berkas "${escapeHtml(item.nama_asli)}"...</span>
    </div>
  `;

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();

  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    iconEl.className = 'bi bi-file-earmark-spreadsheet-fill text-success fs-4';
    try {
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();

      if (window.XLSX) {
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const sheetNames = workbook.SheetNames;

        if (!sheetNames || sheetNames.length === 0) {
          throw new Error('Workbook tidak memiliki sheet.');
        }

        let tabsHtml = `<ul class="nav nav-tabs mb-3 border-bottom-0" id="excel-sheet-tabs">`;
        sheetNames.forEach((sheetName, idx) => {
          tabsHtml += `
            <li class="nav-item">
              <button class="nav-link ${idx === 0 ? 'active fw-bold text-success' : 'text-dark'}" data-sheet-index="${idx}">
                <i class="bi bi-file-earmark-excel me-1"></i>${escapeHtml(sheetName)}
              </button>
            </li>
          `;
        });
        tabsHtml += `</ul>`;

        let summaryHeader = '';
        if (item.parsed_data) {
          const parsed = typeof item.parsed_data === 'string' ? JSON.parse(item.parsed_data) : item.parsed_data;
          if (parsed && parsed.summary) {
            summaryHeader = `
              <div class="alert alert-success d-flex align-items-center mb-3 py-2 px-3 shadow-sm rounded-3">
                <i class="bi bi-check-circle-fill me-2 fs-5 text-success"></i>
                <div>
                  <strong>Hasil Ekstraksi Data:</strong> ${escapeHtml(parsed.summary)}
                </div>
              </div>
            `;
          }
        }

        let tableContainerHtml = `<div id="excel-sheet-content" class="bg-white p-3 rounded-3 border shadow-sm overflow-x-auto" style="max-height: 480px;"></div>`;

        bodyEl.innerHTML = summaryHeader + tabsHtml + tableContainerHtml;

        function renderSheet(sheetIdx) {
          const sheetName = sheetNames[sheetIdx];
          const worksheet = workbook.Sheets[sheetName];
          const htmlTable = XLSX.utils.sheet_to_html(worksheet, { id: 'excel-preview-table', editable: false });

          const contentDiv = document.getElementById('excel-sheet-content');
          if (contentDiv) {
            contentDiv.innerHTML = htmlTable;
            const table = contentDiv.querySelector('table');
            if (table) {
              table.className = 'table table-bordered table-striped table-hover align-middle mb-0 small';
              table.style.fontSize = '0.85rem';
            }
          }
        }

        renderSheet(0);

        const tabBtns = bodyEl.querySelectorAll('#excel-sheet-tabs button');
        tabBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            tabBtns.forEach(b => {
              b.classList.remove('active', 'fw-bold', 'text-success');
              b.classList.add('text-dark');
            });
            btn.classList.add('active', 'fw-bold', 'text-success');
            btn.classList.remove('text-dark');

            const idx = parseInt(btn.dataset.sheetIndex, 10);
            renderSheet(idx);
          });
        });

      } else {
        throw new Error('Library SheetJS tidak tersedia.');
      }
    } catch (err) {
      console.error('Error rendering Excel preview:', err);
      renderFallbackParsedPreview(item, bodyEl);
    }

  } else if (ext === 'pdf') {
    iconEl.className = 'bi bi-file-earmark-pdf-fill text-danger fs-4';
    bodyEl.innerHTML = `
      <div class="bg-white p-2 rounded-3 border shadow-sm">
        <iframe src="${fileUrl}" style="width: 100%; height: 550px; border: none;" class="rounded-2"></iframe>
      </div>
    `;

  } else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    iconEl.className = 'bi bi-file-earmark-image-fill text-primary fs-4';
    bodyEl.innerHTML = `
      <div class="text-center p-3 bg-white rounded-3 border shadow-sm">
        <img src="${fileUrl}" class="img-fluid rounded" style="max-height: 520px; object-fit: contain;" alt="${escapeHtml(item.judul_arsip)}">
      </div>
    `;

  } else if (['geojson', 'json'].includes(ext)) {
    iconEl.className = 'bi bi-geo-alt-fill text-info fs-4';
    bodyEl.innerHTML = `
      <div class="bg-white p-3 rounded-3 border shadow-sm">
        <h6 class="fw-bold mb-2 text-dark"><i class="bi bi-map-fill text-danger me-1"></i> Visualisasi Peta Spasial GeoJSON</h6>
        <div id="preview-map-container" class="rounded-3 border mb-3" style="height: 400px; width: 100%;"></div>
        <div id="preview-geojson-info" class="small text-muted bg-light p-2 rounded border">Memuat fitur spasial...</div>
      </div>
    `;

    setTimeout(async () => {
      try {
        if (previewMapInstance) {
          previewMapInstance.remove();
          previewMapInstance = null;
        }

        const mapContainer = document.getElementById('preview-map-container');
        if (!mapContainer) return;

        previewMapInstance = L.map('preview-map-container').setView([-7.7978, 110.3688], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(previewMapInstance);

        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`Gagal mengambil GeoJSON (HTTP ${res.status}).`);
        const geojson = await res.json();
        const isValidGeoJson = geojson && (
          geojson.type === 'FeatureCollection' ||
          geojson.type === 'Feature' ||
          Array.isArray(geojson)
        );
        if (!isValidGeoJson) throw new Error('Isi file bukan GeoJSON yang valid.');

        const geoLayer = L.geoJSON(geojson, {
          onEachFeature: (feature, layer) => {
            if (feature.properties) {
              let popupContent = '<div style="max-width: 250px;">';
              for (const [k, v] of Object.entries(feature.properties)) {
                popupContent += `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</div>`;
              }
              popupContent += '</div>';
              layer.bindPopup(popupContent);
            }
          }
        }).addTo(previewMapInstance);

        previewMapInstance.fitBounds(geoLayer.getBounds(), { padding: [20, 20] });

        const infoDiv = document.getElementById('preview-geojson-info');
        if (infoDiv) {
          const featureCount = geojson.features ? geojson.features.length : 1;
          infoDiv.innerHTML = `<i class="bi bi-info-circle-fill text-info me-1"></i> Berhasil memuat <strong>${featureCount} fitur spasial</strong> dari berkas GeoJSON. Klik pada marker/polygon untuk melihat detail atribut.`;
        }
      } catch (e) {
        console.error('Error rendering GeoJSON map preview:', e);
        const infoDiv = document.getElementById('preview-geojson-info');
        if (infoDiv) {
          infoDiv.className = 'small text-danger bg-danger-subtle p-2 rounded border border-danger-subtle';
          infoDiv.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i>${escapeHtml(e.message || 'GeoJSON gagal ditampilkan.')}`;
        }
      }
    }, 200);

  } else if (['qmd', 'txt', 'md'].includes(ext)) {
    iconEl.className = 'bi bi-file-earmark-text-fill text-primary fs-4';
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      bodyEl.innerHTML = `
        <div class="bg-white p-3 rounded-3 border shadow-sm">
          <div class="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
            <h6 class="fw-bold mb-0"><i class="bi bi-file-earmark-code-fill text-primary me-2"></i>Isi Dokumen ${ext.toUpperCase()}</h6>
            <span class="badge bg-primary-subtle text-primary border">${formatBytes(item.ukuran_file)}</span>
          </div>
          <pre class="mb-0 p-3 rounded border bg-light" style="max-height: 520px; overflow: auto; white-space: pre-wrap;">${escapeHtml(text)}</pre>
        </div>
      `;
    } catch (err) {
      console.error('Error rendering text preview:', err);
      renderFallbackParsedPreview(item, bodyEl);
    }
  } else {
    // MPK / ZIP / RAR / Other Binary Files
    iconEl.className = 'bi bi-file-earmark-zip-fill text-warning fs-4';
    renderFallbackParsedPreview(item, bodyEl);
  }
}

*/
function renderFallbackParsedPreview(item, containerEl) {
  let summaryText = 'Informasi berkas arsip operasional.';
  let parsedContentHtml = '';

  if (item.parsed_data) {
    const parsed = typeof item.parsed_data === 'string' ? JSON.parse(item.parsed_data) : item.parsed_data;
    if (parsed) {
      if (parsed.summary) summaryText = parsed.summary;
      if (parsed.extracted_sample && parsed.extracted_sample.length > 0) {
        parsedContentHtml = `
          <div class="mt-3">
            <h6 class="fw-bold text-dark"><i class="bi bi-table text-danger me-1"></i> Cuplikan Data Hasil Ekstraksi (${parsed.record_count || 1} Record)</h6>
            <div class="table-responsive bg-white rounded border p-2" style="max-height: 320px;">
              <table class="table table-sm table-striped table-hover small mb-0">
                <thead class="table-dark">
                  <tr>${Object.keys(parsed.extracted_sample[0]).map(k => `<th>${escapeHtml(k)}</th>`).join('')}</tr>
                </thead>
                <tbody>
                  ${parsed.extracted_sample.map(row => `
                    <tr>${Object.values(row).map(v => `<td>${escapeHtml(String(v))}</td>`).join('')}</tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
    }
  }

  containerEl.innerHTML = `
    <div class="bg-white p-4 rounded-3 border shadow-sm">
      <div class="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
        <div class="bg-danger-subtle text-danger p-3 rounded-circle fs-3">
          <i class="bi bi-file-earmark-text-fill"></i>
        </div>
        <div>
          <h5 class="fw-bold mb-1">${escapeHtml(item.judul_arsip)}</h5>
          <span class="badge bg-danger-subtle text-danger border border-danger-subtle me-2">${escapeHtml(item.kategori || 'Lainnya')}</span>
          <span class="badge bg-secondary-subtle text-secondary border">${item.tipe_file.toUpperCase()}</span>
          <small class="text-muted ms-2">${formatBytes(item.ukuran_file)}</small>
        </div>
      </div>

      <div class="alert alert-info d-flex align-items-center mb-3">
        <i class="bi bi-info-circle-fill me-2 fs-5"></i>
        <div><strong>Ringkasan Berkas:</strong> ${escapeHtml(summaryText)}</div>
      </div>

      <p class="text-muted small">${escapeHtml(item.deskripsi || 'Tidak ada deskripsi tambahan.')}</p>

      ${parsedContentHtml}

      <div class="mt-4 p-3 bg-light rounded border text-center">
        <p class="small text-muted mb-2">Untuk membuka atau mengedit file ini secara lengkap di perangkat Anda, silakan unduh berkas asli di bawah ini:</p>
        <a href="${API_BASE_URL}/arsip/${item.id}/download" class="btn btn-danger fw-bold px-4 shadow-sm" download>
          <i class="bi bi-download me-1"></i> Unduh File Berkas Asli (${formatBytes(item.ukuran_file)})
        </a>
      </div>
    </div>
  `;
}