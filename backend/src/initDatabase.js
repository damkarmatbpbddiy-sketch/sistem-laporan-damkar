const fs = require("fs");
const { pool } = require("./config/db");
const { uploadDir } = require(".");
const { CREATE_TABLE: createUsers } = require("./models/User");
const { CREATE_TABLE: createCategories, DEFAULT_CATEGORIES } = require("./models/Category");
const { CREATE_TABLE: createReportStatus, STATUSES } = require("./models/ReportStatus");
const { CREATE_TABLE: createReports } = require("./models/Report");

async function initDatabase() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  try {
    await pool.query(createUsers);
    await pool.query(createCategories);
    await pool.query(createReportStatus);
    await pool.query(createReports);

    // Ensure reports table has category_id after older migrations
    const [reportCategoryColumn] = await pool.query("SHOW COLUMNS FROM reports LIKE 'category_id'");
    if (!reportCategoryColumn.length) {
      await pool.query("ALTER TABLE reports ADD COLUMN category_id INT NULL AFTER user_id");
      await pool.query("ALTER TABLE reports ADD CONSTRAINT fk_reports_category FOREIGN KEY (category_id) REFERENCES categories(id)");
    }

    // Ensure reports table has location column after older migrations
    const [reportLocationColumn] = await pool.query("SHOW COLUMNS FROM reports LIKE 'location'");
    if (!reportLocationColumn.length) {
      await pool.query("ALTER TABLE reports ADD COLUMN location VARCHAR(255) NULL AFTER title");
    }

    for (const category of DEFAULT_CATEGORIES) {
      await pool.query("INSERT IGNORE INTO categories (name) VALUES (?)", [category]);
    }

    for (const status of STATUSES) {
      await pool.query("INSERT IGNORE INTO report_status (status) VALUES (?)", [status]);
    }
  } catch (error) {
    console.warn("Database initialization skipped:", error.message);
  }
}

module.exports = initDatabase;
