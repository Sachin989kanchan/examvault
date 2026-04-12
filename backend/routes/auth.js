const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/register',
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('phone').optional().isMobilePhone(),
  validate, ctrl.register
);

router.post('/verify-email',
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  validate, ctrl.verifyEmail
);

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate, ctrl.login
);

router.post('/refresh', ctrl.refreshToken);
router.post('/logout', authenticate, ctrl.logout);

router.post('/forgot-password',
  body('email').isEmail().normalizeEmail(),
  validate, ctrl.forgotPassword
);

router.post('/reset-password',
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  body('newPassword').isLength({ min: 8 }),
  validate, ctrl.resetPassword
);

router.put('/change-password',
  authenticate,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
  validate, ctrl.changePassword
);

router.get('/profile', authenticate, ctrl.getProfile);

module.exports = router;
