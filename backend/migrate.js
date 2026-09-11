const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { dbConfig } = require("./src/config");
const { shouldSkipMigrationError } = require("./src/utils/migrationErrorUtils");

async function ensureDatabase() {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.name}\``);
  await connection.end();
}

async function runMigrations() {
  await ensureDatabase();

  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.name,
  });

  try {
    const migrationsDir = path.join(__dirname, "migrations");
    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf8");
      const statements = sql
        .split(";")
        .map((statement) => statement.trim())
        .filter(Boolean);

      console.log(`Running migration: ${file}`);
      for (const statement of statements) {
        try {
          await connection.query(statement);
        } catch (err) {
          if (shouldSkipMigrationError(err)) {
            console.warn(`Migrasi dilewati: ${err.sqlMessage || err.message}`);
            continue;
          }
          throw err;
        }
      }
    }

    console.log("Migrations selesai.");
    process.exit(0);
  } finally {
    await connection.end();
  }
}

runMigrations().catch((err) => {
  const errorMessage = err?.sqlMessage || err?.message || JSON.stringify(err);
  console.error("Migrasi gagal:", errorMessage);
  process.exit(1);
});
