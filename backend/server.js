const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const laporanRoutes = require('./routes/laporanRoutes');
const masterRoutes = require('./routes/masterRoutes');
const arsipRoutes = require('./routes/arsipRoutes');
const silakarRoutes = require('./routes/silakarRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

const fs = require('fs');

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Files Statically
app.use('/uploads/arsip', express.static(path.join(__dirname, 'uploads', 'arsip'), {
  setHeaders: (res) => res.setHeader('Content-Disposition', 'attachment')
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Resolve frontend path adaptively to support monorepo / Railway deployments
const candidateFrontendPaths = [
  path.resolve(__dirname, 'public'),
  path.resolve(__dirname, '../frontend'),
  path.resolve(__dirname, '../../frontend'),
  path.resolve(process.cwd(), 'backend/public'),
  path.resolve(process.cwd(), 'public'),
  path.resolve(process.cwd(), 'frontend'),
  path.resolve(process.cwd(), '../frontend')
];
const frontendPath = candidateFrontendPaths.find((p) => fs.existsSync(p)) || path.resolve(__dirname, 'public');

// Serve Frontend Statically
app.use(express.static(frontendPath));
app.use('/data', express.static(path.join(frontendPath, 'data')));
app.use('/css', express.static(path.join(frontendPath, 'css')));
app.use('/js', express.static(path.join(frontendPath, 'js')));
app.use('/assets', express.static(path.join(frontendPath, 'assets')));

// Explicit page routes for clean navigation
app.get('/admin', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(frontendPath, 'login.html'));
});
app.get('/laporan', (req, res) => {
  res.sendFile(path.join(frontendPath, 'laporan.html'));
});
app.get('/detail', (req, res) => {
  res.sendFile(path.join(frontendPath, 'detail.html'));
});
app.get('/silakar', (req, res) => {
  res.sendFile(path.join(frontendPath, 'silakar.html'));
});

// API Routes
app.use('/api', authRoutes);
app.use('/api', laporanRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/arsip', arsipRoutes);
app.use('/api/silakar', silakarRoutes);

// Fallback route for SPA / frontend navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal pada server.'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🔥 Damkar Emergency System Server Running!`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`📁 Uploads URL: http://localhost:${PORT}/uploads`);
  console.log(`===================================================`);
});
