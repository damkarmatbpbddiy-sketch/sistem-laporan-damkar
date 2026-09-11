/* ============================================================
   COMMON UTILITIES & APPLICATION JS
   ============================================================ */

const API_BASE_URL = (() => {
  const hostname = window.location.hostname || 'localhost';
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return '/api';
})();

// Format Tanggal Indonesia
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(date);
}

// Generate Status Badge HTML
function getStatusBadge(status) {
  switch (status) {
    case 'Menunggu':
      return `<span class="badge-status badge-menunggu"><i class="bi bi-hourglass-split"></i> Menunggu</span>`;
    case 'Diproses':
      return `<span class="badge-status badge-diproses"><i class="bi bi-gear-wide-connected"></i> Diproses</span>`;
    case 'Selesai':
      return `<span class="badge-status badge-selesai"><i class="bi bi-check-circle-fill"></i> Selesai</span>`;
    default:
      return `<span class="badge badge-secondary">${status}</span>`;
  }
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRad(lat2 - lat1);
  const deltaLng = toRad(lng2 - lng1);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function estimateTravelTime(distanceKm) {
  const averageSpeedKmh = 35;
  return Math.max(5, Math.round((distanceKm / averageSpeedKmh) * 60));
}

let homeCameraStream = null;

function showHomeGeoStatus(text, type = 'info') {
  const geoStatus = document.getElementById('home-geo-status');
  const geoStatusText = document.getElementById('home-geo-status-text');
  if (!geoStatus || !geoStatusText) return;
  geoStatus.className = `alert alert-${type} py-2 px-3 small mb-3`;
  geoStatusText.textContent = text;
  geoStatus.classList.remove('d-none');
}

async function getHomeLocation() {
  if (!navigator.geolocation) {
    showHomeGeoStatus('Geolocation tidak tersedia.', 'danger');
    Swal.fire('Fitur Tidak Didukung', 'Browser Anda tidak mendukung fitur Geolocation.', 'error');
    return false;
  }

  showHomeGeoStatus('Mendeteksi lokasi GPS Anda...', 'info');

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        document.getElementById('home-latitude').value = lat;
        document.getElementById('home-longitude').value = lng;
        showHomeGeoStatus(`Koordinat ditemukan: ${lat}, ${lng}. Mengambil alamat...`, 'info');

        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
            headers: { 'Accept-Language': 'id' }
          });

          if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
              document.getElementById('home-alamat').value = data.display_name;
              showHomeGeoStatus('Lokasi & alamat berhasil ditemukan!', 'success');
              resolve(true);
              return;
            }
          }

          document.getElementById('home-alamat').value = `Koordinat ${lat}, ${lng}`;
          showHomeGeoStatus('Koordinat berhasil ditemukan. Alamat disimpan sebagai koordinat.', 'warning');
          resolve(true);
        } catch (err) {
          console.error('Nominatim error:', err);
          document.getElementById('home-alamat').value = `Koordinat ${lat}, ${lng}`;
          showHomeGeoStatus('Koordinat ditemukan. Alamat disimpan sebagai koordinat.', 'warning');
          resolve(true);
        }
      },
      (error) => {
        let errorMsg = 'Gagal mengambil lokasi GPS.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Akses lokasi ditolak. Harap izinkan akses lokasi pada browser Anda.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Informasi lokasi tidak tersedia.';
            break;
          case error.TIMEOUT:
            errorMsg = 'Waktu permintaan lokasi habis.';
            break;
        }
        showHomeGeoStatus(errorMsg, 'danger');
        Swal.fire('Gagal Ambil Lokasi', errorMsg, 'warning');
        resolve(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

async function ensureHomeLocationReady() {
  const latValue = document.getElementById('home-latitude').value;
  const lngValue = document.getElementById('home-longitude').value;
  if (latValue && lngValue) return true;
  return await getHomeLocation();
}

const stopHomeCameraStream = () => {
  const cameraVideo = document.getElementById('home-camera-video');
  const cameraPane = document.getElementById('home-camera-pane');
  if (homeCameraStream) {
    homeCameraStream.getTracks().forEach((track) => track.stop());
    homeCameraStream = null;
  }
  if (cameraVideo) cameraVideo.srcObject = null;
  if (cameraPane) cameraPane.classList.add('d-none');
};

const startHomeCameraCapture = async () => {
  const cameraVideo = document.getElementById('home-camera-video');
  const cameraPane = document.getElementById('home-camera-pane');

  const locationReady = await ensureHomeLocationReady();
  if (!locationReady) return;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showHomeGeoStatus('Kamera tidak tersedia.', 'danger');
    Swal.fire('Kamera Tidak Tersedia', 'Browser Anda tidak mendukung akses kamera.', 'error');
    return;
  }

  try {
    homeCameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    if (cameraVideo) cameraVideo.srcObject = homeCameraStream;
    if (cameraPane) cameraPane.classList.remove('d-none');
    showHomeGeoStatus('Kamera aktif. Tangkap foto ketika siap.', 'success');
  } catch (err) {
    console.error('Kamera error:', err);
    showHomeGeoStatus('Gagal mengakses kamera.', 'danger');
    Swal.fire('Gagal Mengakses Kamera', 'Izinkan akses kamera untuk melanjutkan.', 'error');
  }
};

const captureHomeCameraPhoto = () => {
  const cameraVideo = document.getElementById('home-camera-video');
  const cameraCanvas = document.getElementById('home-camera-canvas');
  const homeFotoInput = document.getElementById('home-foto');
  const imagePreview = document.getElementById('home-image-preview');
  const previewPlaceholder = document.getElementById('home-preview-placeholder');
  const formHome = document.getElementById('form-laporan-home');

  if (!homeCameraStream || !cameraVideo || !cameraCanvas) return;

  cameraCanvas.width = cameraVideo.videoWidth;
  cameraCanvas.height = cameraVideo.videoHeight;
  const context = cameraCanvas.getContext('2d');
  context.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);

  cameraCanvas.toBlob((blob) => {
    if (!blob) return;

    const file = new File([blob], `laporan-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    homeFotoInput.files = dataTransfer.files;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (imagePreview) {
        imagePreview.src = event.target.result;
        imagePreview.classList.remove('d-none');
      }
      if (previewPlaceholder) previewPlaceholder.classList.add('d-none');
    };
    reader.readAsDataURL(file);

    const alamatValue = document.getElementById('home-alamat').value.trim();
    if (document.getElementById('home-latitude').value && document.getElementById('home-longitude').value && alamatValue) {
      stopHomeCameraStream();
      Swal.fire({
        title: 'Foto siap',
        text: 'Laporan akan dikirim otomatis sekarang.',
        icon: 'success',
        timer: 900,
        showConfirmButton: false,
        willClose: () => {
          if (formHome) formHome.requestSubmit();
        }
      });
    } else {
      Swal.fire({
        title: 'Foto Diambil',
        text: 'Lokasi belum siap, gunakan kembali kamera setelah izin lokasi diberikan.',
        icon: 'info',
        confirmButtonColor: '#dc2626'
      });
    }
  }, 'image/jpeg', 0.85);
};

function initHomeCameraReport() {
  const formHome = document.getElementById('form-laporan-home');
  const btnOpenCameraHome = document.getElementById('btn-open-camera-home');
  const btnCapturePhotoHome = document.getElementById('btn-capture-photo-home');
  const btnCloseCameraHome = document.getElementById('btn-close-camera-home');
  const homeFotoInput = document.getElementById('home-foto');
  const imagePreview = document.getElementById('home-image-preview');
  const previewPlaceholder = document.getElementById('home-preview-placeholder');
  const geoStatus = document.getElementById('home-geo-status');

  if (btnOpenCameraHome) btnOpenCameraHome.addEventListener('click', startHomeCameraCapture);
  if (btnCapturePhotoHome) btnCapturePhotoHome.addEventListener('click', captureHomeCameraPhoto);
  if (btnCloseCameraHome) btnCloseCameraHome.addEventListener('click', stopHomeCameraStream);

  if (homeFotoInput) {
    homeFotoInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) {
        if (imagePreview) imagePreview.classList.add('d-none');
        if (previewPlaceholder) previewPlaceholder.classList.remove('d-none');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        Swal.fire('Ukuran File Terlalu Besar', 'Ukuran foto maksimal adalah 5MB.', 'warning');
        homeFotoInput.value = '';
        if (imagePreview) imagePreview.classList.add('d-none');
        if (previewPlaceholder) previewPlaceholder.classList.remove('d-none');
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (imagePreview) {
          imagePreview.src = loadEvent.target.result;
          imagePreview.classList.remove('d-none');
        }
        if (previewPlaceholder) previewPlaceholder.classList.add('d-none');
      };
      reader.readAsDataURL(file);

      if (document.getElementById('home-latitude').value && document.getElementById('home-longitude').value && document.getElementById('home-alamat').value.trim()) {
        await Swal.fire({
          title: 'Foto Siap',
          text: 'Laporan akan dikirim otomatis sekarang.',
          icon: 'success',
          timer: 900,
          showConfirmButton: false
        });
        if (formHome) formHome.requestSubmit();
      }
    });
  }

  if (formHome) {
    formHome.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!formHome.checkValidity()) {
        Swal.fire('Form Belum Lengkap', 'Harap pastikan foto dan lokasi sudah tersedia.', 'warning');
        return;
      }

      const judulInput = document.getElementById('home-judul_kejadian');
      const namaInput = document.getElementById('home-nama_pelapor');
      const hpInput = document.getElementById('home-nomor_hp');
      const deskripsiInput = document.getElementById('home-deskripsi');
      const jenisInput = document.getElementById('home-jenis_kejadian');
      const alamatInput = document.getElementById('home-alamat');
      const alamatValue = alamatInput.value.trim() || `Koordinat ${document.getElementById('home-latitude').value}, ${document.getElementById('home-longitude').value}`;

      alamatInput.value = alamatValue;
      if (judulInput && !judulInput.value.trim()) judulInput.value = generateQuickTitle(jenisInput.value, alamatValue);
      if (deskripsiInput && !deskripsiInput.value.trim()) deskripsiInput.value = generateQuickDescription(jenisInput.value, alamatValue);
      if (namaInput) namaInput.value = namaInput.value.trim() || 'Pelapor Anonim';
      if (hpInput) hpInput.value = hpInput.value.trim() || '-';

      const formData = new FormData(formHome);
      try {
        if (btnOpenCameraHome) btnOpenCameraHome.disabled = true;
        if (btnCapturePhotoHome) btnCapturePhotoHome.disabled = true;

        const response = await fetch(`${API_BASE_URL}/laporan`, { method: 'POST', body: formData });
        const result = await response.json();

        if (response.ok && result.success) {
          Swal.fire({
            title: '🎉 Laporan Berhasil Dikirim & Selesai!',
            html: `
              <div class="text-start">
                <div class="alert alert-success d-flex align-items-center gap-2 mb-3 py-2">
                  <i class="bi bi-check-circle-fill fs-4 flex-shrink-0"></i>
                  <div>
                    <strong class="d-block text-success">STATUS: SELESAI</strong>
                    <small>Laporan Anda telah berhasil dikonfirmasi dan ditandai <b>Selesai</b> secara otomatis.</small>
                  </div>
                </div>

                <div class="p-3 bg-light rounded border mb-3"><strong class="text-dark d-block mb-1"><i class="bi bi-chat-left-quote-fill text-danger me-1"></i> Note:</strong>
                  
                  <p class="small text-dark fw-semibold mb-0" style="line-height: 1.5;">"${result.autoResponse || 'Terima kasih atas laporan Anda. Laporan telah berhasil diterima oleh Sistem Damkar dan dikonfirmasi dengan status Selesai.'}"</p>
                </div>

                <div class="p-2 bg-white rounded border small">
                  <strong>Judul Kejadian:</strong> ${result.data.judul_kejadian}<br>
                  <strong>Pelapor:</strong> ${result.data.nama_pelapor || 'Masyarakat'}<br>
                  <strong>Waktu Kirim:</strong> ${formatDate(result.data.created_at)}
                </div>
              </div>
            `,
            icon: 'success',
            confirmButtonColor: '#16a34a',
            confirmButtonText: 'Tutup & Selesai'
          });

          formHome.reset();
          if (imagePreview) imagePreview.classList.add('d-none');
          if (previewPlaceholder) previewPlaceholder.classList.remove('d-none');
          if (geoStatus) geoStatus.classList.add('d-none');
        } else {
          Swal.fire({
            title: 'Gagal Kirim Laporan',
            text: result.message || 'Terjadi kesalahan saat mengirim laporan.',
            icon: 'error',
            confirmButtonColor: '#dc2626'
          });
        }
      } catch (error) {
        console.error('Error submitting home form:', error);
        Swal.fire('Terjadi Kesalahan', 'Gagal terhubung ke server backend.', 'error');
      } finally {
        if (btnOpenCameraHome) btnOpenCameraHome.disabled = false;
        if (btnCapturePhotoHome) btnCapturePhotoHome.disabled = false;
      }
    });
  }
}

function generateQuickTitle(jenis, alamat) {
  if (jenis) {
    return `${jenis} di ${alamat || 'lokasi terdeteksi'}`.slice(0, 255);
  }
  return `Laporan Kebakaran Cepat di ${alamat || 'lokasi terdeteksi'}`.slice(0, 255);
}

function generateQuickDescription(jenis, alamat) {
  if (jenis) {
    return `Laporan cepat: ${jenis} di ${alamat || 'lokasi terdeteksi'}, foto dikirim otomatis.`;
  }
  return `Laporan cepat: kejadian kebakaran di ${alamat || 'lokasi terdeteksi'}, foto dikirim otomatis.`;
}

async function getRouteToLocation(start, end) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('Route service unavailable');

    const data = await response.json();
    if (data.routes && data.routes[0]) {
      return {
        geometry: data.routes[0].geometry,
        distanceKm: data.routes[0].distance / 1000,
        durationMin: Math.max(5, Math.round(data.routes[0].duration / 60))
      };
    }
  } catch (error) {
    console.warn('Routing unavailable, using straight-line estimate:', error);
  }

  const distanceKm = getDistanceKm(start.lat, start.lng, end.lat, end.lng);
  return {
    geometry: null,
    distanceKm,
    durationMin: estimateTravelTime(distanceKm)
  };
}

// Get Auth Token from Local Storage
function getAuthToken() {
  return localStorage.getItem('adminToken');
}

// Check if Admin Token exists and is valid
function isLoggedIn() {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const payloadBase64 = token.split('.')[1];
    if (payloadBase64) {
      const decodedJson = JSON.parse(atob(payloadBase64));
      if (decodedJson.exp && decodedJson.exp * 1000 < Date.now()) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        return false;
      }
    }
  } catch (e) {
    console.error('Invalid JWT token format:', e);
    return false;
  }
  return true;
}

// Route Guard: Require Admin Auth for Protected Pages
function requireAuth() {
  if (!isLoggedIn()) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function logoutAdmin() {
  Swal.fire({
    title: 'Konfirmasi Logout',
    text: 'Apakah Anda yakin ingin keluar dari sistem admin?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Logout',
    cancelButtonText: 'Batal'
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = 'login.html';
    }
  });
}

async function initDamkarMap() {
  const mapElement = document.getElementById('map-diy');
  if (!mapElement || typeof L === 'undefined') return;

  const provinceBoundary = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Batas Provinsi DIY' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [110.12, -7.66],
            [110.18, -7.60],
            [110.30, -7.58],
            [110.38, -7.60],
            [110.45, -7.68],
            [110.52, -7.76],
            [110.58, -7.84],
            [110.61, -7.95],
            [110.60, -8.08],
            [110.53, -8.18],
            [110.44, -8.24],
            [110.33, -8.25],
            [110.21, -8.21],
            [110.12, -8.12],
            [110.04, -8.00],
            [110.00, -7.88],
            [110.02, -7.78],
            [110.08, -7.70],
            [110.12, -7.66]
          ]]
        }
      }
    ]
  };

  const countyBoundaries = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Sleman' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [110.18, -7.60],
            [110.28, -7.58],
            [110.36, -7.62],
            [110.41, -7.68],
            [110.41, -7.78],
            [110.34, -7.82],
            [110.26, -7.80],
            [110.20, -7.74],
            [110.18, -7.60]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Yogyakarta' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [110.30, -7.74],
            [110.36, -7.74],
            [110.39, -7.78],
            [110.38, -7.82],
            [110.33, -7.84],
            [110.29, -7.80],
            [110.30, -7.74]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Bantul' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [110.24, -7.80],
            [110.31, -7.84],
            [110.35, -7.90],
            [110.33, -7.98],
            [110.25, -8.03],
            [110.19, -7.98],
            [110.18, -7.88],
            [110.24, -7.80]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Kulon Progo' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [110.00, -7.66],
            [110.08, -7.62],
            [110.15, -7.60],
            [110.18, -7.66],
            [110.16, -7.72],
            [110.08, -7.74],
            [110.01, -7.72],
            [110.00, -7.66]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Gunungkidul' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [110.38, -7.84],
            [110.48, -7.90],
            [110.57, -8.00],
            [110.60, -8.14],
            [110.54, -8.24],
            [110.43, -8.24],
            [110.38, -8.16],
            [110.38, -7.84]
          ]]
        }
      }
    ]
  };

  const districtBoundaries = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Kecamatan Depok' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [110.29, -7.72],
            [110.34, -7.72],
            [110.35, -7.76],
            [110.33, -7.80],
            [110.28, -7.78],
            [110.29, -7.72]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Kecamatan Kotagede' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [110.32, -7.80],
            [110.37, -7.80],
            [110.38, -7.83],
            [110.36, -7.86],
            [110.32, -7.85],
            [110.32, -7.80]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Kecamatan Gamping' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [110.27, -7.76],
            [110.31, -7.76],
            [110.32, -7.80],
            [110.30, -7.82],
            [110.26, -7.80],
            [110.27, -7.76]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Kecamatan Bantul' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [110.23, -7.86],
            [110.28, -7.86],
            [110.29, -7.90],
            [110.26, -7.93],
            [110.22, -7.90],
            [110.23, -7.86]
          ]]
        }
      }
    ]
  };

  const riskZones = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Zona Risiko Tinggi - Pusat Kota' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [110.34, -7.78],
            [110.36, -7.78],
            [110.37, -7.80],
            [110.36, -7.82],
            [110.34, -7.81],
            [110.34, -7.78]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Zona Risiko Menengah - Perbatasan Barat' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [110.08, -7.68],
            [110.12, -7.68],
            [110.13, -7.71],
            [110.10, -7.74],
            [110.08, -7.72],
            [110.08, -7.68]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Zona Risiko Menengah - Selatan' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [110.44, -8.01],
            [110.48, -8.01],
            [110.49, -8.06],
            [110.46, -8.08],
            [110.44, -8.05],
            [110.44, -8.01]
          ]]
        }
      }
    ]
  };

  const damkarPosts = [
    { name: 'Pos Damkar Pusat Yogyakarta', lat: -7.797, lng: 110.368, detail: 'Unit respons utama dengan kapasitas pemadaman cepat.', radiusKm: 8, travelTimeMin: 12 },
    { name: 'Pos Damkar Sleman', lat: -7.722, lng: 110.318, detail: 'Menangani wilayah utara dan kawasan industri.', radiusKm: 10, travelTimeMin: 18 },
    { name: 'Pos Damkar Bantul', lat: -7.883, lng: 110.328, detail: 'Menjaga wilayah selatan dan jalur strategis.', radiusKm: 10, travelTimeMin: 18 },
    { name: 'Pos Damkar Kulon Progo', lat: -7.742, lng: 110.148, detail: 'Menjaga kawasan barat dan jalur pantai.', radiusKm: 9, travelTimeMin: 16 },
    { name: 'Pos Damkar Gunungkidul', lat: -8.011, lng: 110.612, detail: 'Respons cepat untuk wilayah tenggara yang luas.', radiusKm: 12, travelTimeMin: 22 },
    { name: 'Pos Damkar Kota', lat: -7.784, lng: 110.407, detail: 'Titik cadangan untuk operasi skala besar.', radiusKm: 8, travelTimeMin: 14 },
    { name: 'Pos Damkar Prambanan', lat: -7.752, lng: 110.491, detail: 'Menjaga jalur utama dan kawasan wisata.', radiusKm: 9, travelTimeMin: 16 },
    { name: 'Pos Damkar Imogiri', lat: -7.918, lng: 110.392, detail: 'Melayani wilayah timur dan kawasan padat.', radiusKm: 10, travelTimeMin: 18 },
    { name: 'Pos Damkar Wates', lat: -7.894, lng: 110.154, detail: 'Mengcover wilayah barat dan akses pantai.', radiusKm: 9, travelTimeMin: 16 }
  ];

  const riverPaths = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Sungai Code' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [110.24, -7.72],
            [110.28, -7.76],
            [110.32, -7.80],
            [110.35, -7.84]
          ]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Sungai Winongo' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [110.39, -7.80],
            [110.42, -7.86],
            [110.46, -8.00]
          ]
        }
      }
    ]
  };

  const roadPaths = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Jalan Nasional Utama' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [110.20, -7.64],
            [110.28, -7.72],
            [110.35, -7.78],
            [110.40, -7.83]
          ]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Jalan Pantai Selatan' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [110.16, -7.90],
            [110.24, -7.92],
            [110.33, -7.98],
            [110.42, -8.02]
          ]
        }
      }
    ]
  };

  const philosophyAxis = [
    [110.3665, -7.7820],
    [110.3650, -7.7920],
    [110.3660, -7.8005]
  ];

  const map = L.map('map-diy', { zoomControl: true, scrollWheelZoom: false }).setView([-7.80, 110.37], 9.5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'leaflet-control-legend');
    div.innerHTML = `
      <div style="background:white; padding:10px 12px; border-radius:12px; box-shadow:0 8px 20px rgba(15,23,42,0.15); border:1px solid #e2e8f0; font-size:12px; color:#334155; min-width:220px;">
        <div style="font-weight:800; margin-bottom:6px; color:#dc2626;">Legenda Peta</div>
        <div style="display:flex; align-items:center; gap:8px; margin:4px 0;"><span style="width:14px; height:14px; border-radius:4px; background:#b45309; display:inline-block;"></span> Batas Provinsi DIY</div>
        <div style="display:flex; align-items:center; gap:8px; margin:4px 0;"><span style="width:14px; height:14px; border-radius:4px; background:#0f766e; display:inline-block;"></span> Kabupaten</div>
        <div style="display:flex; align-items:center; gap:8px; margin:4px 0;"><span style="width:14px; height:14px; border-radius:4px; background:#2563eb; display:inline-block;"></span> Kecamatan</div>
        <div style="display:flex; align-items:center; gap:8px; margin:4px 0;"><span style="width:14px; height:14px; border-radius:4px; background:#0284c7; display:inline-block;"></span> Sungai</div>
        <div style="display:flex; align-items:center; gap:8px; margin:4px 0;"><span style="width:14px; height:14px; border-radius:4px; background:#d97706; display:inline-block;"></span> Jalan</div>
        <div style="display:flex; align-items:center; gap:8px; margin:4px 0;"><span style="width:16px; height:3px; border-radius:999px; background:#7c3aed; display:inline-block;"></span> Sumbu Filosofi DIY</div>
        <div style="display:flex; align-items:center; gap:8px; margin:4px 0;"><span style="width:14px; height:14px; border-radius:4px; background:#dc2626; display:inline-block;"></span> Zona risiko</div>
        <div style="display:flex; align-items:center; gap:8px; margin:4px 0;"><span style="width:14px; height:14px; border-radius:999px; background:rgba(245, 158, 11, 0.25); border:1px solid #f59e0b; display:inline-block;"></span> Radius Pos Damkar</div>
        <div style="display:flex; align-items:center; gap:8px; margin:4px 0;"><span style="width:18px; height:3px; border-radius:999px; background:#ef4444; display:inline-block;"></span> Jalur Menuju Lokasi</div>
        <div style="display:flex; align-items:center; gap:8px; margin:4px 0;"><i class="bi bi-fire" style="color:#dc2626;"></i> Pos Damkar</div>
        <div style="display:flex; align-items:center; gap:8px; margin:4px 0;"><span style="width:14px; height:14px; border-radius:4px; background:rgba(239, 68, 68, 0.3); border:1px dashed #dc2626; display:inline-block;"></span> Wilayah Belum Terjangkau</div>
        <div style="display:flex; align-items:center; gap:8px; margin:4px 0;"><i class="bi bi-exclamation-triangle-fill" style="color:#b45309;"></i> Laporan</div>
      </div>`;
    return div;
  };
  legend.addTo(map);

  const provinceLayer = L.geoJSON(provinceBoundary, {
    style: () => ({ color: '#b45309', weight: 3.2, fillOpacity: 0.12, fillColor: '#fde68a' }),
    onEachFeature: (feature, layer) => {
      layer.bindPopup(`<strong>${feature.properties.name}</strong><br>Fokus wilayah Daerah Istimewa Yogyakarta.`);
    }
  }).addTo(map);

  const createBoundaryLayer = (features, options) => {
    const layerGroup = L.layerGroup();

    L.geoJSON({ type: 'FeatureCollection', features }, {
      style: () => ({
        color: options.color,
        weight: options.weight,
        fillOpacity: options.fillOpacity,
        fillColor: options.fillColor,
        dashArray: options.dashArray
      }),
      onEachFeature: (feature, layer) => {
        layer.bindPopup(`<strong>${options.title}</strong><br>${feature.properties.name}`);
      }
    }).addTo(layerGroup);

    features.forEach((feature) => {
      const latlng = getCentroid(feature.geometry.coordinates[0]);
      L.marker(latlng, {
        icon: L.divIcon({
          html: `<div style="background:${options.labelBg};border:1px solid ${options.labelBorder};border-radius:999px;padding:${options.labelPadding};font-size:${options.labelFontSize};font-weight:${options.labelWeight};color:${options.labelColor};white-space:nowrap;box-shadow:0 3px 8px rgba(0,0,0,0.15)">${feature.properties.name}</div>`,
          className: 'district-label',
          iconSize: [110, 24]
        })
      }).addTo(layerGroup);
    });

    return layerGroup;
  };

  const countyLayer = createBoundaryLayer(countyBoundaries.features, {
    title: 'Kabupaten',
    color: '#0f766e',
    weight: 2.6,
    fillOpacity: 0.08,
    fillColor: '#ccfbf1',
    dashArray: '6 4',
    labelBg: '#ffffff',
    labelBorder: '#0f766e',
    labelPadding: '3px 8px',
    labelFontSize: '10px',
    labelWeight: '800',
    labelColor: '#0f766e'
  }).addTo(map);

  const districtLayer = createBoundaryLayer(districtBoundaries.features, {
    title: 'Kecamatan',
    color: '#2563eb',
    weight: 1.8,
    fillOpacity: 0.05,
    fillColor: '#dbeafe',
    dashArray: '3 4',
    labelBg: '#eff6ff',
    labelBorder: '#2563eb',
    labelPadding: '2px 7px',
    labelFontSize: '9px',
    labelWeight: '700',
    labelColor: '#2563eb'
  }).addTo(map);

  const getCentroid = (coordinates) => {
    const flattened = coordinates.flat();
    const lng = flattened.reduce((sum, point) => sum + point[0], 0) / flattened.length;
    const lat = flattened.reduce((sum, point) => sum + point[1], 0) / flattened.length;
    return [lat, lng];
  };

  provinceBoundary.features.forEach((feature) => {
    const latlng = getCentroid(feature.geometry.coordinates[0]);
    L.marker(latlng, {
      icon: L.divIcon({
        html: `<div style="background:#fff7ed;border:1px solid #b45309;border-radius:999px;padding:3px 8px;font-size:10px;font-weight:800;color:#92400e;white-space:nowrap;box-shadow:0 3px 8px rgba(0,0,0,0.15)">${feature.properties.name}</div>`,
        className: 'district-label',
        iconSize: [110, 24]
      })
    }).addTo(map);
  });

  const riskLayer = L.geoJSON(riskZones, {
    style: (feature) => {
      const zoneName = feature.properties.name || '';
      let fillColor = '#fee2e2';
      let color = '#dc2626';

      if (zoneName.includes('Tinggi')) {
        fillColor = '#fef2f2';
        color = '#b91c1c';
      } else if (zoneName.includes('Menengah')) {
        fillColor = '#fff7ed';
        color = '#ea580c';
      } else {
        fillColor = '#fef3c7';
        color = '#d97706';
      }

      return { color, weight: 2.4, fillOpacity: 0.45, fillColor };
    },
    onEachFeature: (feature, layer) => {
      const zoneName = feature.properties.name || '';
      const riskLevel = zoneName.includes('Tinggi') ? 'Tinggi' : 'Menengah';
      layer.bindPopup(`<div style="min-width:220px;"><strong>${zoneName}</strong><br><span style="color:#dc2626;font-weight:700;">Level Risiko: ${riskLevel}</span><br>Lokasi prioritas pemantauan dan penanganan cepat.</div>`);
    }
  });

  const sungaiLayer = L.geoJSON(riverPaths, {
    style: () => ({ color: '#0284c7', weight: 3, opacity: 0.85, dashArray: '8 4' }),
    onEachFeature: (feature, layer) => {
      layer.bindPopup(`<strong>${feature.properties.name}</strong><br>Aliran air yang perlu dipantau saat kebakaran.`);
    }
  }).addTo(map);

  const jalanLayer = L.geoJSON(roadPaths, {
    style: () => ({ color: '#d97706', weight: 2.6, opacity: 0.9 }),
    onEachFeature: (feature, layer) => {
      layer.bindPopup(`<strong>${feature.properties.name}</strong><br>Jalur akses utama untuk operasi pemadaman.`);
    }
  }).addTo(map);

  const philosophyAxisLayer = L.polyline(philosophyAxis, {
    color: '#7c3aed',
    weight: 3,
    opacity: 0.95,
    dashArray: '8 5'
  }).bindPopup(`<div style="min-width:240px;"><strong>Sumbu Filosofi DIY</strong><br>Garis historis yang menghubungkan simbol budaya Yogyakarta, melambangkan keseimbangan, kearifan, dan identitas keraton.<br><br><em>Sejarah singkat:</em> Konsep ini sangat dekat dengan tradisi Keraton Yogyakarta dan menjadi bagian dari identitas wilayah istimewa.</div>`);

  const posDamkarLayer = L.layerGroup().addTo(map);
  const responseRadiusLayer = L.layerGroup().addTo(map);
  const routeLayer = L.layerGroup().addTo(map);
  const uncoveredAreaLayer = L.geoJSON({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Wilayah Belum Terjangkau A' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [110.03, -7.58],
            [110.07, -7.60],
            [110.10, -7.64],
            [110.08, -7.69],
            [110.02, -7.68],
            [110.00, -7.64],
            [110.03, -7.58]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Wilayah Belum Terjangkau B' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [110.42, -8.06],
            [110.48, -8.10],
            [110.55, -8.16],
            [110.52, -8.23],
            [110.44, -8.22],
            [110.40, -8.16],
            [110.42, -8.06]
          ]]
        }
      }
    ]
  }, {
    style: () => ({
      color: '#dc2626',
      weight: 1.8,
      fillOpacity: 0.18,
      fillColor: '#fecaca',
      dashArray: '6 4'
    }),
    onEachFeature: (feature, layer) => {
      layer.bindPopup(`<div style="min-width:220px;"><strong>${feature.properties.name}</strong><br>Area yang diperkirakan belum tercapai dalam radius respons unit terdekat.</div>`);
    }
  }).addTo(map);

  damkarPosts.forEach((post) => {
    const radiusKm = post.radiusKm || 8;
    const travelTimeMin = post.travelTimeMin || 15;

    const circle = L.circle([post.lat, post.lng], {
      radius: radiusKm * 1000,
      color: '#f59e0b',
      weight: 1.5,
      fillColor: '#fde68a',
      fillOpacity: 0.12
    }).bindPopup(`<div style="min-width:220px;"><strong>${post.name}</strong><br>${post.detail}<br><br><strong>Radius respons:</strong> ${radiusKm} km<br><strong>Estimasi waktu tempuh:</strong> ~${travelTimeMin} menit</div>`);

    const label = L.marker([post.lat + 0.008, post.lng], {
      icon: L.divIcon({
        html: `<div style="background:#fff7ed;border:1px solid #f59e0b;border-radius:999px;padding:3px 8px;font-size:9px;font-weight:800;color:#92400e;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.15)">~${travelTimeMin} menit</div>`,
        className: 'district-label',
        iconSize: [90, 24]
      })
    });

    circle.addTo(responseRadiusLayer);
    label.addTo(responseRadiusLayer);

    const marker = L.marker([post.lat, post.lng], {
      icon: L.divIcon({
        html: '<div class="map-marker-icon"><i class="bi bi-fire"></i></div>',
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    });

    marker.bindPopup(`<div style="min-width:220px;"><strong>${post.name}</strong><br>${post.detail}<br><br><strong>Radius respons:</strong> ${radiusKm} km<br><strong>Estimasi waktu tempuh:</strong> ~${travelTimeMin} menit</div>`);
    marker.addTo(posDamkarLayer);
  });

  const laporanLayer = L.layerGroup().addTo(map);

  const renderReportMarkers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/laporan`);
      const result = await response.json();
      const reports = result.success ? (result.data || []) : [];

      laporanLayer.clearLayers();
      routeLayer.clearLayers();

      reports.forEach(async (report) => {
        const lat = parseFloat(report.latitude);
        const lng = parseFloat(report.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return;

        const markerIcon = L.divIcon({
          html: `<div class="map-marker-icon"><i class="bi bi-fire"></i></div>`,
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([lat, lng], { icon: markerIcon });
        const photoUrl = report.foto ? `${window.location.origin}/uploads/${report.foto}` : null;
        const escapeHtml = (value) => String(value ?? '-').replace(/[&<>'"]/g, (char) => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[char]));
        const popupContent = `
          <div style="min-width:240px;">
            <strong>${escapeHtml(report.judul_kejadian || 'Laporan Kebakaran')}</strong><br>
            <small>${escapeHtml(report.alamat)}</small><br>
            <span style="display:inline-block;margin:6px 0;padding:4px 8px;border-radius:999px;background:${report.status === 'Selesai' ? '#dcfce7' : report.status === 'Diproses' ? '#cffafe' : '#fef3c7'};color:${report.status === 'Selesai' ? '#166534' : report.status === 'Diproses' ? '#0f766e' : '#92400e'};font-weight:700;font-size:11px;">${escapeHtml(report.status || 'Menunggu')}</span>
            ${photoUrl ? `<div style="margin:8px 0;"><img src="${escapeHtml(photoUrl)}" alt="Foto kejadian" style="width:100%;max-height:140px;object-fit:cover;border-radius:8px;"></div>` : ''}
            <div style="font-size:12px;color:#475569;">Pelapor: ${escapeHtml(report.nama_pelapor)}<br>Jenis: ${escapeHtml(report.jenis_kejadian)}<br>Deskripsi: ${escapeHtml(report.deskripsi)}</div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.addTo(laporanLayer);

        if (report.status !== 'Selesai') {
          const nearestPost = damkarPosts.reduce((closest, post) => {
            const distance = getDistanceKm(lat, lng, post.lat, post.lng);
            if (!closest || distance < closest.distance) {
              return { post, distance };
            }
            return closest;
          }, null);

          if (nearestPost) {
            const route = await getRouteToLocation({ lat: nearestPost.post.lat, lng: nearestPost.post.lng }, { lat, lng });
            const routeStyle = { color: '#ef4444', weight: 4, opacity: 0.9, dashArray: '8 6' };
            const routePopup = `<div style="min-width:220px;"><strong>Jalur menuju lokasi</strong><br>Pos: ${nearestPost.post.name}<br>Jarak: ${route.distanceKm.toFixed(1)} km<br>Estimasi waktu: ~${route.durationMin} menit</div>`;

            if (route.geometry) {
              L.geoJSON(route.geometry, {
                style: () => routeStyle,
                onEachFeature: (feature, layer) => {
                  layer.bindPopup(routePopup);
                }
              }).addTo(routeLayer);
            } else {
              L.polyline([[nearestPost.post.lat, nearestPost.post.lng], [lat, lng]], routeStyle)
                .bindPopup(routePopup)
                .addTo(routeLayer);
            }
          }
        }
      });
    } catch (error) {
      console.error('Failed to load report markers:', error);
    }
  };

  await renderReportMarkers();

  const overlays = {
    Kabupaten: countyLayer,
    Kecamatan: districtLayer,
    Sungai: sungaiLayer,
    Jalan: jalanLayer,
    'Sumbu Filosofi': philosophyAxisLayer,
    'Radius Pos Damkar': responseRadiusLayer,
    'Jalur Menuju Lokasi': routeLayer,
    'Pos Damkar': posDamkarLayer,
    'Wilayah Belum Terjangkau': uncoveredAreaLayer,
    Risiko: riskLayer,
    Laporan: laporanLayer
  };

  const riskFilter = document.getElementById('risk-filter');
  const renderRiskFilter = () => {
    if (!riskFilter) return;
    const value = riskFilter.value;
    riskLayer.eachLayer((layer) => {
      const name = layer.feature?.properties?.name || '';
      const shouldShow = value === 'all' || (value === 'Tinggi' && name.includes('Tinggi')) || (value === 'Menengah' && name.includes('Menengah'));
      layer.setStyle({ opacity: shouldShow ? 1 : 0, fillOpacity: shouldShow ? 0.45 : 0 });
      layer.bindTooltip(shouldShow ? name : '', { sticky: true });
    });
  };

  if (riskFilter) {
    riskFilter.addEventListener('change', renderRiskFilter);
  }

  L.control.layers(null, overlays, { collapsed: false }).addTo(map);
  L.control.scale({ position: 'bottomleft' }).addTo(map);
  map.fitBounds(provinceLayer.getBounds());
  renderRiskFilter();

  const areaStat = document.getElementById('stat-map-area');
  const riskStat = document.getElementById('stat-map-risk');
  const kabStat = document.getElementById('stat-map-kab');
  const postStat = document.getElementById('stat-map-post');

  if (areaStat) areaStat.textContent = '1';
  if (riskStat) riskStat.textContent = String(riskZones.features.length);
  if (kabStat) kabStat.textContent = String(countyBoundaries.features.length);
  if (postStat) postStat.textContent = String(damkarPosts.length);
}

// Update Navbar Authentication State
document.addEventListener('DOMContentLoaded', () => {
  const authNavContainer = document.getElementById('auth-nav-container');
  if (authNavContainer) {
    if (isLoggedIn()) {
      const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
      authNavContainer.innerHTML = `
        <li class="nav-item">
          <a class="nav-link nav-link-custom" href="admin.html">
            <i class="bi bi-speedometer2"></i> Dashboard Admin
          </a>
        </li>
        <li class="nav-item ms-2">
          <button onclick="logoutAdmin()" class="btn btn-outline-light btn-sm px-3">
            <i class="bi bi-box-arrow-right"></i> Logout (${adminUser.username || 'Admin'})
          </button>
        </li>
      `;
    } else {
      authNavContainer.innerHTML = `
        <li class="nav-item">
          <a class="nav-link nav-link-custom" href="login.html">
            <i class="bi bi-shield-lock-fill"></i> Login Admin
          </a>
        </li>
      `;
    }
  }

  if (!window.skipDamkarMap) {
    initDamkarMap();
  }

  if (document.getElementById('form-laporan-home')) {
    initHomeCameraReport();
  }
});
 