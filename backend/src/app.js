const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { uploadDir } = require("./config");
const authRoutes = require("./routes/authRoutes");
const reportRoutes = require("./routes/reportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const docsRoutes = require("./routes/docsRoutes");
const { notFoundHandler, errorHandler } = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadDir));

// Resolve frontend path adaptively to support monorepo / Railway deployments
const candidateFrontendPaths = [
  path.resolve(__dirname, "../../frontend"),
  path.resolve(__dirname, "../frontend"),
  path.resolve(process.cwd(), "frontend"),
  path.resolve(process.cwd(), "../frontend")
];
const frontendPath = candidateFrontendPaths.find((p) => fs.existsSync(p)) || path.resolve(__dirname, "../../frontend");

// Serve Frontend Statically
app.use(express.static(frontendPath));
app.use("/data", express.static(path.join(frontendPath, "data")));

// Explicit page routes for clean navigation
app.get("/admin", (req, res) => {
  res.sendFile(path.join(frontendPath, "admin.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(frontendPath, "login.html"));
});
app.get("/laporan", (req, res) => {
  res.sendFile(path.join(frontendPath, "laporan.html"));
});
app.get("/detail", (req, res) => {
  res.sendFile(path.join(frontendPath, "detail.html"));
});
app.get("/silakar", (req, res) => {
  res.sendFile(path.join(frontendPath, "silakar.html"));
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/reports", reportRoutes);
app.use("/admin", adminRoutes);
app.use("/docs", docsRoutes);

// Fallback route for SPA / frontend navigation
app.get("*", (req, res, next) => {
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/uploads") ||
    req.path.startsWith("/auth") ||
    req.path.startsWith("/reports") ||
    req.path.startsWith("/docs") ||
    req.path.startsWith("/health")
  ) {
    return next();
  }
  const indexPath = path.join(frontendPath, "index.html");
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return next();
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
