# Dokumentasi API Sistem Laporan Damkar

## Base URL
- http://localhost:5000

## Endpoints

### 1. Root
GET /

Response:
```json
{
  "name": "Sistem Laporan Damkar API",
  "version": "1.0.0",
  "status": "ok"
}
```

### 2. Health Check
GET /health

Response:
```json
{
  "status": "ok"
}
```

### 3. Register
POST /auth/register

Request body:
```json
{
  "name": "Dandi",
  "email": "dandi@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "message": "Registrasi berhasil",
  "user": {
    "id": 1,
    "name": "Dandi",
    "email": "dandi@example.com"
  }
}
```

### 4. Login
POST /auth/login

Request body:
```json
{
  "email": "dandi@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "message": "Login berhasil",
  "token": "<jwt-token>",
  "user": {
    "id": 1,
    "name": "Dandi",
    "email": "dandi@example.com",
    "role": "user"
  }
}
```

### 5. Get Reports
GET /reports

Headers:
```http
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "reports": []
}
```

### 6. Create Report
POST /reports

Headers:
```http
Authorization: Bearer <token>
```

Form Data:
- title: string
- description: string
- category_id: number (optional)
- image: file (optional)

Response:
```json
{
  "success": true,
  "message": "Laporan berhasil dibuat",
  "report": {
    "id": 1,
    "title": "Kebakaran",
    "description": "Ada kebakaran di area pasar",
    "status": "pending"
  }
}
```

### 7. Update Report
PUT /reports/:id

Headers:
```http
Authorization: Bearer <token>
```

Request body:
```json
{
  "title": "Judul baru",
  "description": "Deskripsi baru",
  "status": "in_progress"
}
```

### 8. Delete Report
DELETE /reports/:id

Headers:
```http
Authorization: Bearer <token>
```

## Notes
- Admin dapat mengubah atau menghapus semua laporan.
- User biasa hanya dapat mengubah/menghapus laporan miliknya sendiri.
