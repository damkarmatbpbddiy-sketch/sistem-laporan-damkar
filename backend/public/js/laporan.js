/* ============================================================
   LAPORAN KAMERA CEPAT JS
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const latInput = document.getElementById('latitude');
  const lngInput = document.getElementById('longitude');
  const alamatInput = document.getElementById('alamat');
  const geoStatus = document.getElementById('geo-status');
  const geoStatusText = document.getElementById('geo-status-text');

  const fotoInput = document.getElementById('foto');
  const imagePreview = document.getElementById('image-preview');
  const previewPlaceholder = document.getElementById('preview-placeholder');
  const btnOpenCamera = document.getElementById('btn-open-camera');
  const btnCapturePhoto = document.getElementById('btn-capture-photo');
  const btnCloseCamera = document.getElementById('btn-close-camera');
  const cameraPane = document.getElementById('camera-pane');
  const cameraVideo = document.getElementById('camera-video');
  const cameraCanvas = document.getElementById('camera-canvas');

  const formLaporan = document.getElementById('form-laporan');
  const btnSubmit = document.getElementById('btn-submit-laporan');

  let cameraStream = null;

  function showGeoStatus(text, type = 'info') {
    if (!geoStatus || !geoStatusText) return;
    geoStatus.className = `alert alert-${type} py-2 px-3 small mb-3`;
    geoStatusText.textContent = text;
    geoStatus.classList.remove('d-none');
  }

  async function getCurrentLocation() {
    if (!navigator.geolocation) {
      showGeoStatus('Geolocation tidak tersedia.', 'danger');
      Swal.fire('Fitur Tidak Didukung', 'Browser Anda tidak mendukung fitur Geolocation.', 'error');
      return false;
    }

    showGeoStatus('Mendeteksi lokasi GPS Anda...', 'info');

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          latInput.value = lat;
          lngInput.value = lng;
          showGeoStatus(`Koordinat ditemukan: ${lat}, ${lng}. Mengambil alamat...`, 'info');

          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
              headers: { 'Accept-Language': 'id' }
            });

            if (response.ok) {
              const data = await response.json();
              if (data && data.display_name) {
                alamatInput.value = data.display_name;
                showGeoStatus('Lokasi & alamat berhasil ditemukan!', 'success');
                resolve(true);
                return;
              }
            }

            alamatInput.value = `Koordinat ${lat}, ${lng}`;
            showGeoStatus('Koordinat berhasil ditemukan. Alamat disimpan sebagai koordinat.', 'warning');
            resolve(true);
          } catch (err) {
            console.error('Nominatim error:', err);
            alamatInput.value = `Koordinat ${lat}, ${lng}`;
            showGeoStatus('Koordinat ditemukan. Alamat disimpan sebagai koordinat.', 'warning');
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
          showGeoStatus(errorMsg, 'danger');
          Swal.fire('Gagal Ambil Lokasi', errorMsg, 'warning');
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  async function ensureLocationReady() {
    if (latInput.value && lngInput.value) {
      return true;
    }
    return await getCurrentLocation();
  }

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    if (cameraVideo) cameraVideo.srcObject = null;
    if (cameraPane) cameraPane.classList.add('d-none');
  };

  const startCameraCapture = async () => {
    await ensureLocationReady();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showGeoStatus('Kamera tidak tersedia.', 'danger');
      Swal.fire('Kamera Tidak Tersedia', 'Browser Anda tidak mendukung akses kamera.', 'error');
      return;
    }

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (cameraVideo) cameraVideo.srcObject = cameraStream;
      if (cameraPane) cameraPane.classList.remove('d-none');
      showGeoStatus('Kamera aktif. Tangkap foto ketika siap.', 'success');
    } catch (err) {
      console.error('Kamera error:', err);
      showGeoStatus('Gagal mengakses kamera.', 'danger');
      Swal.fire('Gagal Mengakses Kamera', 'Izinkan akses kamera untuk melanjutkan.', 'error');
    }
  };

  const captureCameraPhoto = () => {
    if (!cameraStream || !cameraCanvas || !cameraVideo) return;
    cameraCanvas.width = cameraVideo.videoWidth;
    cameraCanvas.height = cameraVideo.videoHeight;
    const context = cameraCanvas.getContext('2d');
    context.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);

    cameraCanvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `laporan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fotoInput.files = dataTransfer.files;

      const reader = new FileReader();
      reader.onload = (event) => {
        if (imagePreview) {
          imagePreview.src = event.target.result;
          imagePreview.classList.remove('d-none');
        }
        if (previewPlaceholder) previewPlaceholder.classList.add('d-none');
      };
      reader.readAsDataURL(file);

      if (latInput.value && lngInput.value && alamatInput.value.trim()) {
        stopCameraStream();
        Swal.fire({
          title: 'Foto siap',
          text: 'Laporan akan dikirim otomatis sekarang.',
          icon: 'success',
          timer: 900,
          showConfirmButton: false,
          willClose: () => {
            if (formLaporan) formLaporan.requestSubmit();
          }
        });
      } else {
        Swal.fire({
          title: 'Foto Diambil',
          text: 'GPS belum siap. Pastikan lokasi aktif lalu ambil ulang.',
          icon: 'info',
          confirmButtonColor: '#dc2626'
        });
      }
    }, 'image/jpeg', 0.85);
  };

  if (btnOpenCamera) btnOpenCamera.addEventListener('click', startCameraCapture);
  if (btnCapturePhoto) btnCapturePhoto.addEventListener('click', captureCameraPhoto);
  if (btnCloseCamera) btnCloseCamera.addEventListener('click', stopCameraStream);

  if (fotoInput) {
    fotoInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) {
        if (imagePreview) imagePreview.classList.add('d-none');
        if (previewPlaceholder) previewPlaceholder.classList.remove('d-none');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        Swal.fire('Ukuran File Terlalu Besar', 'Ukuran foto maksimal adalah 5MB.', 'warning');
        fotoInput.value = '';
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

      if (latInput.value && lngInput.value && alamatInput.value.trim()) {
        await Swal.fire({
          title: 'Foto Siap',
          text: 'Laporan akan dikirim otomatis sekarang.',
          icon: 'success',
          timer: 900,
          showConfirmButton: false
        });
        if (formLaporan) formLaporan.requestSubmit();
      }
    });
  }

  if (formLaporan) {
    formLaporan.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!formLaporan.checkValidity()) {
        formLaporan.classList.add('was-validated');
        Swal.fire('Form Belum Lengkap', 'Harap pastikan foto dan lokasi sudah tersedia.', 'warning');
        return;
      }

      const judulInput = document.getElementById('judul_kejadian');
      const namaInput = document.getElementById('nama_pelapor');
      const hpInput = document.getElementById('nomor_hp');
      const deskripsiInput = document.getElementById('deskripsi');
      const jenisInput = document.getElementById('jenis_kejadian');
      const alamatValue = alamatInput.value.trim() || `Koordinat ${latInput.value}, ${lngInput.value}`;

      alamatInput.value = alamatValue;
      if (judulInput && !judulInput.value.trim()) judulInput.value = generateQuickTitle(jenisInput.value, alamatValue);
      if (deskripsiInput && !deskripsiInput.value.trim()) deskripsiInput.value = generateQuickDescription(jenisInput.value, alamatValue);
      if (namaInput) namaInput.value = namaInput.value.trim() || 'Pelapor Anonim';
      if (hpInput) hpInput.value = hpInput.value.trim() || '-';

      const formData = new FormData(formLaporan);
      try {
        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span> Mengirimkan Laporan...`;
        }

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

                <div class="p-3 bg-light rounded border mb-3">
                  <strong class="text-dark d-block mb-1"><i class="bi bi-chat-left-quote-fill text-danger me-1"></i> Note:</strong>
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

          formLaporan.reset();
          formLaporan.classList.remove('was-validated');
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
        console.error('Error submitting form:', error);
        Swal.fire('Terjadi Kesalahan', 'Gagal terhubung ke server backend.', 'error');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `<i class="bi bi-send-fill me-1"></i> KIRIM LAPORAN KEBAKARAN`;
        }
      }
    });
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

  startCameraCapture();
});