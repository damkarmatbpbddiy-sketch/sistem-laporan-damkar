# Backend Sistem Laporan Damkar

Backend ini adalah API untuk aplikasi sistem laporan damkar.

## Fitur
- Registrasi pengguna
- Login dengan JWT
- Membuat laporan dengan upload gambar opsional
- Melihat daftar laporan
- Dokumentasi API melalui endpoint `/docs`

## Persyaratan
- Node.js 18+ atau lebih baru
- MySQL

## Instalasi
1. Masuk ke folder backend:
   ```bash
   cd backend
   ```
2. Install dependensi:
   ```bash
   npm install
   ```
3. Buat file `.env` jika belum ada:
   ```text
   PORT=3000
   JWT_SECRET=secret_example
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=damkar
   DB_USER=root
   DB_PASSWORD=
   ```

## Menjalankan
1. Migrasi database:
   ```bash
   npm run migrate
   ```
2. Seed data awal:
   ```bash
   npm run seed
   ```
3. Jalankan server:
   ```bash
   npm start
   ```

## Skrip
- `npm start` — jalankan server
- `npm run migrate` — jalankan migrasi SQL
- `npm run seed` — masukkan data awal
- `npm test` — placeholder untuk pengujian

## Endpoint API

### Auth
- `POST /auth/register`
  - Body: `name`, `email`, `password`
  - Response: data user
- `POST /auth/login`
  - Body: `email`, `password`
  - Response: `token` dan data user

### Reports
- `GET /reports`
  - Header: `Authorization: Bearer <token>`
  - Response: daftar laporan
- `POST /reports`
  - Header: `Authorization: Bearer <token>`
  - Body multipart/form-data: `title`, `description`, `category_id` (opsional), `image` (opsional)
  - Response: laporan baru

### Dokumentasi
- `GET /docs`
  - Response: dokumen API dalam format JSON

### Status
- `GET /health`
  - Response: `{ status: "ok" }`

## Struktur Folder
- `index.js` — entry point aplikasi
- `migrate.js` — skrip migrasi database
- `seed.js` — skrip seed data awal
- `src/config` — konfigurasi dan database
- `src/routes` — rute API
- `src/controllers` — kontroler request
- `src/services` — logika bisnis
- `src/models` — definisi tabel / struktur data
- `src/utils` — helper seperti JWT dan response
- `uploads/` — penyimpanan file upload

## Catatan
Pastikan MySQL berjalan dan konfigurasi DB di `.env` sudah sesuai.
