/* ============================================================
   DETAIL LAPORAN & LEAFLET MAP JS
   ============================================================ */

let detailMap = null;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const reportId = urlParams.get('id');

  if (!reportId) {
    Swal.fire({
      title: 'ID Laporan Tidak Valid',
      text: 'Halaman detail membutuhkan parameter ID laporan.',
      icon: 'error'
    }).then(() => {
      window.location.href = 'index.html';
    });

    return;
  }

  await loadReportDetails(reportId);
});


/* ============================================================
   LOAD DETAIL LAPORAN
   ============================================================ */

async function loadReportDetails(id) {
  try {
    const reportId = String(id).trim();

    // Validasi ID
    if (!reportId || !/^\d+$/.test(reportId)) {
      throw new Error(`ID laporan tidak valid: ${id}`);
    }

    const url =
      `${API_BASE_URL}/laporan/${encodeURIComponent(reportId)}`;

    console.log('====================================');
    console.log('[DETAIL LAPORAN]');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('Request URL:', url);
    console.log('Report ID:', reportId);
    console.log('====================================');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    console.log('HTTP Status:', response.status);
    console.log('HTTP Status Text:', response.statusText);

    /*
     * Response dibaca sebagai text terlebih dahulu.
     * Tujuannya agar apabila server mengirim HTML/error,
     * kita bisa melihat response aslinya di console.
     */
    const rawResponse = await response.text();

    console.log('Raw API Response:', rawResponse);

    let result;

    try {
      result = rawResponse
        ? JSON.parse(rawResponse)
        : null;
    } catch (parseError) {
      console.error(
        'Response API bukan JSON:',
        parseError
      );

      throw new Error(
        `Server mengembalikan response bukan JSON. HTTP ${response.status}.`
      );
    }

    // HTTP error
    if (!response.ok) {
      console.error('API Error:', result);

      throw new Error(
        result?.message ||
        result?.error ||
        `Server mengembalikan HTTP ${response.status}.`
      );
    }

    // Validasi format response
    if (
      !result ||
      result.success !== true ||
      !result.data
    ) {
      console.error(
        'Format data laporan tidak sesuai:',
        result
      );

      throw new Error(
        result?.message ||
        'Data laporan tidak ditemukan atau format response API tidak sesuai.'
      );
    }

    const data = result.data;

    console.log('Data laporan berhasil dimuat:', data);

    /* ========================================================
       POPULATE FIELDS
       ======================================================== */

    const detailId =
      document.getElementById('detail-id');

    if (detailId) {
      detailId.textContent =
        data.id ?? reportId;
    }


    const detailStatusBadge =
      document.getElementById('detail-status-badge');

    if (detailStatusBadge) {
      detailStatusBadge.innerHTML =
        getStatusBadge(
          data.status || 'Menunggu'
        );
    }


    const detailCreatedAt =
      document.getElementById('detail-created-at');

    if (detailCreatedAt) {
      detailCreatedAt.textContent =
        data.created_at
          ? formatDate(data.created_at)
          : '-';
    }


    const detailJudul =
      document.getElementById(
        'detail-judul-kejadian'
      );

    if (detailJudul) {
      detailJudul.textContent =
        data.judul_kejadian || '-';
    }


    const detailNamaPelapor =
      document.getElementById(
        'detail-nama-pelapor'
      );

    if (detailNamaPelapor) {
      detailNamaPelapor.textContent =
        data.nama_pelapor || '-';
    }


    const detailNomorHp =
      document.getElementById(
        'detail-nomor-hp'
      );

    if (detailNomorHp) {
      detailNomorHp.textContent =
        data.nomor_hp || '-';
    }


    /* ========================================================
       WHATSAPP DIRECT LINK
       ======================================================== */

    const btnWhatsapp =
      document.getElementById('btn-whatsapp');

    if (btnWhatsapp) {

      if (data.nomor_hp) {

        let cleanPhone =
          String(data.nomor_hp)
            .replace(/\D/g, '');

        // 08xxxx -> 628xxxx
        if (cleanPhone.startsWith('0')) {
          cleanPhone =
            '62' +
            cleanPhone.substring(1);
        }

        if (cleanPhone.length >= 10) {

          const namaPelapor =
            data.nama_pelapor || '';

          const judul =
            data.judul_kejadian || '';

          const message =
            `Halo ${namaPelapor}, kami dari Petugas Pemadam Kebakaran mengenai laporan: ${judul}`;

          btnWhatsapp.href =
            `https://wa.me/${cleanPhone}?text=` +
            encodeURIComponent(message);

          btnWhatsapp.classList.remove(
            'd-none'
          );

        } else {

          btnWhatsapp.classList.add(
            'd-none'
          );
        }

      } else {

        btnWhatsapp.classList.add(
          'd-none'
        );
      }
    }


    /* ========================================================
       DETAIL DESKRIPSI
       ======================================================== */

    const detailDeskripsi =
      document.getElementById(
        'detail-deskripsi'
      );

    if (detailDeskripsi) {
      detailDeskripsi.textContent =
        data.deskripsi || '-';
    }


    /* ========================================================
       ALAMAT
       ======================================================== */

    const detailAlamat =
      document.getElementById(
        'detail-alamat'
      );

    if (detailAlamat) {
      detailAlamat.textContent =
        data.alamat || '-';
    }


    /* ========================================================
       KOORDINAT
       ======================================================== */

    const detailLatitude =
      document.getElementById(
        'detail-latitude'
      );

    if (detailLatitude) {
      detailLatitude.textContent =
        data.latitude ?? '-';
    }


    const detailLongitude =
      document.getElementById(
        'detail-longitude'
      );

    if (detailLongitude) {
      detailLongitude.textContent =
        data.longitude ?? '-';
    }


    /* ========================================================
       RESPON ADMIN
       ======================================================== */

    const detailAdminResponse =
      document.getElementById(
        'detail-admin-response'
      );

    if (detailAdminResponse) {
      detailAdminResponse.textContent =
        data.respon_admin ||
        'Belum ada respon admin. Harap tunggu update dari tim.';
    }


    /* ========================================================
       GOOGLE MAPS DIRECT LINK
       ======================================================== */

    const btnGmaps =
      document.getElementById(
        'btn-gmaps-detail'
      );

    if (btnGmaps) {

      if (
        data.latitude !== null &&
        data.latitude !== undefined &&
        data.longitude !== null &&
        data.longitude !== undefined &&
        data.latitude !== '' &&
        data.longitude !== ''
      ) {

        btnGmaps.href =
          `https://www.google.com/maps?q=` +
          `${encodeURIComponent(data.latitude)},` +
          `${encodeURIComponent(data.longitude)}`;

      } else if (data.alamat) {

        btnGmaps.href =
          `https://www.google.com/maps/search/?api=1&query=` +
          encodeURIComponent(data.alamat);

      } else {

        btnGmaps.removeAttribute('href');
      }
    }


    /* ========================================================
       FOTO LAPORAN
       ======================================================== */

    const imgEl =
      document.getElementById(
        'detail-foto'
      );

    const placeholderEl =
      document.getElementById(
        'detail-foto-placeholder'
      );

    if (imgEl && placeholderEl) {

      if (data.foto) {

        /*
         * API_BASE_URL biasanya:
         * http://localhost:5000/api
         *
         * sehingga serverOrigin menjadi:
         * http://localhost:5000
         */

        const serverOrigin =
          API_BASE_URL.replace(
            /\/api\/?$/,
            ''
          );

        imgEl.src =
          `${serverOrigin}/uploads/` +
          encodeURIComponent(data.foto);

        imgEl.onerror = function () {

          console.warn(
            'Foto laporan tidak dapat dimuat:',
            imgEl.src
          );

          imgEl.classList.add(
            'd-none'
          );

          placeholderEl.classList.remove(
            'd-none'
          );
        };

        imgEl.classList.remove(
          'd-none'
        );

        placeholderEl.classList.add(
          'd-none'
        );

      } else {

        imgEl.classList.add(
          'd-none'
        );

        placeholderEl.classList.remove(
          'd-none'
        );
      }
    }


    /* ========================================================
       LEAFLET MAP
       ======================================================== */

    initLeafletMap(
      data.latitude,
      data.longitude,
      data.judul_kejadian ||
        'Laporan Kebakaran',
      data.alamat || '-'
    );


    /* ========================================================
       ADMIN QUICK STATUS CHANGER
       ======================================================== */

    if (
      typeof isLoggedIn === 'function' &&
      isLoggedIn()
    ) {
      renderAdminActionBar(data);
    }

  } catch (error) {

    console.error(
      '===================================='
    );

    console.error(
      'ERROR LOAD DETAIL LAPORAN'
    );

    console.error(error);

    console.error(
      '===================================='
    );

    Swal.fire({
      title: 'Gagal Memuat Laporan',
      text:
        error.message ||
        'Terjadi kesalahan saat mengambil data laporan.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
}


/* ============================================================
   LEAFLET.JS MAP RENDERING
   ============================================================ */

function initLeafletMap(
  latStr,
  lngStr,
  title,
  address
) {

  const mapContainer =
    document.getElementById(
      'map-container'
    );

  if (!mapContainer) {
    return;
  }


  const parsedLat =
    parseFloat(latStr);

  const parsedLng =
    parseFloat(lngStr);


  /*
   * Jangan menggunakan:
   *
   * parseFloat(latStr) || -6.2088
   *
   * karena nilai 0 dianggap false.
   */

  const lat =
    Number.isFinite(parsedLat)
      ? parsedLat
      : -6.2088;

  const lng =
    Number.isFinite(parsedLng)
      ? parsedLng
      : 106.8456;


  /* Hapus map lama jika ada */

  if (detailMap) {

    detailMap.remove();

    detailMap = null;
  }


  /* ========================================================
     CREATE MAP
     ======================================================== */

  detailMap =
    L.map('map-container')
      .setView(
        [lat, lng],
        15
      );


  /* ========================================================
     OPENSTREETMAP TILE
     ======================================================== */

  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,

      attribution:
        '&copy; ' +
        '<a href="https://www.openstreetmap.org/copyright" target="_blank">' +
        'OpenStreetMap' +
        '</a> contributors'
    }
  ).addTo(detailMap);


  /* ========================================================
     GOOGLE MAPS URL
     ======================================================== */

  const hasCoordinates =
    latStr !== null &&
    latStr !== undefined &&
    lngStr !== null &&
    lngStr !== undefined &&
    latStr !== '' &&
    lngStr !== '';


  const gmapsUrl =
    hasCoordinates

      ? `https://www.google.com/maps?q=` +
        `${encodeURIComponent(latStr)},` +
        `${encodeURIComponent(lngStr)}`

      : `https://www.google.com/maps/search/?api=1&query=` +
        encodeURIComponent(address || '');


  /* ========================================================
     MARKER
     ======================================================== */

  const marker =
    L.marker([
      lat,
      lng
    ]).addTo(detailMap);


  /* ========================================================
     POPUP
     ======================================================== */

  marker.bindPopup(`
    <div style="max-width: 220px;">

      <strong style="color: #dc2626;">
        🔥 ${escapeHtml(title)}
      </strong>

      <br>

      <small
        style="
          color: #64748b;
          display: block;
          margin-bottom: 8px;
        "
      >
        ${escapeHtml(address)}
      </small>

      <a
        href="${gmapsUrl}"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-danger btn-sm text-white w-100 py-1"
        style="
          font-size: 0.78rem;
          font-weight: bold;
          text-decoration: none;
        "
      >
        <i class="bi bi-geo-alt-fill me-1"></i>
        Buka di Google Maps
      </a>

    </div>
  `).openPopup();
}


/* ============================================================
   RENDER ADMIN CONTROL HEADER
   ============================================================ */

function renderAdminActionBar(data) {

  const adminBar =
    document.getElementById(
      'admin-action-bar'
    );

  if (!adminBar) {
    return;
  }


  const safeId =
    Number(data.id);


  adminBar.innerHTML = `

    <div class="d-flex align-items-center gap-2">

      <span class="small fw-bold text-muted">
        Ubah Status:
      </span>

      <select
        id="quick-status-select"
        class="form-select form-select-sm fw-bold border-danger"
        style="width: 140px;"
      >

        <option
          value="Menunggu"
          ${data.status === 'Menunggu' ? 'selected' : ''}
        >
          Menunggu
        </option>

        <option
          value="Diproses"
          ${data.status === 'Diproses' ? 'selected' : ''}
        >
          Diproses
        </option>

        <option
          value="Selesai"
          ${data.status === 'Selesai' ? 'selected' : ''}
        >
          Selesai
        </option>

      </select>

      <button
        type="button"
        onclick="updateQuickStatus(${safeId})"
        class="btn btn-danger btn-sm fw-bold px-3"
      >
        Simpan
      </button>

    </div>
  `;


  adminBar.classList.remove(
    'd-none'
  );
}


/* ============================================================
   UPDATE QUICK STATUS
   ============================================================ */

async function updateQuickStatus(id) {

  const select =
    document.getElementById(
      'quick-status-select'
    );

  if (!select) {
    return;
  }


  const newStatus =
    select.value;

  const token =
    getAuthToken();


  try {

    const response =
      await fetch(
        `${API_BASE_URL}/laporan/${encodeURIComponent(id)}`,
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',

            'Authorization':
              `Bearer ${token}`,

            'Accept':
              'application/json'
          },

          body: JSON.stringify({
            status: newStatus
          })
        }
      );


    const rawResponse =
      await response.text();


    let result;

    try {

      result =
        rawResponse
          ? JSON.parse(rawResponse)
          : null;

    } catch (parseError) {

      console.error(
        'Response update status bukan JSON:',
        rawResponse
      );

      throw new Error(
        `Server mengembalikan response bukan JSON. HTTP ${response.status}.`
      );
    }


    if (
      response.ok &&
      result?.success
    ) {

      Swal.fire({

        title:
          'Status Berhasil Diperbarui',

        text:
          `Status laporan diubah menjadi "${newStatus}".`,

        icon:
          'success',

        timer:
          1500,

        showConfirmButton:
          false
      });


      /*
       * Jika detail dibuka dari dashboard
       * pada window baru, refresh dashboard.
       */

      if (
        window.opener &&
        !window.opener.closed
      ) {

        window.opener.location.reload();
      }


      /*
       * Muat ulang detail laporan
       * tanpa reload seluruh halaman.
       */

      await loadReportDetails(id);

    } else {

      console.error(
        'Gagal update status:',
        result
      );

      Swal.fire(
        'Gagal',
        result?.message ||
          'Gagal mengubah status.',
        'error'
      );
    }

  } catch (err) {

    console.error(
      'Error updating status:',
      err
    );

    Swal.fire(
      'Error',
      err.message ||
        'Terjadi kesalahan server.',
      'error'
    );
  }
}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHtml(str) {

  if (
    str === null ||
    str === undefined
  ) {
    return '';
  }


  return String(str)
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}