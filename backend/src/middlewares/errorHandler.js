function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: "Route tidak ditemukan" });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(500).json({ success: false, message: "Terjadi kesalahan server", error: err.message });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
