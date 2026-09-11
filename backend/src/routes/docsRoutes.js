const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    name: "Sistem Laporan Damkar API",
    version: "1.0.0",
    status: "ok",
    baseUrl: "http://localhost:5000",
    endpoints: [
      {
        method: "GET",
        path: "/",
        description: "Informasi dasar API",
      },
      {
        method: "GET",
        path: "/health",
        description: "Cek status service",
      },
      {
        method: "POST",
        path: "/auth/register",
        description: "Register user baru",
        body: {
          name: "string",
          email: "string",
          password: "string",
        },
      },
      {
        method: "POST",
        path: "/auth/login",
        description: "Login dan dapatkan token JWT",
        body: {
          email: "string",
          password: "string",
        },
      },
      {
        method: "GET",
        path: "/reports",
        description: "Ambil daftar laporan",
        headers: {
          Authorization: "Bearer <token>",
        },
      },
      {
        method: "POST",
        path: "/reports",
        description: "Buat laporan baru",
        headers: {
          Authorization: "Bearer <token>",
        },
        body: {
          title: "string",
          description: "string",
          category_id: "number (optional)",
          image: "file (optional)",
        },
      },
    ],
  });
});

module.exports = router;
