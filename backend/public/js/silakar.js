// silakar.js — Handler SILAKAR DIY
const API_BASE = '/api/silakar';
let currentSilakarData = [];

// ===================== UTILITY =====================
function getToken() {
  if (typeof getAuthToken === 'function') {
    const t = getAuthToken();
    if (t) return t;
  }
  return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken') || localStorage.getItem('damkar_token') || sessionStorage.getItem('damkar_token') || '';
}

function authHeader() {
  return { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatRupiah(val) {
  if (!val || val == 0) return '-';
  return 'Rp ' + Number(val).toLocaleString('id-ID');
}

function escapeHtml(value) {
  return String(value ?? '-').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function statusBadge(status) {
  const safeStatus = escapeHtml(status || '-');
  if (!status) return '<span class="bs batal">-</span>';
  if (status === 'Selesai') return '<span class="bs selesai"><i class="bi bi-check-circle me-1"></i>' + safeStatus + '</span>';
  if (status === 'Dalam Penanganan') return '<span class="bs proses"><i class="bi bi-hourglass-split me-1"></i>' + safeStatus + '</span>';
  return '<span class="bs batal">' + safeStatus + '</span>';
}

function updateSilakarStats(s) {
  if (!s) return;
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? 0;
  };
  setTxt('stat-total', s.total);
  setTxt('stat-proses', s.dalam_penanganan);
  setTxt('stat-selesai', s.selesai);
  setTxt('stat-meninggal', s.total_meninggal);
  setTxt('stat-luka', s.total_luka);
  setTxt('stat-terdampak', s.total_terdampak);

  const sbTotal = document.getElementById('sb-total');
  if (sbTotal) sbTotal.innerHTML = '<i class="bi bi-archive me-1"></i>Total: <strong style="color:white">' + (s.total || 0) + '</strong>';
  const sbUpdate = document.getElementById('sb-update');
  if (sbUpdate) sbUpdate.textContent = 'Diperbarui: ' + new Date().toLocaleTimeString('id-ID');
}

function renderSilakarRows(data) {
  const tbody = document.getElementById('silakar-tbody');
  const countInfo = document.getElementById('silakar-count-info');
  if (countInfo) countInfo.textContent = 'Menampilkan ' + data.length + ' data kejadian';

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="13"><div class="empty-st"><i class="bi bi-inbox"></i>Tidak ada data ditemukan.</div></td></tr>';
    return;
  }

  tbody.innerHTML = data.map(row => `
    <tr>
      <td><span class="idpill">#${row.id}</span></td>
      <td style="white-space:nowrap">${formatDate(row.tanggal_kejadian)}</td>
      <td>${escapeHtml(row.kabupaten_kota)}</td>
      <td>${escapeHtml(row.kapanewon)}</td>
      <td>${escapeHtml(row.jenis_kejadian)}</td>
      <td>${escapeHtml(row.objek_terbakar)}</td>
      <td>${escapeHtml(row.dugaan_penyebab)}</td>
      <td style="text-align:center"><span style="font-weight:800;color:#ef4444">${row.korban_meninggal || 0}</span></td>
      <td style="text-align:center"><span style="font-weight:800;color:#f59e0b">${row.korban_luka || 0}</span></td>
      <td style="text-align:center">${row.jumlah_terdampak || 0}</td>
      <td>${statusBadge(row.status_penanganan)}</td>
      <td style="white-space:nowrap">${formatRupiah(row.perkiraan_kerugian)}</td>
      <td style="white-space:nowrap">
        <button class="abtn v" onclick="showDetail(${row.id})" title="Detail"><i class="bi bi-eye"></i></button>
        <button class="abtn e" onclick="editSilakar(${row.id})" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="abtn d" onclick="deleteSilakar(${row.id})" title="Hapus"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

// ===================== FETCH DATA =====================
async function fetchSilakar(silent = false) {
  const search = document.getElementById('filter-search').value;
  const startDate = document.getElementById('filter-start').value;
  const endDate = document.getElementById('filter-end').value;
  const kabupaten = document.getElementById('filter-kabupaten').value;
  const status = document.getElementById('filter-status').value;
  const jenisEl = document.getElementById('filter-jenis');
  const jenis = jenisEl ? jenisEl.value.trim() : '';

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (kabupaten) params.append('kabupaten', kabupaten);
  if (status) params.append('status', status);
  if (jenis) params.append('jenis', jenis);

  const tbody = document.getElementById('silakar-tbody');
  if (!silent && !currentSilakarData.length) {
    tbody.innerHTML = '<tr><td colspan="14" class="text-center py-4"><div class="spinner-border spinner-border-sm text-danger me-2"></div>Memuat data...</td></tr>';
  }

  try {
    const res = await fetch(`${API_BASE}?${params.toString()}`);
    const json = await res.json();

    if (!json.success) throw new Error(json.message);

    // Update stats
    updateSilakarStats(json.stats);

    const data = json.data;
    currentSilakarData = Array.isArray(data) ? data : [];
    renderSilakarRows(currentSilakarData);

    // Simpan ke local storage jika tanpa filter agar load berikutnya seketika (0 ms)
    if (!search && !startDate && !endDate && !kabupaten && !status && !jenis) {
      try {
        localStorage.setItem('silakar_cache_data', JSON.stringify(currentSilakarData));
        localStorage.setItem('silakar_cache_stats', JSON.stringify(json.stats));
      } catch (e) {}
    }

  } catch (err) {
    console.error(err);
    if (!currentSilakarData.length) {
      tbody.innerHTML = `<tr><td colspan="14" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>${err.message || 'Gagal memuat data.'}</td></tr>`;
    }
  }
}

function downloadSilakarData() {
  if (currentSilakarData.length === 0) {
    alert('Tidak ada data kejadian yang dapat diunduh dari hasil pencarian saat ini.');
    return;
  }

  const columns = [
    ['ID', (row) => row.id],
    ['Tanggal Kejadian', (row) => formatDate(row.tanggal_kejadian)],
    ['Kabupaten/Kota', (row) => row.kabupaten_kota],
    ['Kapanewon', (row) => row.kapanewon],
    ['Jenis Kejadian', (row) => row.jenis_kejadian],
    ['Objek Terbakar', (row) => row.objek_terbakar],
    ['Dugaan Penyebab', (row) => row.dugaan_penyebab],
    ['Meninggal', (row) => row.korban_meninggal || 0],
    ['Luka', (row) => row.korban_luka || 0],
    ['Terdampak', (row) => row.jumlah_terdampak || 0],
    ['Status Penanganan', (row) => row.status_penanganan],
    ['Perkiraan Kerugian', (row) => row.perkiraan_kerugian]
  ];

  const csvEscape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  const csv = [
    columns.map(([header]) => csvEscape(header)).join(','),
    ...currentSilakarData.map((row) => columns.map(([, getValue]) => csvEscape(getValue(row))).join(','))
  ].join('\r\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `data-kejadian-silatkar-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ===================== FORM HANDLING =====================
function showForm(title) {
  document.getElementById('form-title').textContent = title || 'Input Data Kejadian Baru';
  var panel = document.getElementById('form-panel');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideForm() {
  document.getElementById('form-panel').style.display = 'none';
  resetForm();
}

function resetForm() {
  document.getElementById('form-silakar').reset();
  document.getElementById('edit-id').value = '';
  document.getElementById('submit-btn-text').textContent = 'Simpan Data Kejadian';
  document.getElementById('form-title').textContent = 'Input Data Kejadian Baru';
  document.getElementById('existing-doc-info').style.display = 'none';
  document.getElementById('existing-doc-info').textContent = '';
  // Reset angka ke 0
  ['f-meninggal','f-luka','f-terdampak','f-armada','f-kerugian'].forEach(id => {
    document.getElementById(id).value = 0;
  });
}

function fillForm(data) {
  const fmt = (val) => val || '';
  document.getElementById('f-tanggal').value = data.tanggal_kejadian ? data.tanggal_kejadian.substring(0,10) : '';
  document.getElementById('f-waktu-laporan').value = fmt(data.waktu_laporan);
  document.getElementById('f-waktu-berangkat').value = fmt(data.waktu_berangkat);
  document.getElementById('f-waktu-tiba').value = fmt(data.waktu_tiba);
  document.getElementById('f-kabupaten').value = fmt(data.kabupaten_kota);
  document.getElementById('f-kapanewon').value = fmt(data.kapanewon);
  document.getElementById('f-kalurahan').value = fmt(data.kalurahan);
  document.getElementById('f-alamat').value = fmt(data.alamat_lokasi);
  document.getElementById('f-koordinat').value = fmt(data.koordinat);
  document.getElementById('f-sumber').value = fmt(data.sumber_pengaduan);
  document.getElementById('f-pelapor').value = fmt(data.nama_pelapor);
  document.getElementById('f-kontak').value = fmt(data.nomor_kontak);
  document.getElementById('f-jenis').value = fmt(data.jenis_kejadian);
  document.getElementById('f-objek').value = fmt(data.objek_terbakar);
  document.getElementById('f-penyebab').value = fmt(data.dugaan_penyebab);
  document.getElementById('f-meninggal').value = data.korban_meninggal || 0;
  document.getElementById('f-luka').value = data.korban_luka || 0;
  document.getElementById('f-terdampak').value = data.jumlah_terdampak || 0;
  document.getElementById('f-unit').value = fmt(data.unit_damkarmat);
  document.getElementById('f-armada').value = data.jumlah_armada || 0;
  document.getElementById('f-air').value = fmt(data.sumber_air);
  document.getElementById('f-status').value = data.status_penanganan || 'Dalam Penanganan';
  document.getElementById('f-selesai').value = fmt(data.waktu_selesai);
  document.getElementById('f-kerugian').value = data.perkiraan_kerugian || 0;
  document.getElementById('f-keterangan').value = fmt(data.keterangan);

  if (data.dokumentasi) {
    const docEl = document.getElementById('existing-doc-info');
    docEl.innerHTML = `<i class="bi bi-paperclip me-1"></i>Dokumen saat ini: <a href="/uploads/${data.dokumentasi}" target="_blank">${data.dokumentasi}</a> (kosongkan input file untuk tetap gunakan dokumen ini)`;
    docEl.style.display = 'block';
  }
}

// ===================== SUBMIT =====================
document.getElementById('form-silakar').addEventListener('submit', async function(e) {
  e.preventDefault();
  const editId = document.getElementById('edit-id').value;
  const isEdit = !!editId;

  const formData = new FormData();
  formData.append('tanggal_kejadian', document.getElementById('f-tanggal').value);
  formData.append('waktu_laporan', document.getElementById('f-waktu-laporan').value);
  formData.append('waktu_berangkat', document.getElementById('f-waktu-berangkat').value);
  formData.append('waktu_tiba', document.getElementById('f-waktu-tiba').value);
  formData.append('kabupaten_kota', document.getElementById('f-kabupaten').value);
  formData.append('kapanewon', document.getElementById('f-kapanewon').value);
  formData.append('kalurahan', document.getElementById('f-kalurahan').value);
  formData.append('alamat_lokasi', document.getElementById('f-alamat').value);
  formData.append('koordinat', document.getElementById('f-koordinat').value);
  formData.append('sumber_pengaduan', document.getElementById('f-sumber').value);
  formData.append('nama_pelapor', document.getElementById('f-pelapor').value);
  formData.append('nomor_kontak', document.getElementById('f-kontak').value);
  formData.append('jenis_kejadian', document.getElementById('f-jenis').value);
  formData.append('objek_terbakar', document.getElementById('f-objek').value);
  formData.append('dugaan_penyebab', document.getElementById('f-penyebab').value);
  formData.append('korban_meninggal', document.getElementById('f-meninggal').value);
  formData.append('korban_luka', document.getElementById('f-luka').value);
  formData.append('jumlah_terdampak', document.getElementById('f-terdampak').value);
  formData.append('unit_damkarmat', document.getElementById('f-unit').value);
  formData.append('jumlah_armada', document.getElementById('f-armada').value);
  formData.append('sumber_air', document.getElementById('f-air').value);
  formData.append('status_penanganan', document.getElementById('f-status').value);
  formData.append('waktu_selesai', document.getElementById('f-selesai').value);
  formData.append('perkiraan_kerugian', document.getElementById('f-kerugian').value);
  formData.append('keterangan', document.getElementById('f-keterangan').value);

  const fileInput = document.getElementById('f-dokumentasi');
  if (fileInput.files.length > 0) {
    formData.append('dokumentasi', fileInput.files[0]);
  }

  const submitBtn = document.querySelector('#form-silakar [type="submit"]');
  submitBtn.disabled = true;
  document.getElementById('submit-btn-text').textContent = 'Menyimpan...';

  try {
    const url = isEdit ? `${API_BASE}/${editId}` : API_BASE;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData
    });
    if (res.status === 401 || res.status === 403) {
      Swal.fire({
        icon: 'warning',
        title: 'Sesi Berakhir',
        text: 'Sesi login admin Anda telah berakhir atau belum login. Silakan login kembali untuk menyimpan perubahan.',
        confirmButtonText: 'Login Sekarang',
        confirmButtonColor: '#ef4444'
      }).then(() => {
        window.location.href = 'login.html';
      });
      return;
    }

    const json = await res.json();

    if (!json.success) throw new Error(json.message);

    Swal.fire({
      icon: 'success',
      title: isEdit ? 'Data Diperbarui!' : 'Data Tersimpan!',
      text: json.message,
      timer: 2000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });

    hideForm();
    fetchSilakar();

  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Gagal', text: err.message || 'Terjadi kesalahan.' });
  } finally {
    submitBtn.disabled = false;
    document.getElementById('submit-btn-text').textContent = isEdit ? 'Perbarui Data' : 'Simpan Data Kejadian';
  }
});

// ===================== EDIT =====================
async function editSilakar(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    document.getElementById('edit-id').value = id;
    fillForm(json.data);
    document.getElementById('submit-btn-text').textContent = 'Perbarui Data';
    showForm(`Edit Data Kejadian #${id}`);

  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
  }
}

// ===================== DELETE =====================
async function deleteSilakar(id) {
  const confirm = await Swal.fire({
    title: 'Hapus Data Kejadian?',
    text: `Data kejadian #${id} akan dihapus permanen. Tindakan ini tidak bisa dibatalkan!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#c0392b',
    cancelButtonColor: '#6b7280',
    confirmButtonText: '<i class="bi bi-trash me-1"></i> Ya, Hapus!',
    cancelButtonText: 'Batal'
  });

  if (!confirm.isConfirmed) return;

  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });

    if (res.status === 401 || res.status === 403) {
      Swal.fire({
        icon: 'warning',
        title: 'Sesi Berakhir',
        text: 'Sesi login admin Anda telah berakhir. Silakan login kembali.',
        confirmButtonText: 'Login Sekarang',
        confirmButtonColor: '#ef4444'
      }).then(() => {
        window.location.href = 'login.html';
      });
      return;
    }

    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    Swal.fire({ icon: 'success', title: 'Terhapus!', text: json.message, timer: 1800, showConfirmButton: false, toast: true, position: 'top-end' });
    fetchSilakar();

  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Gagal Hapus', text: err.message });
  }
}

// ===================== DETAIL MODAL =====================
async function showDetail(id) {
  var modal = document.getElementById('detail-modal');
  var body = document.getElementById('detail-modal-body');
  body.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--pm)"><div style="width:24px;height:24px;border:3px solid rgba(255,255,255,.2);border-top-color:#ef4444;border-radius:50%;display:inline-block;animation:spin .7s linear infinite"></div></div>';
  modal.classList.add('show');

  try {
    const res = await fetch(`${API_BASE}/${id}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    const d = json.data;
    const safeDetail = Object.fromEntries(
      Object.entries(d).map(([key, value]) => [key, escapeHtml(value)])
    );

    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;padding:1rem;background:rgba(239,68,68,.08);border-radius:10px;margin-bottom:1.25rem">
        <div style="font-size:1.5rem;color:#ef4444"><i class="bi bi-fire"></i></div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:1rem;color:white">${safeDetail.jenis_kejadian || 'Kejadian'} — ${safeDetail.objek_terbakar || '-'}</div>
          <div style="font-size:.78rem;color:var(--pm)">${formatDate(d.tanggal_kejadian)} | ${safeDetail.kabupaten_kota || ''} ${safeDetail.kapanewon ? '· '+safeDetail.kapanewon : ''}</div>
        </div>
        <div>${statusBadge(d.status_penanganan)}</div>
      </div>

      <div class="row g-3">
        <div class="col-md-6">
          <div class="dsh"><i class="bi bi-clock me-1"></i>Waktu Kejadian</div>
          <table class="dtbl"><tbody>
            <tr><td>Tanggal</td><td>${formatDate(d.tanggal_kejadian)}</td></tr>
            <tr><td>Waktu Laporan</td><td>${safeDetail.waktu_laporan || '-'}</td></tr>
            <tr><td>Waktu Berangkat</td><td>${safeDetail.waktu_berangkat || '-'}</td></tr>
            <tr><td>Waktu Tiba</td><td>${safeDetail.waktu_tiba || '-'}</td></tr>
            <tr><td>Waktu Selesai</td><td>${safeDetail.waktu_selesai || '-'}</td></tr>
          </tbody></table>
        </div>
        <div class="col-md-6">
          <div class="dsh"><i class="bi bi-geo-alt me-1"></i>Lokasi</div>
          <table class="dtbl"><tbody>
            <tr><td>Kabupaten/Kota</td><td>${safeDetail.kabupaten_kota || '-'}</td></tr>
            <tr><td>Kapanewon</td><td>${safeDetail.kapanewon || '-'}</td></tr>
            <tr><td>Kalurahan</td><td>${safeDetail.kalurahan || '-'}</td></tr>
            <tr><td>Alamat</td><td>${safeDetail.alamat_lokasi || '-'}</td></tr>
            <tr><td>Koordinat</td><td>${safeDetail.koordinat || '-'}</td></tr>
          </tbody></table>
        </div>
        <div class="col-md-6">
          <div class="dsh"><i class="bi bi-person me-1"></i>Pelapor</div>
          <table class="dtbl"><tbody>
            <tr><td>Sumber</td><td>${safeDetail.sumber_pengaduan || '-'}</td></tr>
            <tr><td>Nama</td><td>${safeDetail.nama_pelapor || '-'}</td></tr>
            <tr><td>Kontak</td><td>${safeDetail.nomor_kontak || '-'}</td></tr>
          </tbody></table>
        </div>
        <div class="col-md-6">
          <div class="dsh"><i class="bi bi-fire me-1"></i>Detail Kejadian</div>
          <table class="dtbl"><tbody>
            <tr><td>Jenis</td><td>${safeDetail.jenis_kejadian || '-'}</td></tr>
            <tr><td>Objek Terbakar</td><td>${safeDetail.objek_terbakar || '-'}</td></tr>
            <tr><td>Dugaan Penyebab</td><td>${safeDetail.dugaan_penyebab || '-'}</td></tr>
          </tbody></table>
        </div>
        <div class="col-md-6">
          <div class="dsh"><i class="bi bi-people me-1"></i>Dampak & Korban</div>
          <table class="dtbl"><tbody>
            <tr><td>Korban Meninggal</td><td style="font-weight:800;color:#ef4444">${d.korban_meninggal || 0} Jiwa</td></tr>
            <tr><td>Korban Luka</td><td style="font-weight:800;color:#f59e0b">${d.korban_luka || 0} Jiwa</td></tr>
            <tr><td>Jumlah Terdampak</td><td>${d.jumlah_terdampak || 0} Jiwa</td></tr>
            <tr><td>Perkiraan Kerugian</td><td style="font-weight:700">${formatRupiah(d.perkiraan_kerugian)}</td></tr>
          </tbody></table>
        </div>
        <div class="col-md-6">
          <div class="dsh"><i class="bi bi-truck-front me-1"></i>Penanganan</div>
          <table class="dtbl"><tbody>
            <tr><td>Unit Damkarmat</td><td>${safeDetail.unit_damkarmat || '-'}</td></tr>
            <tr><td>Jumlah Armada</td><td>${safeDetail.jumlah_armada || 0} Unit</td></tr>
            <tr><td>Sumber Air</td><td>${safeDetail.sumber_air || '-'}</td></tr>
            <tr><td>Status</td><td>${statusBadge(d.status_penanganan)}</td></tr>
          </tbody></table>
        </div>
        ${d.keterangan ? `<div class="col-12"><div style="padding:.75rem 1rem;background:rgba(255,255,255,.04);border:1px solid var(--pbr);border-radius:8px"><div style="font-size:.72rem;color:var(--pm);font-weight:600;text-transform:uppercase;margin-bottom:4px">Keterangan</div><div style="font-size:.83rem">${safeDetail.keterangan}</div></div></div>` : ''}
        ${d.dokumentasi ? `<div class="col-12"><a href="/uploads/${encodeURIComponent(d.dokumentasi)}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.08);border:1px solid var(--pbr);color:var(--pm);padding:6px 14px;border-radius:6px;font-size:.8rem;text-decoration:none;transition:color .2s"><i class="bi bi-file-earmark-image"></i>Lihat Dokumentasi</a></div>` : ''}
      </div>
    `;
  } catch (err) {
    body.innerHTML = '<div style="text-align:center;padding:2rem;color:#ef4444">' + err.message + '</div>';
  }
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  // 1. Tampilkan data dari localStorage cache seketika (0 ms, tidak perlu tunggu loading)
  try {
    const cachedData = localStorage.getItem('silakar_cache_data');
    const cachedStats = localStorage.getItem('silakar_cache_stats');
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        currentSilakarData = parsedData;
        if (cachedStats) updateSilakarStats(JSON.parse(cachedStats));
        renderSilakarRows(parsedData);
      }
    }
  } catch (e) {}

  // 2. Fetch data terbaru dari database di background (silent jika cache sudah ada)
  fetchSilakar(currentSilakarData.length > 0);

  let searchTimer;
  const runSearchAfterTyping = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => fetchSilakar(false), 300);
  };

  const filterSearch = document.getElementById('filter-search');
  if (filterSearch) {
    filterSearch.addEventListener('input', runSearchAfterTyping);
    filterSearch.addEventListener('keypress', e => {
      if (e.key === 'Enter') fetchSilakar(false);
    });
  }

  const filterJenis = document.getElementById('filter-jenis');
  if (filterJenis) {
    filterJenis.addEventListener('change', () => fetchSilakar(false));
  }

  const filterStart = document.getElementById('filter-start');
  if (filterStart) filterStart.addEventListener('change', () => fetchSilakar(false));

  const filterEnd = document.getElementById('filter-end');
  if (filterEnd) filterEnd.addEventListener('change', () => fetchSilakar(false));

  const filterKab = document.getElementById('filter-kabupaten');
  if (filterKab) filterKab.addEventListener('change', () => fetchSilakar(false));

  const filterStatus = document.getElementById('filter-status');
  if (filterStatus) filterStatus.addEventListener('change', () => fetchSilakar(false));

  // Close modal on backdrop click
  const detailModal = document.getElementById('detail-modal');
  if (detailModal) {
    detailModal.addEventListener('click', function(e) {
      if (e.target === this) this.classList.remove('show');
    });
  }
});
