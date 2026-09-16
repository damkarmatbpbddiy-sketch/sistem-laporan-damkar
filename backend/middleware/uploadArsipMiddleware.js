const multer = require('multer');
const path = require('path');
const fs = require('fs');

const arsipUploadDir = path.join(__dirname, '../uploads/arsip');
if (!fs.existsSync(arsipUploadDir)) {
  fs.mkdirSync(arsipUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, arsipUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const cleanOriginalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(cleanOriginalName).toLowerCase();
    cb(null, 'arsip-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv',
    '.zip', '.rar', '.7z', '.json', '.geojson', '.qmd', '.mpk', '.shp',
    '.png', '.jpg', '.jpeg', '.webp'
  ];
  const forbiddenExtensions = [
    '.php', '.phtml', '.php3', '.php4', '.php5', '.phps',
    '.exe', '.bat', '.cmd', '.sh', '.bash', '.pl', '.cgi',
    '.asp', '.aspx', '.js', '.html', '.htm', '.jar', '.vbs'
  ];
  const cleanOriginalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = path.extname(cleanOriginalName).toLowerCase();
  const blockedMimeTypes = [
    'application/javascript',
    'application/x-httpd-php',
    'application/x-msdownload',
    'text/html',
    'text/javascript',
    'text/x-shellscript'
  ];

  if (forbiddenExtensions.includes(ext)) {
    return cb(new Error(`Security Error: Ekstensi berkas '${ext}' berpotensi bahaya dan tidak diizinkan.`), false);
  }

  if (allowedExtensions.includes(ext) && !blockedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error(`Format file '${ext}' tidak didukung. Harap upload file PDF, Word, Excel, QMD, ZIP, GeoJSON, MPK, atau Gambar.`), false);
  }
};

const uploadArsip = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Max 50MB
  fileFilter: fileFilter
});

module.exports = uploadArsip;
