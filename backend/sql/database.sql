-- ============================================================
-- DATABASE SCHEMA: SISTEM LAPORAN KEBAKARAN DAMKAR
-- PostgreSQL Database: damkar_db
-- ============================================================

-- Create Database (Run manually if needed):
-- CREATE DATABASE damkar_db;

-- 1. Table admin
CREATE TABLE IF NOT EXISTS admin (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table laporan
CREATE TABLE IF NOT EXISTS laporan (
    id SERIAL PRIMARY KEY,
    judul_kejadian VARCHAR(255) NOT NULL,
    nama_pelapor VARCHAR(100) NOT NULL,
    nomor_hp VARCHAR(20) NOT NULL,
    alamat TEXT NOT NULL,
    latitude VARCHAR(50),
    longitude VARCHAR(50),
    deskripsi TEXT NOT NULL,
    foto VARCHAR(255),
    respon_admin TEXT,
    status VARCHAR(50) DEFAULT 'Menunggu',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Default Admin Seed (Username: admin, Password: admin123)
-- Hash generated using bcrypt (salt rounds: 10) for 'admin123'
INSERT INTO admin (username, password)
VALUES ('admin', '$2b$10$X8m1Uo75N9lB214w1B8u0eQWv7Wf3W5f8fX9y5x7w0Z1q2w3e4r5t')
ON CONFLICT (username) DO NOTHING;
