function validateReport(req, res, next) {
  const { title, location, description } = req.body;

  if (!title || !location || !description) {
    return res.status(400).json({ success: false, message: "Title, lokasi, dan description harus diisi" });
  }

  if (typeof title !== "string" || title.trim().length < 3 || title.trim().length > 120) {
    return res.status(400).json({ success: false, message: "Title harus 3-120 karakter" });
  }

  if (typeof location !== "string" || location.trim().length < 3 || location.trim().length > 255) {
    return res.status(400).json({ success: false, message: "Lokasi harus 3-255 karakter" });
  }

  if (typeof description !== "string" || description.trim().length < 10 || description.trim().length > 2000) {
    return res.status(400).json({ success: false, message: "Description harus 10-2000 karakter" });
  }

  req.body.title = title.trim();
  req.body.location = location.trim();
  req.body.description = description.trim();
  next();
}

module.exports = {
  validateReport,
};
