const bcrypt = require("bcrypt");
const { query, pool } = require("./db");

async function runSeed() {
  const passwordHash = await bcrypt.hash("password123", 10);
  const userResult = await query(
    `INSERT IGNORE INTO users (name, email, password_hash)
     VALUES (?, ?, ?)`,
    ["Admin", "admin@example.com", passwordHash]
  );

  const existingUser = await query("SELECT id FROM users WHERE email = ?", ["admin@example.com"]);
  const userId = existingUser.rows[0]?.id;

  if (!userId) {
    console.log("Seed data dibatalkan karena user belum bisa dibuat.");
    await pool.end();
    process.exit(0);
  }

  await query(
    `INSERT IGNORE INTO reports (user_id, title, description, image_url, status)
     VALUES (?, ?, ?, ?, ?)`,
    [
      userId,
      "Contoh laporan kebakaran",
      "Ini adalah laporan percobaan untuk sistem laporan damkar.",
      null,
      "pending",
    ]
  );

  console.log("Seed data berhasil dimasukkan.");
  await pool.end();
  process.exit(0);
}

runSeed().catch((err) => {
  console.error(err);
  process.exit(1);
});
