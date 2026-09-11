function success(res, data = {}, message = null, status = 200) {
  const payload = { success: true, ...data };
  if (message) {
    payload.message = message;
  }
  return res.status(status).json(payload);
}

function errorResponse(res, message = "Terjadi kesalahan server", status = 500, details = null) {
  const payload = { success: false, message };
  if (details) {
    payload.details = details;
  }
  return res.status(status).json(payload);
}

module.exports = {
  success,
  errorResponse,
};
