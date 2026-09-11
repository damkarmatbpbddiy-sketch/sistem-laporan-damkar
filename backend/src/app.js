const express = require("express");
const cors = require("cors");
const path = require("path");
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

// Serve frontend static files so frontend and backend share the same origin
const staticPath = path.join(__dirname, '..', '..', 'frontend', 'public');
app.use(express.static(staticPath));
// Serve frontend asset folders so index.html can load ../js and ../css references
app.use('/js', express.static(path.join(__dirname, '..', '..', 'frontend', 'js')));
app.use('/css', express.static(path.join(__dirname, '..', '..', 'frontend', 'css')));
app.use('/assets', express.static(path.join(__dirname, '..', '..', 'frontend', 'assets')));
app.use('/data', express.static(path.join(__dirname, '..', '..', 'frontend', 'data')));

app.get('/', (req, res) => {
  // Serve frontend index.html at root
  res.sendFile(path.join(staticPath, 'index.html'));
});

app.get('/admin.html', (req, res) => {
  // Serve admin.html for admin panel
  res.sendFile(path.join(staticPath, 'admin.html'));
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/reports", reportRoutes);
app.use("/admin", adminRoutes);
app.use("/docs", docsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
