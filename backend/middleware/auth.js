const { verifyAccessToken } = require('../utils/jwt');
const { sendError } = require('../utils/helpers');
const db = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Access token required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const cache = require('../utils/cache');
    const _cacheKey = `auth:${decoded.id}`;
    let _userData = cache.get(_cacheKey);
    if (!_userData) {
      const [users] = await db.execute(
        'SELECT id, name, email, role, is_active FROM users WHERE id = ?',
        [decoded.id]
      );
      if (!users.length || !users[0].is_active)
        return sendError(res, 'Account not found or deactivated', 401);
      _userData = users[0];
      cache.set(_cacheKey, _userData, 60);
    }
    if (!_userData.is_active)
      return sendError(res, 'Account not found or deactivated', 401);
    req.user = _userData;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Access token expired', 401);
    }
    return sendError(res, 'Invalid access token', 401);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Insufficient permissions', 403);
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      const cache = require('../utils/cache');
      const _optKey = `auth:${decoded.id}`;
      let _optUser = cache.get(_optKey);
      if (!_optUser) {
        const [users] = await db.execute(
          'SELECT id, name, email, role, is_active FROM users WHERE id = ?',
          [decoded.id]
        );
        if (users.length && users[0].is_active) {
          _optUser = users[0];
          cache.set(_optKey, _optUser, 60);
        }
      }
      if (_optUser && _optUser.is_active) req.user = _optUser;
    }
  } catch (err) {
    // Continue without auth
  }
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
