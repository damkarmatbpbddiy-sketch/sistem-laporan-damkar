-- ============================================================
-- DATABASE SQL UNTUK IMPOR KE PHPMYADMIN (MySQL / MariaDB)
-- Nama Database: damkar_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS `damkar_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `damkar_db`;

-- --------------------------------------------------------
-- 1. Struktur Tabel `admin`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `admin` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- 2. Struktur Tabel `laporan`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `laporan` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `judul_kejadian` VARCHAR(255) NOT NULL,
  `nama_pelapor` VARCHAR(100) NOT NULL,
  `nomor_hp` VARCHAR(20) NOT NULL,
  `alamat` TEXT NOT NULL,
  `latitude` VARCHAR(50) DEFAULT NULL,
  `longitude` VARCHAR(50) DEFAULT NULL,
  `kabupaten` VARCHAR(100) DEFAULT NULL,
  `kecamatan` VARCHAR(100) DEFAULT NULL,
  `kalurahan` VARCHAR(100) DEFAULT NULL,
  `jenis_kejadian` VARCHAR(100) DEFAULT NULL,
  `deskripsi` TEXT NOT NULL,
  `foto` VARCHAR(255) DEFAULT NULL,
  `respon_admin` TEXT DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Menunggu',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- 3. Struktur Tabel `arsip_data`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `arsip_data` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `judul_arsip` VARCHAR(255) NOT NULL,
  `kategori` VARCHAR(100) NOT NULL DEFAULT 'Lainnya',
  `deskripsi` TEXT DEFAULT NULL,
  `nama_file` VARCHAR(255) NOT NULL,
  `nama_asli` VARCHAR(255) NOT NULL,
  `tipe_file` VARCHAR(100) NOT NULL,
  `ukuran_file` BIGINT NOT NULL DEFAULT 0,
  `file_url` VARCHAR(255) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- 4. Data Seed Admin Default
-- Username: admin
-- Password: admin123 (Verified Bcrypt Hash)
-- --------------------------------------------------------

INSERT INTO `admin` (`id`, `username`, `password`) VALUES
(1, 'admin', '$2a$10$45evxbKSSAgg.5fGxQhpPOLSsOIBMjUr3KAcZJoMhJbJ0JMutSHxu')
ON DUPLICATE KEY UPDATE `password`='$2a$10$45evxbKSSAgg.5fGxQhpPOLSsOIBMjUr3KAcZJoMhJbJ0JMutSHxu';

