const mysql = require('mysql2/promise');
const { Pool: PgPool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Auto-detect DB type if DATABASE_URL or POSTGRES_URL is provided, or DB_TYPE is postgres
const hasPostgresEnv = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PGHOST || (process.env.DB_TYPE && process.env.DB_TYPE.toLowerCase() === 'postgres'));
const hasMysqlEnv = !!(process.env.MYSQL_URL || process.env.MYSQLHOST || (process.env.DB_TYPE && process.env.DB_TYPE.toLowerCase() === 'mysql'));

let isMysql = true;
if (process.env.DB_TYPE) {
  isMysql = process.env.DB_TYPE.toLowerCase() === 'mysql';
} else if (hasPostgresEnv && !hasMysqlEnv) {
  isMysql = false;
} else {
  isMysql = true;
}

let pool;

async function ensureAdminUser(isMysqlDb, targetPool) {
  try {
    const defaultUsername = 'admin';
    const defaultPassword = 'admin123';
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);

    if (isMysqlDb) {
      const conn = await targetPool.getConnection();
      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS admin (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        const [rows] = await conn.query('SELECT * FROM admin WHERE username = ?', [defaultUsername]);
        if (!rows || rows.length === 0) {
          await conn.query('INSERT INTO admin (username, password) VALUES (?, ?)', [defaultUsername, hashedPassword]);
          console.log('✅ Admin default MySQL dibuat: Username: admin | Password: admin123');
        } else {
          await conn.query('UPDATE admin SET password = ? WHERE username = ?', [hashedPassword, defaultUsername]);
          console.log('✅ Password admin MySQL dipastikan sinkron: admin / admin123');
        }
      } finally {
        conn.release();
      }
    } else {
      await targetPool.query(`
        CREATE TABLE IF NOT EXISTS admin (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      const res = await targetPool.query('SELECT * FROM admin WHERE username = $1', [defaultUsername]);
      if (!res.rows || res.rows.length === 0) {
        await targetPool.query('INSERT INTO admin (username, password) VALUES ($1, $2)', [defaultUsername, hashedPassword]);
        console.log('✅ Admin default PostgreSQL dibuat: Username: admin | Password: admin123');
      } else {
        await targetPool.query('UPDATE admin SET password = $1 WHERE username = $2', [hashedPassword, defaultUsername]);
        console.log('✅ Password admin PostgreSQL dipastikan sinkron: admin / admin123');
      }
    }
  } catch (err) {
    console.warn('⚠️ Gagal memastikan user admin default:', err.message);
  }
}

if (isMysql) {
  // MySQL / phpMyAdmin Configuration (Supports local & Railway MySQL)
  let mysqlOptions;
  if (process.env.MYSQL_URL) {
    mysqlOptions = {
      uri: process.env.MYSQL_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };
  } else {
    mysqlOptions = {
      host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT, 10) || 3306,
      user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
      password: process.env.MYSQLPASSWORD !== undefined ? process.env.MYSQLPASSWORD : (process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : ''),
      database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'damkar_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };
  }
  pool = mysql.createPool(mysqlOptions);

  async function ensureMysqlLaporanSchema() {
    try {
      const connection = await pool.getConnection();
      try {
        await connection.query(`
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

        await connection.query(`
          CREATE TABLE IF NOT EXISTS kabupaten (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama VARCHAR(150) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS kecamatan (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama VARCHAR(150) NOT NULL,
            kabupaten_id INT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (kabupaten_id) REFERENCES kabupaten(id) ON DELETE SET NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await connection.query(`
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

        await connection.query(`
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

        await connection.query(`
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

        const [columns] = await connection.query('SHOW COLUMNS FROM laporan');
        const existingColumns = new Set(columns.map((column) => column.Field));

        const patchColumns = [
          ['kabupaten', 'VARCHAR(100) DEFAULT NULL'],
          ['kecamatan', 'VARCHAR(100) DEFAULT NULL'],
          ['kalurahan', 'VARCHAR(100) DEFAULT NULL'],
          ['jenis_kejadian', 'VARCHAR(100) DEFAULT NULL'],
          ['respon_admin', 'TEXT']
        ];

        for (const [columnName, definition] of patchColumns) {
          if (!existingColumns.has(columnName)) {
            await connection.query(`ALTER TABLE laporan ADD COLUMN ${columnName} ${definition}`);
          }
        }
      } finally {
        connection.release();
      }
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.warn('⚠️ Tabel `laporan` belum ada. Struktur akan otomatis dibuat.');
      } else {
        console.warn('⚠️ Schema laporan belum siap atau belum dipatch:', error.message);
      }
    }
  }

  async function ensureMysqlArsipSchema() {
    try {
      const connection = await pool.getConnection();
      try {
        await connection.query(`
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
            file_year INT NULL,
            record_count INT DEFAULT 0,
            parsed_data TEXT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        const [columns] = await connection.query('SHOW COLUMNS FROM arsip_data');
        const existingCols = new Set(columns.map(c => c.Field));
        const missingCols = [
          ['file_year', 'INT NULL'],
          ['record_count', 'INT DEFAULT 0'],
          ['parsed_data', 'TEXT NULL'],
          ['nama_folder', "VARCHAR(255) DEFAULT 'Umum'"]
        ].filter(([cName]) => !existingCols.has(cName));

        for (const [cName, cDef] of missingCols) {
          await connection.query(`ALTER TABLE arsip_data ADD COLUMN ${cName} ${cDef}`);
        }

        await connection.query(`
          CREATE TABLE IF NOT EXISTS arsip_folders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama_folder VARCHAR(255) NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        const [folderRows] = await connection.query('SELECT COUNT(*) as count FROM arsip_folders');
        if (folderRows && folderRows[0]?.count == 0) {
          const defaultFolders = ['Umum', 'folder non kebakaran', 'Laporan Kebakaran', 'Peta & Spasial', 'SOP & Regulasi'];
          for (const f of defaultFolders) {
            await connection.query('INSERT IGNORE INTO arsip_folders (nama_folder) VALUES (?)', [f]);
          }
        }
      } finally {
        connection.release();
      }
    } catch (error) {
      console.warn('⚠️ Schema arsip_data / arsip_folders belum siap:', error.message);
    }
  }

  async function ensureMysqlSilakarSchema() {
    try {
      const connection = await pool.getConnection();
      try {
        await connection.query(`
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

        const [rows] = await connection.query('SELECT COUNT(*) as count FROM kejadian_silakar');
        if (rows && rows[0]?.count == 0) {
          const sampleRecords = [
            ['2026-08-28', '14:30:00', '14:35:00', '14:48:00', 'Kabupaten Sleman', 'Depok', 'Caturtunggal', 'Jl. Kaliurang Km 5, Depok, Sleman', '-7.7583, 110.3812', 'Telepon 113', 'Budi Santoso', '081234567890', 'Kebakaran Permukiman', 'Rumah Tinggal', 'Korsleting Listrik', 0, 1, 4, 'Pos Damkar Sleman', 2, 'Hydrant / Mobil Tangki', 'Selesai', '16:00:00', 45000000, null, 'Penanganan selesai dengan aman.'],
            ['2026-08-25', '11:15:00', '11:20:00', '11:35:00', 'Kabupaten Gunungkidul', 'Playen', 'Logandeng', 'Jl. Jogja-Wonosari Km 22, Playen', '-7.9351, 110.5512', 'Masyarakat', 'Siti Rahma', '081987654321', 'Kebakaran Lahan', 'Lalang Kering', 'Pembakaran Sampah', 0, 0, 0, 'Pos Damkar Gunungkidul', 1, 'Mobil Tangki', 'Selesai', '12:45:00', 5000000, null, 'Api berhasil dilokalisir.'],
            ['2026-08-20', '03:45:00', '03:50:00', '04:02:00', 'Kabupaten Bantul', 'Sewon', 'Panggungharjo', 'Jl. Parangtritis Km 4.5, Sewon, Bantul', '-7.8341, 110.3621', 'Telepon 113', 'Agus Wijaya', '085712345678', 'Kebakaran Gedung', 'Ruko Sembako', 'Tabung Gas Bocor', 0, 0, 2, 'Pos Damkar Bantul', 3, 'Sumber Air Sungai / Tangki', 'Selesai', '06:15:00', 120000000, null, 'Kerugian material ruko sembako.'],
            ['2026-08-15', '22:10:00', '22:15:00', '22:30:00', 'Kabupaten Sleman', 'Godean', 'Sidoagung', 'Jl. Godean Km 8, Sleman', '-7.7712, 110.3012', 'Masyarakat', 'Hendra', '082134567891', 'Kebakaran Gedung', 'Gudang Kayu', 'Gesekan Mesin', 0, 0, 0, 'Pos Damkar Godean', 2, 'Mobil Tangki', 'Selesai', '00:30:00', 85000000, null, 'Berhasil dipadamkan total.'],
            ['2026-08-10', '16:20:00', '16:25:00', '16:38:00', 'Kota Yogyakarta', 'Umbulharjo', 'Pandeyan', 'Jl. Glagahsari, Umbulharjo, Kota Jogja', '-7.8123, 110.3891', 'Call Center 112', 'Rina Kartika', '087812345678', 'Kebakaran Kendaraan', 'Mobil Mini Bus', 'Kebocoran Selang Bensin', 0, 0, 1, 'Pos Damkar Pusat Yogyakarta', 1, 'APAR & Tangki', 'Selesai', '17:10:00', 35000000, null, 'Tidak ada korban jiwa.'],
            ['2026-08-05', '09:10:00', '09:15:00', '09:30:00', 'Kabupaten Kulon Progo', 'Wates', 'Giripeni', 'Jl. Wates-Purworejo, Wates, Kulon Progo', '-7.8612, 110.1589', 'Masyarakat', 'Tri Mulyani', '081823456789', 'Kebakaran Gedung', 'Kios Sembako Pasar', 'Korsleting Listrik', 0, 0, 3, 'Pos Damkar Kulon Progo', 2, 'Hydrant Pasar', 'Dalam Penanganan', null, 25000000, null, 'Petugas masih melakukan pendinginan.']
          ];

          for (const rec of sampleRecords) {
            await connection.query(`
              INSERT INTO kejadian_silakar (tanggal_kejadian, waktu_laporan, waktu_berangkat, waktu_tiba, kabupaten_kota, kapanewon, kalurahan, alamat_lokasi, koordinat, sumber_pengaduan, nama_pelapor, nomor_kontak, jenis_kejadian, objek_terbakar, dugaan_penyebab, korban_meninggal, korban_luka, jumlah_terdampak, unit_damkarmat, jumlah_armada, sumber_air, status_penanganan, waktu_selesai, perkiraan_kerugian, dokumentasi, keterangan)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, rec);
          }
          console.log('✅ Sample data SILAKAR berhasil di-seed.');
        }
      } finally {
        connection.release();
      }
    } catch (error) {
      console.warn('⚠️ Schema kejadian_silakar belum siap:', error.message);
    }
  }

  // Test MySQL Connection
  pool.getConnection()
    .then(async (conn) => {
      console.log('✅ Connected to MySQL database successfully!');
      await ensureMysqlLaporanSchema();
      await ensureMysqlArsipSchema();
      await ensureMysqlSilakarSchema();
      await ensureAdminUser(true, pool);
      conn.release();
    })
    .catch(err => {
      console.error('\n===================================================');
      console.error('❌ GAGAL KONEKSI KE DATABASE MYSQL');
      console.error('---------------------------------------------------');
      if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('🔑 Penyebab: Password / Username MySQL Salah.');
      } else if (err.code === 'ER_BAD_DB_ERROR') {
        console.error('🗄️ Penyebab: Database belum ada di MySQL.');
      } else if (err.code === 'ECONNREFUSED') {
        console.error('🔌 Penyebab: Server MySQL tidak dapat dihubungi.');
      } else {
        console.error('Detail Error:', err.message);
      }
      console.error('===================================================\n');
    });

} else {
  // PostgreSQL Configuration (Supports local & Railway PostgreSQL)
  let pgConfig;
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (connectionString) {
    pgConfig = {
      connectionString,
      ssl: connectionString.includes('railway') || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  } else {
    pgConfig = {
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.PGPORT || process.env.DB_PORT, 10) || 5432,
      user: process.env.PGUSER || process.env.DB_USER || 'postgres',
      password: process.env.PGPASSWORD !== undefined ? process.env.PGPASSWORD : (process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'postgres'),
      database: process.env.PGDATABASE || process.env.DB_NAME || 'damkar_db',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  }
  pool = new PgPool(pgConfig);

  async function ensurePostgresArsipSchema() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
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
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS kabupaten (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(150) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kecamatan (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(150) NOT NULL,
        kabupaten_id INT REFERENCES kabupaten(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pos_damkar (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(150) NOT NULL,
        alamat TEXT,
        kecamatan_id INT REFERENCES kecamatan(id) ON DELETE SET NULL,
        latitude VARCHAR(50),
        longitude VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS petugas (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(150) NOT NULL,
        nip VARCHAR(100),
        jabatan VARCHAR(100),
        pos_damkar_id INT REFERENCES pos_damkar(id) ON DELETE SET NULL,
        nomor_hp VARCHAR(30),
        status VARCHAR(50) DEFAULT 'Aktif',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS perangkat (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(150) NOT NULL,
        jenis VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'Siap Pakai',
        petugas_id INT REFERENCES petugas(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS arsip_data (
        id SERIAL PRIMARY KEY,
        judul_arsip VARCHAR(255) NOT NULL,
        kategori VARCHAR(100) NOT NULL DEFAULT 'Lainnya',
        deskripsi TEXT,
        nama_file VARCHAR(255) NOT NULL,
        nama_asli VARCHAR(255) NOT NULL,
        tipe_file VARCHAR(100) NOT NULL,
        ukuran_file BIGINT NOT NULL DEFAULT 0,
        file_url VARCHAR(255) NOT NULL,
        file_year INT,
        record_count INT DEFAULT 0,
        parsed_data TEXT,
        nama_folder VARCHAR(255) DEFAULT 'Umum',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query("ALTER TABLE arsip_data ADD COLUMN IF NOT EXISTS nama_folder VARCHAR(255) DEFAULT 'Umum'");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS arsip_folders (
        id SERIAL PRIMARY KEY,
        nama_folder VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const defaultFolders = ['Umum', 'folder non kebakaran', 'Laporan Kebakaran', 'Peta & Spasial', 'SOP & Regulasi'];
    for (const folder of defaultFolders) {
      await pool.query(
        'INSERT INTO arsip_folders (nama_folder) VALUES ($1) ON CONFLICT (nama_folder) DO NOTHING',
        [folder]
      );
    }

    await pool.query(`
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
      )
    `);

    const silakarRows = await pool.query('SELECT COUNT(*) as count FROM kejadian_silakar');
    if (silakarRows.rows && parseInt(silakarRows.rows[0]?.count, 10) === 0) {
      const sampleRecords = [
        ['2026-08-28', '14:30:00', '14:35:00', '14:48:00', 'Kabupaten Sleman', 'Depok', 'Caturtunggal', 'Jl. Kaliurang Km 5, Depok, Sleman', '-7.7583, 110.3812', 'Telepon 113', 'Budi Santoso', '081234567890', 'Kebakaran Permukiman', 'Rumah Tinggal', 'Korsleting Listrik', 0, 1, 4, 'Pos Damkar Sleman', 2, 'Hydrant / Mobil Tangki', 'Selesai', '16:00:00', 45000000, null, 'Penanganan selesai dengan aman.'],
        ['2026-08-25', '11:15:00', '11:20:00', '11:35:00', 'Kabupaten Gunungkidul', 'Playen', 'Logandeng', 'Jl. Jogja-Wonosari Km 22, Playen', '-7.9351, 110.5512', 'Masyarakat', 'Siti Rahma', '081987654321', 'Kebakaran Lahan', 'Lalang Kering', 'Pembakaran Sampah', 0, 0, 0, 'Pos Damkar Gunungkidul', 1, 'Mobil Tangki', 'Selesai', '12:45:00', 5000000, null, 'Api berhasil dilokalisir.'],
        ['2026-08-20', '03:45:00', '03:50:00', '04:02:00', 'Kabupaten Bantul', 'Sewon', 'Panggungharjo', 'Jl. Parangtritis Km 4.5, Sewon, Bantul', '-7.8341, 110.3621', 'Telepon 113', 'Agus Wijaya', '085712345678', 'Kebakaran Gedung', 'Ruko Sembako', 'Tabung Gas Bocor', 0, 0, 2, 'Pos Damkar Bantul', 3, 'Sumber Air Sungai / Tangki', 'Selesai', '06:15:00', 120000000, null, 'Kerugian material ruko sembako.'],
        ['2026-08-15', '22:10:00', '22:15:00', '22:30:00', 'Kabupaten Sleman', 'Godean', 'Sidoagung', 'Jl. Godean Km 8, Sleman', '-7.7712, 110.3012', 'Masyarakat', 'Hendra', '082134567891', 'Kebakaran Gedung', 'Gudang Kayu', 'Gesekan Mesin', 0, 0, 0, 'Pos Damkar Godean', 2, 'Mobil Tangki', 'Selesai', '00:30:00', 85000000, null, 'Berhasil dipadamkan total.'],
        ['2026-08-10', '16:20:00', '16:25:00', '16:38:00', 'Kota Yogyakarta', 'Umbulharjo', 'Pandeyan', 'Jl. Glagahsari, Umbulharjo, Kota Jogja', '-7.8123, 110.3891', 'Call Center 112', 'Rina Kartika', '087812345678', 'Kebakaran Kendaraan', 'Mobil Mini Bus', 'Kebocoran Selang Bensin', 0, 0, 1, 'Pos Damkar Pusat Yogyakarta', 1, 'APAR & Tangki', 'Selesai', '17:10:00', 35000000, null, 'Tidak ada korban jiwa.'],
        ['2026-08-05', '09:10:00', '09:15:00', '09:30:00', 'Kabupaten Kulon Progo', 'Wates', 'Giripeni', 'Jl. Wates-Purworejo, Wates, Kulon Progo', '-7.8612, 110.1589', 'Masyarakat', 'Tri Mulyani', '081823456789', 'Kebakaran Gedung', 'Kios Sembako Pasar', 'Korsleting Listrik', 0, 0, 3, 'Pos Damkar Kulon Progo', 2, 'Hydrant Pasar', 'Dalam Penanganan', null, 25000000, null, 'Petugas masih melakukan pendinginan.']
      ];

      for (const rec of sampleRecords) {
        await pool.query(`
          INSERT INTO kejadian_silakar (tanggal_kejadian, waktu_laporan, waktu_berangkat, waktu_tiba, kabupaten_kota, kapanewon, kalurahan, alamat_lokasi, koordinat, sumber_pengaduan, nama_pelapor, nomor_kontak, jenis_kejadian, objek_terbakar, dugaan_penyebab, korban_meninggal, korban_luka, jumlah_terdampak, unit_damkarmat, jumlah_armada, sumber_air, status_penanganan, waktu_selesai, perkiraan_kerugian, dokumentasi, keterangan)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        `, rec);
      }
      console.log('✅ Sample data SILAKAR PostgreSQL berhasil di-seed.');
    }
  }

  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Error connecting to PostgreSQL:', err.message);
    } else {
      console.log('✅ Connected to PostgreSQL database successfully!');
      release();
      ensurePostgresArsipSchema()
        .then(() => ensureAdminUser(false, pool))
        .catch(schemaError => {
          console.warn('⚠️ Schema PostgreSQL belum siap:', schemaError.message);
        });
    }
  });
}

// Universal Query Function (Compatible with both MySQL and Postgres syntax)
async function query(text, params = []) {
  if (isMysql) {
    // Convert PostgreSQL parameter syntax ($1, $2) to MySQL syntax (?)
    let mysqlSql = text.replace(/\$(\d+)/g, '?');
    // Remove RETURNING * clause for MySQL INSERT statements
    mysqlSql = mysqlSql.replace(/RETURNING\s+\*/gi, '');

    const [rows, fields] = await pool.query(mysqlSql, params);

    // Normalize output structure
    if (Array.isArray(rows)) {
      return { rows, rowCount: rows.length };
    } else if (rows && rows.insertId) {
      if (/INSERT\s+INTO\s+laporan\b/i.test(mysqlSql)) {
        const [insertedRows] = await pool.query('SELECT * FROM laporan WHERE id = ?', [rows.insertId]);
        return { rows: insertedRows, rowCount: 1, insertId: rows.insertId };
      }
      return { rows: [{ id: rows.insertId }], rowCount: 1, insertId: rows.insertId };
    }
    return { rows: [], rowCount: 0 };
  } else {
    // PostgreSQL direct execution with automatic MySQL compatibility
    let pgSql = text;
    const isInsertIgnore = /^\s*INSERT\s+IGNORE\s+INTO\b/i.test(pgSql);
    if (isInsertIgnore) {
      pgSql = pgSql.replace(/INSERT\s+IGNORE\s+INTO/i, 'INSERT INTO');
      pgSql += ' ON CONFLICT DO NOTHING';
    }

    // Convert ? to $1, $2, $3... if present
    if (pgSql.includes('?')) {
      let index = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${index++}`);
    }

    // Convert MySQL date functions to PostgreSQL EXTRACT
    pgSql = pgSql.replace(/YEAR\(([^)]+)\)/gi, 'EXTRACT(YEAR FROM $1)');
    pgSql = pgSql.replace(/MONTH\(([^)]+)\)/gi, 'EXTRACT(MONTH FROM $1)');
    pgSql = pgSql.replace(/DAY\(([^)]+)\)/gi, 'EXTRACT(DAY FROM $1)');
    pgSql = pgSql.replace(/IFNULL\(/gi, 'COALESCE(');

    return await pool.query(pgSql, params);
  }
}

module.exports = {
  query,
  pool
};
