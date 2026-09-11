const db = require('./config/db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const isMysql = (process.env.DB_TYPE || 'mysql').toLowerCase() === 'mysql';

async function seedDatabase() {
  try {
    console.log(`🔄 Initializing database tables (${isMysql ? 'MySQL / phpMyAdmin' : 'PostgreSQL'})...`);

    if (isMysql) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS admin (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS laporan (
          id INT AUTO_INCREMENT PRIMARY KEY,
          judul_kejadian VARCHAR(255) NOT NULL,
          nama_pelapor VARCHAR(100) NOT NULL,
          nomor_hp VARCHAR(20) NOT NULL,
          alamat TEXT NOT NULL,
          latitude VARCHAR(50),
          longitude VARCHAR(50),
          kabupaten VARCHAR(100),
          kecamatan VARCHAR(100),
          kalurahan VARCHAR(100),
          jenis_kejadian VARCHAR(100),
          deskripsi TEXT NOT NULL,
          foto VARCHAR(255),
          respon_admin TEXT,
          status VARCHAR(50) DEFAULT 'Menunggu',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      const columnsResult = await db.query('SHOW COLUMNS FROM laporan');
      const existingColumns = new Set(columnsResult.rows.map((column) => column.Field));
      const missingColumns = [
        ['kabupaten', 'VARCHAR(100) DEFAULT NULL'],
        ['kecamatan', 'VARCHAR(100) DEFAULT NULL'],
        ['kalurahan', 'VARCHAR(100) DEFAULT NULL'],
        ['jenis_kejadian', 'VARCHAR(100) DEFAULT NULL'],
        ['respon_admin', 'TEXT']
      ].filter(([columnName]) => !existingColumns.has(columnName));

      for (const [columnName, definition] of missingColumns) {
        await db.query(`ALTER TABLE laporan ADD COLUMN ${columnName} ${definition}`);
      }

      await db.query(`
        CREATE TABLE IF NOT EXISTS kabupaten (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nama VARCHAR(150) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS kecamatan (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nama VARCHAR(150) NOT NULL,
          kabupaten_id INT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (kabupaten_id) REFERENCES kabupaten(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS pos_damkar (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nama VARCHAR(150) NOT NULL,
          alamat TEXT NULL,
          kecamatan_id INT NULL,
          latitude VARCHAR(50) NULL,
          longitude VARCHAR(50) NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS petugas (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nama VARCHAR(150) NOT NULL,
          nip VARCHAR(100) NULL,
          jabatan VARCHAR(100) NULL,
          pos_damkar_id INT NULL,
          nomor_hp VARCHAR(30) NULL,
          status VARCHAR(50) DEFAULT 'Aktif',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (pos_damkar_id) REFERENCES pos_damkar(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS perangkat (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nama VARCHAR(150) NOT NULL,
          jenis VARCHAR(50) NOT NULL,
          status VARCHAR(50) DEFAULT 'Siap Pakai',
          petugas_id INT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (petugas_id) REFERENCES petugas(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS arsip_data (
          id INT AUTO_INCREMENT PRIMARY KEY,
          judul_arsip VARCHAR(255) NOT NULL,
          kategori VARCHAR(100) NOT NULL DEFAULT 'Lainnya',
          deskripsi TEXT NULL,
          nama_file VARCHAR(255) NOT NULL,
          nama_asli VARCHAR(255) NOT NULL,
          tipe_file VARCHAR(100) NOT NULL,
          ukuran_file BIGINT NOT NULL DEFAULT 0,
          file_url VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS kejadian_silakar (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tanggal_kejadian DATE NOT NULL,
          waktu_laporan TIME NULL,
          waktu_berangkat TIME NULL,
          waktu_tiba TIME NULL,
          kabupaten_kota VARCHAR(100) NULL,
          kapanewon VARCHAR(100) NULL,
          kalurahan VARCHAR(100) NULL,
          alamat_lokasi TEXT NULL,
          koordinat VARCHAR(100) NULL,
          sumber_pengaduan VARCHAR(100) NULL,
          nama_pelapor VARCHAR(150) NULL,
          nomor_kontak VARCHAR(30) NULL,
          jenis_kejadian VARCHAR(100) NULL,
          objek_terbakar VARCHAR(255) NULL,
          dugaan_penyebab VARCHAR(255) NULL,
          korban_meninggal INT DEFAULT 0,
          korban_luka INT DEFAULT 0,
          jumlah_terdampak INT DEFAULT 0,
          unit_damkarmat VARCHAR(255) NULL,
          jumlah_armada INT DEFAULT 0,
          sumber_air VARCHAR(255) NULL,
          status_penanganan VARCHAR(100) DEFAULT 'Dalam Penanganan',
          waktu_selesai TIME NULL,
          perkiraan_kerugian BIGINT DEFAULT 0,
          dokumentasi VARCHAR(255) NULL,
          keterangan TEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } else {
      await db.query(`
        CREATE TABLE IF NOT EXISTS admin (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS laporan (
          id SERIAL PRIMARY KEY,
          judul_kejadian VARCHAR(255) NOT NULL,
          nama_pelapor VARCHAR(100) NOT NULL,
          nomor_hp VARCHAR(20) NOT NULL,
          alamat TEXT NOT NULL,
          latitude VARCHAR(50),
          longitude VARCHAR(50),
          kabupaten VARCHAR(100),
          kecamatan VARCHAR(100),
          kalurahan VARCHAR(100),
          jenis_kejadian VARCHAR(100),
          deskripsi TEXT NOT NULL,
          foto VARCHAR(255),
          respon_admin TEXT,
          status VARCHAR(50) DEFAULT 'Menunggu',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS kabupaten (
          id SERIAL PRIMARY KEY,
          nama VARCHAR(150) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS kecamatan (
          id SERIAL PRIMARY KEY,
          nama VARCHAR(150) NOT NULL,
          kabupaten_id INT NULL REFERENCES kabupaten(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS pos_damkar (
          id SERIAL PRIMARY KEY,
          nama VARCHAR(150) NOT NULL,
          alamat TEXT NULL,
          kecamatan_id INT NULL REFERENCES kecamatan(id) ON DELETE SET NULL,
          latitude VARCHAR(50) NULL,
          longitude VARCHAR(50) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS petugas (
          id SERIAL PRIMARY KEY,
          nama VARCHAR(150) NOT NULL,
          nip VARCHAR(100) NULL,
          jabatan VARCHAR(100) NULL,
          pos_damkar_id INT NULL REFERENCES pos_damkar(id) ON DELETE SET NULL,
          nomor_hp VARCHAR(30) NULL,
          status VARCHAR(50) DEFAULT 'Aktif',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS perangkat (
          id SERIAL PRIMARY KEY,
          nama VARCHAR(150) NOT NULL,
          jenis VARCHAR(50) NOT NULL,
          status VARCHAR(50) DEFAULT 'Siap Pakai',
          petugas_id INT NULL REFERENCES petugas(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS arsip_data (
          id SERIAL PRIMARY KEY,
          judul_arsip VARCHAR(255) NOT NULL,
          kategori VARCHAR(100) NOT NULL DEFAULT 'Lainnya',
          deskripsi TEXT NULL,
          nama_file VARCHAR(255) NOT NULL,
          nama_asli VARCHAR(255) NOT NULL,
          tipe_file VARCHAR(100) NOT NULL,
          ukuran_file BIGINT NOT NULL DEFAULT 0,
          file_url VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS kejadian_silakar (
          id SERIAL PRIMARY KEY,
          tanggal_kejadian DATE NOT NULL,
          waktu_laporan TIME NULL,
          waktu_berangkat TIME NULL,
          waktu_tiba TIME NULL,
          kabupaten_kota VARCHAR(100) NULL,
          kapanewon VARCHAR(100) NULL,
          kalurahan VARCHAR(100) NULL,
          alamat_lokasi TEXT NULL,
          koordinat VARCHAR(100) NULL,
          sumber_pengaduan VARCHAR(100) NULL,
          nama_pelapor VARCHAR(150) NULL,
          nomor_kontak VARCHAR(30) NULL,
          jenis_kejadian VARCHAR(100) NULL,
          objek_terbakar VARCHAR(255) NULL,
          dugaan_penyebab VARCHAR(255) NULL,
          korban_meninggal INT DEFAULT 0,
          korban_luka INT DEFAULT 0,
          jumlah_terdampak INT DEFAULT 0,
          unit_damkarmat VARCHAR(255) NULL,
          jumlah_armada INT DEFAULT 0,
          sumber_air VARCHAR(255) NULL,
          status_penanganan VARCHAR(100) DEFAULT 'Dalam Penanganan',
          waktu_selesai TIME NULL,
          perkiraan_kerugian BIGINT DEFAULT 0,
          dokumentasi VARCHAR(255) NULL,
          keterangan TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }


    // Seed / Reset Default Admin
    const defaultUsername = 'admin';
    const defaultPassword = 'admin123';
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);

    const checkAdmin = await db.query('SELECT * FROM admin WHERE username = $1', [defaultUsername]);
    
    if (checkAdmin.rows.length === 0) {
      await db.query(
        'INSERT INTO admin (username, password) VALUES ($1, $2)',
        [defaultUsername, hashedPassword]
      );
      console.log(`✅ Default admin created: Username: ${defaultUsername} | Password: ${defaultPassword}`);
    } else {
      await db.query(
        'UPDATE admin SET password = $1 WHERE username = $2',
        [hashedPassword, defaultUsername]
      );
      console.log(`✅ Admin password updated to verified hash for: ${defaultUsername} / ${defaultPassword}`);
    }

    console.log('✅ Database initialization complete.');
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
  } finally {
    process.exit(0);
  }
}

seedDatabase();
