const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const port = Number(process.env.PORT) || 3000;
const jwtSecret = process.env.JWT_SECRET || "change_this_secret";
const dbUrl = process.env.DATABASE_URL || "";
const uploadDir = path.resolve(process.cwd(), "uploads");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  name: process.env.DB_NAME || "damkar",
};

module.exports = {
  port,
  jwtSecret,
  dbUrl,
  dbConfig,
  uploadDir,
};
