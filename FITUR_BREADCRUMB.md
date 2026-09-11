# 📍 Fitur Breadcrumb Interaktif & Peta Zona

Dokumentasi lengkap fitur breadcrumb dengan peta interaktif yang telah ditambahkan ke Dashboard Admin.

## 🎯 Gambaran Umum

Fitur breadcrumb interaktif memungkinkan admin untuk:
- **Navigasi visual** melalui berbagai zona, kabupaten, dan kategori infrastruktur
- **Melihat detail lengkap** setiap zone dengan statistik dan informasi spasial
- **Mengidentifikasi warna zona** sesuai dengan peta GIS yang disediakan
- **Tracking riwayat navigasi** melalui breadcrumb trail yang responsif

---

## 📂 File-file yang Ditambahkan

### 1. **js/breadcrumb-map.js** (NEW)
   - **Fungsi**: Module utama untuk breadcrumb dan zone management
   - **Isi**:
     - Data master zona (kabupaten, risiko kebakaran, WMK, infrastruktur)
     - Fungsi rendering breadcrumb navigation
     - Fungsi menampilkan grid zone cards
     - Fungsi navigasi dan tracking riwayat
     - Fungsi detail panel untuk setiap zone

### 2. **css/style.css** (MODIFIED)
   - **Tambahan CSS**: Bagian baru di akhir file untuk styling breadcrumb
   - Styling untuk:
     - Breadcrumb navigation & trail
     - Zone grid layout responsive
     - Category menu cards
     - Zone detail panel
     - Info cards & statistik

### 3. **admin.html** (MODIFIED)
   - **Tambahan HTML**: Card baru untuk breadcrumb & zone panel
   - **Lokasi**: Setelah card statistik, sebelum grafik chart
   - **Script**: Penambahan `<script src="js/breadcrumb-map.js"></script>`

---

## 🗂️ Struktur Data Zone

### **Kategori 1: Kabupaten & Kota**
```javascript
{
  id: 'sleman',
  nama: 'Kabupaten Sleman',
  warna: '#7FB3D5',  // Biru muda (sesuai peta GIS)
  rgb: 'rgb(127, 179, 213)',
  deskripsi: 'Kabupaten dengan luas terbesar di DIY',
  statistik: { 
    laporan: 342,   // Total laporan
    risiko: 'Tinggi', // Tingkat risiko
    pos: 15         // Jumlah pos damkar
  },
  koordinat: { lat: -7.6500, lng: 110.4000 }, // Pusat zona
  batas: [[...]]  // Polygon GeoJSON
}
```

**Zone yang tersedia:**
- 🔵 Kabupaten Sleman (#7FB3D5)
- 🟠 Kabupaten Bantul (#E8A87C)
- 🟣 Kabupaten Gunungkidul (#B4A7D6)
- 🩵 Kabupaten Kulon Progo (#D5C6E0)
- 🟡 Kota Yogyakarta (#F4D4AE)

### **Kategori 2: Risiko Kebakaran**
Level risiko dengan warna gradasi:
- ⚪ Risiko 0 - Tidak Ada (#FFFFCC)
- 🟢 Risiko 1-4 - Rendah (#C6FFB3)
- 🟠 Risiko 5-9 - Sedang (#FF9966)
- 🔴 Risiko 10-14 - Tinggi (#FF6666)
- 🔴 Risiko 15-24 - Sangat Tinggi (#CC3300)
- ⚫ Risiko 24+ - Ekstrim (#660000)

### **Kategori 3: WMK (Wilayah Manajemen Kebakaran)**
- 🔴 WMK Utama - Prioritas Tinggi (#FF0000)
- 🟠 WMK Pendukung - Prioritas Sedang (#FF9900)
- 🟡 WMK Pengamatan - Prioritas Rendah (#FFFF00)

### **Kategori 4: Infrastruktur & Pos**
- 🚿 Pos Tangki Air (#0099FF)
- 🚒 Pos Damkar Operasional (#FF0000)
- 🏛️ Lokasi Cagar Budaya (#9966CC)

---

## 🎨 Warna Zona (Sesuai Peta)

Setiap zone memiliki warna unik yang sesuai dengan peta GIS yang diterima:

| Kabupaten | Kode Warna | Hex | RGB |
|-----------|-----------|-----|-----|
| Sleman | Biru Muda | #7FB3D5 | rgb(127, 179, 213) |
| Bantul | Oranye | #E8A87C | rgb(232, 168, 124) |
| Gunungkidul | Ungu | #B4A7D6 | rgb(180, 167, 214) |
| Kulon Progo | Ungu Muda | #D5C6E0 | rgb(213, 198, 224) |
| Yogyakarta | Krem | #F4D4AE | rgb(244, 212, 174) |

---

## 🔧 Fungsi Utama

### **renderBreadcrumb()**
Menampilkan navigasi breadcrumb trail dengan item-item yang telah diklik.
```javascript
renderBreadcrumb();
```

### **renderZoneCategoryMenu()**
Menampilkan menu kategori (Kabupaten, Risiko, WMK, Infrastruktur).
```javascript
renderZoneCategoryMenu();
```

### **renderZoneButtons(category)**
Menampilkan grid zone cards untuk kategori tertentu.
```javascript
renderZoneButtons('kabupaten');  // Tampilkan semua kabupaten
renderZoneButtons('risiko_kebakaran');  // Tampilkan risiko kebakaran
```

### **selectZone(category, zoneId)**
Memilih zone dan menampilkan detail lengkapnya.
```javascript
selectZone('kabupaten', 'sleman');
```

### **renderZoneDetail(zone)**
Menampilkan detail panel untuk zone yang dipilih.
```javascript
renderZoneDetail(zone);
```

### **navigateBreadcrumb(index, event)**
Navigasi ke zone sebelumnya dalam breadcrumb trail.
```javascript
navigateBreadcrumb(0);  // Kembali ke item pertama
```

### **resetBreadcrumb(event)**
Mengembalikan ke menu kategori awal.
```javascript
resetBreadcrumb();
```

---

## 📱 Responsive Design

Fitur breadcrumb fully responsive untuk semua ukuran layar:

### Desktop (≥1200px)
- Breadcrumb: 1 baris penuh
- Zone grid: 3-4 kolom
- Detail panel: Sidebar kanan (30% lebar)

### Tablet (768px - 1199px)
- Breadcrumb: Dapat wrap ke 2 baris
- Zone grid: 2-3 kolom
- Detail panel: Full width atau sidebar

### Mobile (<768px)
- Breadcrumb: Wrap, font size lebih kecil
- Zone grid: 1 kolom
- Detail panel: Stack vertikal

---

## 🎯 Cara Menggunakan

### **Dari Dashboard Admin:**

1. **Akses Dashboard**
   ```
   URL: http://localhost:5000/admin.html
   Login: admin / admin123
   ```

2. **Temukan Section "Peta Interaktif Zona & Kabupaten"**
   - Setelah card statistik, sebelum grafik chart

3. **Pilih Kategori**
   - Klik card kategori (Kabupaten, Risiko, WMK, Infrastruktur)
   - Grid zone cards akan ditampilkan

4. **Buka Detail Zone**
   - Klik tombol "Lihat Detail" pada zone card
   - Atau klik langsung pada zone card
   - Detail panel akan muncul di kanan

5. **Navigasi Breadcrumb**
   - Klik item breadcrumb untuk kembali
   - Klik "Peta Utama" untuk reset ke kategori menu

6. **Lihat Peta**
   - Klik "Tampilkan di Peta" untuk menampilkan zone di live map
   - (Fitur ini dapat dikembangkan lebih lanjut)

---

## 🚀 Pengembangan Selanjutnya

Beberapa fitur yang dapat ditambahkan:

### 1. **Integrasi dengan Leaflet Map**
```javascript
function showZoneOnMap(zoneId) {
  // Highlight zone pada live map
  // Zoom ke batas zone
  // Tampilkan info popup
}
```

### 2. **Filter Laporan per Zone**
```javascript
function filterReportsByZone(zoneId) {
  // Filter tabel laporan berdasarkan zone
  // Update statistik chart
}
```

### 3. **Export Data Zone**
```javascript
function exportZoneData(zoneId) {
  // Export sebagai GeoJSON
  // Export sebagai CSV
}
```

### 4. **Pencarian Zone**
```html
<input type="search" placeholder="Cari zone..." id="zone-search">
```

### 5. **Statistik Real-time**
```javascript
// Update statistik laporan per zone dari API
async function updateZoneStats() {
  const stats = await fetch('/api/laporan/stats-by-zone');
  // Update zone.statistik
}
```

### 6. **Komparasi Zone**
```javascript
// Tampilkan perbandingan statistik antar zone
function compareZones(zoneIds) { }
```

---

## 🐛 Troubleshooting

### **Breadcrumb tidak muncul**
- Pastikan file `breadcrumb-map.js` ada di folder `js/`
- Cek console browser untuk error
- Pastikan DOM element `#breadcrumb-container` ada

### **Zone cards tidak muncul**
- Pastikan DOM element `#zone-grid` ada
- Cek apakah CSS file dimuat dengan benar
- Lihat console untuk error JavaScript

### **Detail panel kosong**
- Pastikan DOM element `#zone-detail-panel` ada
- Cek data zone di `zoneData` object
- Verifikasi DOM selector di `renderZoneDetail()`

---

## 📊 Data Master Lengkap

Semua data master tersimpan di object `zoneData` di file `breadcrumb-map.js`:

```javascript
const zoneData = {
  kabupaten: [ /* 5 kabupaten */ ],
  risiko_kebakaran: [ /* 6 level risiko */ ],
  wmk: [ /* 3 prioritas WMK */ ],
  infrastruktur: [ /* 3 jenis infrastruktur */ ]
}
```

Total: **17 zone/kategori** dengan informasi lengkap

---

## 📝 Catatan Teknis

- **Framework**: Bootstrap 5.3 + Vanilla JavaScript
- **Styling**: CSS Grid, Flexbox
- **Icons**: Bootstrap Icons
- **Color System**: Hex codes sesuai peta GIS
- **State Management**: Menggunakan array `breadcrumbTrail` dan object `currentZoneView`
- **Event Handling**: Inline onclick handlers (dapat direfactor ke event listeners)

---

## 📞 Support

Untuk pertanyaan atau masalah teknis terkait fitur breadcrumb, hubungi tim development atau lihat log browser (F12 > Console).

---

**Versi**: 1.0  
**Tanggal**: 2026-08-11  
**Status**: Production Ready ✅
