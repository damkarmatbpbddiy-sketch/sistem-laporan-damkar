function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateRegister(req, res, next) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Semua field harus diisi" });
  }

  if (typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ success: false, message: "Nama minimal 2 karakter" });
  }

  if (typeof email !== "string" || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: "Format email tidak valid" });
  }

  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ success: false, message: "Password minimal 6 karakter" });
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  next();
}

function validateLogin(req, res, next) {
  const { email, identifier, password } = req.body;
  const loginIdentifier = (email ?? identifier ?? "").toString().trim();

  if (!loginIdentifier || !password) {
    return res.status(400).json({ success: false, message: "Email atau username dan password harus diisi" });
  }

  if (typeof password !== "string" || password.length < 1) {
    return res.status(400).json({ success: false, message: "Password harus diisi" });
  }

  if (email !== undefined && email !== null && email !== "") {
    if (typeof email !== "string" || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Format email tidak valid" });
    }
    req.body.email = email.trim().toLowerCase();
  }

  if (identifier !== undefined && identifier !== null && identifier !== "") {
    req.body.identifier = loginIdentifier;
  }

  next();
}

module.exports = {
  validateRegister,
  validateLogin,
};
