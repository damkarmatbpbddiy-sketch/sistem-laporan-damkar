const { query } = require('../config/db');
const { success } = require('../utils/response');

async function getReports(req, res, next) {
  try {
    const statusFilter = req.query.status;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const params = [];
    let where = '';
    if (statusFilter) {
      where = 'WHERE r.status = ?';
      params.push(statusFilter);
    }

    const sql = `SELECT r.id,
                        r.title,
                        r.description,
                        r.image_url,
                        r.status,
                        r.created_at,
                        u.id AS user_id,
                        u.name AS user_name
                 FROM reports r
                 JOIN users u ON r.user_id = u.id
                 ${where}
                 ORDER BY r.created_at DESC
                 LIMIT ? OFFSET ?`;

    params.push(limit, offset);

    const result = await query(sql, params);
    return success(res, { reports: result.rows });
  } catch (error) {
    next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const sql = `SELECT status, COUNT(*) as count FROM reports GROUP BY status`;
    const result = await query(sql);
    const stats = { pending: 0, in_progress: 0, resolved: 0 };
    for (const row of result.rows) {
      stats[row.status] = Number(row.count) || 0;
    }
    return success(res, { stats });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getReports,
  getStats,
};
