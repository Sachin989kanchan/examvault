const { sendOTPEmail } = require('../utils/email');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendSuccess, sendError, auditLog } = require('../utils/helpers');
const cache = require('../utils/cache');

// Register
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return sendError(res, 'Email already registered', 409);
    }

    const hash = await bcrypt.hash(password, 12);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const [result] = await db.execute(
      'INSERT INTO users (name, email, phone, password_hash, otp_code, otp_expires) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, phone || null, hash, otp, otpExpires]
    );

    auditLog(result.insertId, 'USER_REGISTER', 'user', result.insertId, { email }, req);

    try {
      await sendOTPEmail(email, otp, 'verify');
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
    }

    return sendSuccess(res, { userId: result.insertId, email }, 'Registration successful. Please verify your email.', 201);
  } catch (err) {
    console.error('Register error:', err);
    return sendError(res, 'Registration failed', 500);
  }
};

// Verify Email OTP
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const [users] = await db.execute(
      'SELECT id, otp_code, otp_expires FROM users WHERE email = ?',
      [email]
    );

    if (!users.length) return sendError(res, 'User not found', 404);

    const user = users[0];
    const _a1 = Buffer.from(String(user.otp_code ?? '').padStart(6, '0'));
    const _b1 = Buffer.from(String(otp ?? '').padStart(6, '0'));
    if (_a1.length !== _b1.length || !require('crypto').timingSafeEqual(_a1, _b1))
      return sendError(res, 'Invalid OTP', 400);
    if (new Date() > new Date(user.otp_expires)) return sendError(res, 'OTP expired', 400);

    await db.execute(
      'UPDATE users SET is_email_verified = 1, otp_code = NULL, otp_expires = NULL WHERE id = ?',
      [user.id]
    );

    return sendSuccess(res, {}, 'Email verified successfully');
  } catch (err) {
    return sendError(res, 'Verification failed', 500);
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    //const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
<<<<<<< HEAD
    // const lockMinutes = parseInt(process.env.LOCK_TIME_MINUTES) || 3;
=======
   // const lockMinutes = parseInt(process.env.LOCK_TIME_MINUTES) || 3;
>>>>>>> 308797cb26ec2b1c1b5782e9865a862a2309da0e

    const [users] = await db.execute(
      'SELECT * FROM users WHERE email = ?', [email]
    );

    if (!users.length) return sendError(res, 'Invalid credentials', 401);


    const user = users[0];
<<<<<<< HEAD

    const isAdmin = user.role === 'super_admin' || user.role === 'admin';
    const maxAttempts = isAdmin ? 20 : (parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5);
    const lockMinutes = isAdmin ? 1 : (parseInt(process.env.LOCK_TIME_MINUTES) || 15);

=======
const isAdmin = user.role === 'admin';
const maxAttempts = isAdmin ? 20 : (parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5);
const lockMinutes = isAdmin ? 1 : (parseInt(process.env.LOCK_TIME_MINUTES) || 15);
>>>>>>> 308797cb26ec2b1c1b5782e9865a862a2309da0e
    // ✅ Bug Fix 1: Use explicit UTC comparison via getTime()
    const now = Date.now();
    const lockedUntil = user.locked_until ? new Date(user.locked_until).getTime() : null;

    // Still locked
    if (lockedUntil && now < lockedUntil) {
      const mins = Math.ceil((lockedUntil - now) / 60000);
      return sendError(res, `Account locked. Try again in ${mins} minute(s).`, 423);
    }

    // ✅ Bug Fix 2: Reset lock in DB AND re-fetch fresh user state
    if (lockedUntil && now >= lockedUntil) {
      await db.execute(
        'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?',
        [user.id]
      );
      // ✅ Update in-memory object to match DB
      user.login_attempts = 0;
      user.locked_until = null;
    }

    if (!user.is_active) return sendError(res, 'Account deactivated', 403);

    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      const attempts = (user.login_attempts || 0) + 1;

      if (attempts >= maxAttempts) {
        const lockUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
        await db.execute(
          'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?',
          [attempts, lockUntil, user.id]
        );
        return sendError(res, `Too many failed attempts. Account locked for ${lockMinutes} minute(s).`, 423);
      }

      await db.execute(
        'UPDATE users SET login_attempts = ? WHERE id = ?',
        [attempts, user.id]
      );
      return sendError(res, `Invalid credentials. ${maxAttempts - attempts} attempt(s) remaining.`, 401);
    }

    // ✅ Successful login — reset everything
    await db.execute(
      'UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?',
      [user.id]
    );

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await db.execute('UPDATE users SET refresh_token = ? WHERE id = ?', [refreshToken, user.id]);

    auditLog(user.id, 'USER_LOGIN', 'user', user.id, { email }, req);

    return sendSuccess(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url,
        is_email_verified: user.is_email_verified,
      }
    }, 'Login successful');

  } catch (err) {
    console.error('Login error:', err);
    return sendError(res, 'Login failed', 500);
  }
};

// Refresh Token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return sendError(res, 'Refresh token required', 401);

    const decoded = verifyRefreshToken(token);

    const [users] = await db.execute(
      'SELECT id, email, role, refresh_token, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!users.length || !users[0].is_active) return sendError(res, 'Invalid token', 401);
    if (users[0].refresh_token !== token) return sendError(res, 'Token mismatch', 401);

    const user = users[0];
    const payload = { id: user.id, email: user.email, role: user.role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    await db.execute('UPDATE users SET refresh_token = ? WHERE id = ?', [newRefreshToken, user.id]);

    return sendSuccess(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed');
  } catch (err) {
    return sendError(res, 'Invalid refresh token', 401);
  }
};

// Logout
const logout = async (req, res) => {
  try {
    await db.execute('UPDATE users SET refresh_token = NULL WHERE id = ?', [req.user.id]);
    auditLog(req.user.id, 'USER_LOGOUT', 'user', req.user.id, {}, req);
    cache.del(`profile:${req.user.id}`);

    return sendSuccess(res, {}, 'Logged out successfully');
  } catch (err) {
    return sendError(res, 'Logout failed', 500);
  }
};

// Forgot Password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const [users] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);

    if (!users.length) {
      return sendSuccess(res, {}, 'If an account exists with this email, an OTP has been sent.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await db.execute(
      'UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?',
      [otp, otpExpires, users[0].id]
    );

    try {
      await sendOTPEmail(email, otp, 'reset');
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
    }

    return sendSuccess(res, {}, 'OTP sent to your email address.');
  } catch (err) {
    return sendError(res, 'Failed to process request', 500);
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const [users] = await db.execute(
      'SELECT id, otp_code, otp_expires FROM users WHERE email = ?',
      [email]
    );

    if (!users.length) return sendError(res, 'Invalid request', 400);

    const user = users[0];
    const _a2 = Buffer.from(String(user.otp_code ?? '').padStart(6, '0'));
    const _b2 = Buffer.from(String(otp ?? '').padStart(6, '0'));
    if (_a2.length !== _b2.length || !require('crypto').timingSafeEqual(_a2, _b2))
      return sendError(res, 'Invalid OTP', 400);
    if (new Date() > new Date(user.otp_expires)) return sendError(res, 'OTP expired', 400);

    const hash = await bcrypt.hash(newPassword, 12);
    await db.execute(
      'UPDATE users SET password_hash = ?, otp_code = NULL, otp_expires = NULL, refresh_token = NULL WHERE id = ?',
      [hash, user.id]
    );

    auditLog(user.id, 'PASSWORD_RESET', 'user', user.id, {}, req);

    return sendSuccess(res, {}, 'Password reset successfully. Please login.');
  } catch (err) {
    return sendError(res, 'Password reset failed', 500);
  }
};

// Change Password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const [users] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!valid) return sendError(res, 'Current password is incorrect', 400);

    const hash = await bcrypt.hash(newPassword, 12);
    await db.execute(
      'UPDATE users SET password_hash = ?, refresh_token = NULL WHERE id = ?',
      [hash, req.user.id]
    );
    // ↓ add here — DB just changed, wipe stale cache
    cache.del(`profile:${req.user.id}`);
    auditLog(req.user.id, 'PASSWORD_CHANGE', 'user', req.user.id, {}, req);
    return sendSuccess(res, {}, 'Password changed successfully');
  } catch (err) {
    return sendError(res, 'Failed to change password', 500);
  }
};

// Get Profile
const getProfile = async (req, res) => {
  try {
    const cacheKey = `profile:${req.user.id}`;
    const hit = cache.get(cacheKey);
    if (hit) return sendSuccess(res, hit);
    const [users] = await db.execute(
      'SELECT id, name, email, phone, role, avatar_url, is_email_verified, last_login, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!users.length) return sendError(res, 'User not found', 404);

    const [stats] = await db.execute(
      `SELECT 
        COUNT(*) as total_attempts,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        AVG(CASE WHEN status = 'completed' THEN accuracy ELSE NULL END) as avg_accuracy,
        AVG(CASE WHEN status = 'completed' THEN score ELSE NULL END) as avg_score
       FROM attempts WHERE user_id = ?`,
      [req.user.id]
    );
    const payload = { ...users[0], stats: stats[0] };
    cache.set(cacheKey, payload, 60); // 1 min TTL
    return sendSuccess(res, payload); // ← use the same object
  } catch (err) {
    return sendError(res, 'Failed to get profile', 500);
  }
};

module.exports = {
  register, verifyEmail, login, refreshToken, logout,
  forgotPassword, resetPassword, changePassword, getProfile
};
