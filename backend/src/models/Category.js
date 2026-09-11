const TABLE_NAME = "categories";
const DEFAULT_CATEGORIES = [
  "Kebakaran",
  "Bencana Alam",
  "Potensi Bahaya",
  "Evakuasi",
];
const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

module.exports = {
  TABLE_NAME,
  DEFAULT_CATEGORIES,
  CREATE_TABLE,
};
