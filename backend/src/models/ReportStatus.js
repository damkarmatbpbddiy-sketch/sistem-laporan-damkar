const TABLE_NAME = "report_status";
const STATUSES = ["pending", "in_progress", "resolved"];
const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
  status VARCHAR(50) PRIMARY KEY,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

module.exports = {
  TABLE_NAME,
  STATUSES,
  CREATE_TABLE,
};
