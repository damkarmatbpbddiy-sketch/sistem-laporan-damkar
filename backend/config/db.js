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

        // Auto-seed Master Kabupaten DIY jika masih kosong
        const [kabRows] = await connection.query('SELECT COUNT(*) as count FROM kabupaten');
        if (kabRows && kabRows[0]?.count == 0) {
          const defaultKabs = ['Kota Yogyakarta', 'Kabupaten Sleman', 'Kabupaten Bantul', 'Kabupaten Kulon Progo', 'Kabupaten Gunungkidul'];
          for (const k of defaultKabs) {
            await connection.query('INSERT INTO kabupaten (nama) VALUES (?)', [k]);
          }
          console.log('✅ Master data Kabupaten DIY berhasil di-seed ke MySQL.');
        }

        // Auto-seed Master Pos Damkar jika masih kosong
        const [posRows] = await connection.query('SELECT COUNT(*) as count FROM pos_damkar');
        if (posRows && posRows[0]?.count == 0) {
          const samplePos = [
            ['Pos Damkar Induk Kyai Mojo', 'Jl. Kyai Mojo No. 56, Jetis, Kota Yogyakarta', '-7.7845', '110.3582'],
            ['Pos Damkar Sleman Pusat', 'Jl. Magelang Km 10, Tridadi, Sleman', '-7.7123', '110.3541'],
            ['Pos Damkar Depok Sleman', 'Babarsari, Caturtunggal, Depok, Sleman', '-7.7782', '110.4089'],
            ['Pos Damkar Godean', 'Jl. Godean Km 9, Godean, Sleman', '-7.7712', '110.3012'],
            ['Pos Damkar Bantul', 'Jl. Jenderal Sudirman No. 1, Bantul', '-7.8872', '110.3312'],
            ['Pos Damkar Banguntapan', 'Jl. Ringroad Timur, Banguntapan, Bantul', '-7.8189', '110.4072'],
            ['Pos Damkar Kulon Progo', 'Jl. Sugiman, Pengasih, Wates, Kulon Progo', '-7.8542', '110.1582'],
            ['Pos Damkar Gunungkidul', 'Jl. Brigjen Katamso, Wonosari, Gunungkidul', '-7.9621', '110.6012']
          ];
          for (const p of samplePos) {
            await connection.query('INSERT INTO pos_damkar (nama, alamat, latitude, longitude) VALUES (?, ?, ?, ?)', p);
          }
          console.log('✅ Master data Pos Damkar DIY berhasil di-seed ke MySQL.');
        }

        // Bersihkan data laporan kejadian
        await connection.query('DELETE FROM laporan');
        try {
          await connection.query('ALTER TABLE laporan AUTO_INCREMENT = 1');
        } catch (e) {}
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

        await connection.query('DELETE FROM arsip_data');
        try {
          await connection.query('ALTER TABLE arsip_data AUTO_INCREMENT = 1');
        } catch (e) {}
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

        // Migrasi otomatis kategori lama ke 4 kategori resmi
        await connection.query("UPDATE kejadian_silakar SET jenis_kejadian = 'Kebakaran Pemukiman' WHERE jenis_kejadian IN ('Kebakaran', 'Kebakaran Gedung', 'Kebakaran Bangunan', 'Kebakaran Rumah')");
        await connection.query("UPDATE kejadian_silakar SET jenis_kejadian = 'Penyelamatan' WHERE jenis_kejadian IN ('Kebakaran Kendaraan', 'Evakuasi', 'Pohon Tumbang', 'Sarang Tawon', 'Non Kebakaran', 'Kecelakaan', 'Bencana Alam', 'Hazmat', 'Lainnya')");

        // Bersihkan data kejadian silakar
        await connection.query('DELETE FROM kejadian_silakar');
        try {
          await connection.query('ALTER TABLE kejadian_silakar AUTO_INCREMENT = 1');
        } catch (e) {}
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

    // Auto-seed Master Kabupaten DIY jika masih kosong (PostgreSQL)
    const [kabPgRows] = await pool.query('SELECT COUNT(*) as count FROM kabupaten').then(res => [res.rows]);
    if (kabPgRows && parseInt(kabPgRows[0]?.count || 0, 10) === 0) {
      const defaultKabs = ['Kota Yogyakarta', 'Kabupaten Sleman', 'Kabupaten Bantul', 'Kabupaten Kulon Progo', 'Kabupaten Gunungkidul'];
      for (const k of defaultKabs) {
        await pool.query('INSERT INTO kabupaten (nama) VALUES ($1)', [k]);
      }
      console.log('✅ Master data Kabupaten DIY berhasil di-seed ke PostgreSQL.');
    }

    // Auto-seed Master Pos Damkar jika masih kosong (PostgreSQL)
    const [posPgRows] = await pool.query('SELECT COUNT(*) as count FROM pos_damkar').then(res => [res.rows]);
    if (posPgRows && parseInt(posPgRows[0]?.count || 0, 10) === 0) {
      const samplePos = [
        ['Pos Damkar Induk Kyai Mojo', 'Jl. Kyai Mojo No. 56, Jetis, Kota Yogyakarta', '-7.7845', '110.3582'],
        ['Pos Damkar Sleman Pusat', 'Jl. Magelang Km 10, Tridadi, Sleman', '-7.7123', '110.3541'],
        ['Pos Damkar Depok Sleman', 'Babarsari, Caturtunggal, Depok, Sleman', '-7.7782', '110.4089'],
        ['Pos Damkar Godean', 'Jl. Godean Km 9, Godean, Sleman', '-7.7712', '110.3012'],
        ['Pos Damkar Bantul', 'Jl. Jenderal Sudirman No. 1, Bantul', '-7.8872', '110.3312'],
        ['Pos Damkar Banguntapan', 'Jl. Ringroad Timur, Banguntapan, Bantul', '-7.8189', '110.4072'],
        ['Pos Damkar Kulon Progo', 'Jl. Sugiman, Pengasih, Wates, Kulon Progo', '-7.8542', '110.1582'],
        ['Pos Damkar Gunungkidul', 'Jl. Brigjen Katamso, Wonosari, Gunungkidul', '-7.9621', '110.6012']
      ];
      for (const p of samplePos) {
        await pool.query('INSERT INTO pos_damkar (nama, alamat, latitude, longitude) VALUES ($1, $2, $3, $4)', p);
      }
      console.log('✅ Master data Pos Damkar DIY berhasil di-seed ke PostgreSQL.');
    }

    // Bersihkan data laporan kejadian
    await pool.query('DELETE FROM laporan');
    try {
      await pool.query('ALTER SEQUENCE laporan_id_seq RESTART WITH 1');
    } catch (e) {}

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

    await pool.query('DELETE FROM arsip_data');
    try {
      await pool.query('ALTER SEQUENCE arsip_data_id_seq RESTART WITH 1');
    } catch (e) {}

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

    try {
      // Migrasi otomatis kategori lama ke 4 kategori resmi
      await pool.query("UPDATE kejadian_silakar SET jenis_kejadian = 'Kebakaran Pemukiman' WHERE jenis_kejadian IN ('Kebakaran', 'Kebakaran Gedung', 'Kebakaran Bangunan', 'Kebakaran Rumah')");
      await pool.query("UPDATE kejadian_silakar SET jenis_kejadian = 'Penyelamatan' WHERE jenis_kejadian IN ('Kebakaran Kendaraan', 'Evakuasi', 'Pohon Tumbang', 'Sarang Tawon', 'Non Kebakaran', 'Kecelakaan', 'Bencana Alam', 'Hazmat', 'Lainnya')");

      // Bersihkan data kejadian silakar
      await pool.query('DELETE FROM kejadian_silakar');
      try {
        await pool.query('ALTER SEQUENCE kejadian_silakar_id_seq RESTART WITH 1');
      } catch (e) {}
    } catch (silakarErr) {
      console.warn('⚠️ ensurePostgresSilakarSchema notice:', silakarErr.message);
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
      const match = /INSERT\s+INTO\s+([a-zA-Z0-9_]+)\b/i.exec(mysqlSql);
      if (match && match[1]) {
        try {
          const [insertedRows] = await pool.query(`SELECT * FROM ${match[1]} WHERE id = ?`, [rows.insertId]);
          return { rows: insertedRows, rowCount: 1, insertId: rows.insertId };
        } catch (e) {
          return { rows: [{ id: rows.insertId }], rowCount: 1, insertId: rows.insertId };
        }
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
