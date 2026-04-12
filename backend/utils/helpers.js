const db = require('../config/db');

const sendSuccess = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, message = 'Error', statusCode = 400, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

const auditLog = async (userId, action, entityType = null, entityId = null, details = null, req = null) => {
  try {
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        action,
        entityType,
        entityId,
        details ? JSON.stringify(details) : null,
        req ? (req.ip || req.connection?.remoteAddress) : null,
        req ? req.headers['user-agent'] : null,
      ]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

const paginate = (query, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  return `${query} LIMIT ${limit} OFFSET ${offset}`;
};

const slugify = (text) => {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
};

module.exports = { sendSuccess, sendError, auditLog, paginate, slugify };
