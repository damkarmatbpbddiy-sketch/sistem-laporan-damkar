const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const port = Number(process.env.PORT) || 3000;
const jwtSecret = process.env.JWT_SECRET || "change_this_secret";
const uploadDir = path.resolve(process.cwd(), "uploads");

module.exports = {
  port,
  jwtSecret,
  uploadDir,
};
