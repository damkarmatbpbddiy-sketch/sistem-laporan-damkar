const jwt = require("jsonwebtoken");
const { jwtSecret } = require("..");

function signToken(payload, expiresIn = "15m") {
  return jwt.sign(payload, jwtSecret, { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

function createRefreshToken(user) {
  return signToken({ id: user.id, email: user.email, role: user.role }, "30d");
}

module.exports = {
  signToken,
  verifyToken,
  createRefreshToken,
};
