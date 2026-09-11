const mysql = require("mysql2/promise");
const { dbConfig } = require("./index");

const pool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function query(text, params = []) {
  const [rows] = await pool.execute(text, params);

  if (Array.isArray(rows)) {
    return { rows, rowCount: rows.length };
  }

  return {
    rows: [],
    rowCount: rows.affectedRows ?? 0,
    insertId: rows.insertId ?? null,
  };
}

async function close() {
  await pool.end();
}

module.exports = {
  query,
  pool,
  close,
};
