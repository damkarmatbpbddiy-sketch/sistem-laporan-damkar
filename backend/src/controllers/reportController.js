const { saveReport, getAllReports, updateReport, deleteReport } = require("../services/reportService");
const { success, errorResponse } = require("../utils/response");

async function createReport(req, res, next) {
  try {
    const report = await saveReport({
      userId: req.user.id,
      title: req.body.title,
      location: req.body.location,
      description: req.body.description,
      file: req.file,
    });
    return success(res, { report }, "Laporan berhasil dibuat", 201);
  } catch (error) {
    if (error.status) {
      return errorResponse(res, error.message, error.status);
    }
    if (error.code === "LIMIT_FILE_SIZE") {
      return errorResponse(res, "Ukuran file terlalu besar, maksimal 5MB", 413);
    }
    if (error.message === "Format file tidak didukung") {
      return errorResponse(res, error.message, 400);
    }
    next(error);
  }
}

async function getReports(req, res, next) {
  try {
    const reports = await getAllReports();
    return success(res, { reports });
  } catch (error) {
    next(error);
  }
}

async function editReport(req, res, next) {
  try {
    const report = await updateReport({
      reportId: req.params.id,
      userId: req.user.id,
      role: req.user.role,
      title: req.body.title,
      location: req.body.location,
      description: req.body.description,
      status: req.body.status,
    });
    return success(res, { report }, "Laporan berhasil diperbarui");
  } catch (error) {
    if (error.status) {
      return errorResponse(res, error.message, error.status);
    }
    next(error);
  }
}

async function removeReport(req, res, next) {
  try {
    const result = await deleteReport({
      reportId: req.params.id,
      userId: req.user.id,
      role: req.user.role,
    });
    return success(res, result, "Laporan berhasil dihapus");
  } catch (error) {
    if (error.status) {
      return errorResponse(res, error.message, error.status);
    }
    next(error);
  }
}

module.exports = {
  createReport,
  getReports,
  editReport,
  removeReport,
};
