const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/testController');

router.post('/papers/:paperId/start', authenticate, ctrl.startAttempt);
router.post('/attempts/:attemptId/save', authenticate, ctrl.saveResponse);
router.post('/attempts/:attemptId/submit', authenticate, ctrl.submitAttempt);
router.get('/attempts/:attemptId/result', authenticate, ctrl.getResult);
router.get('/my/attempts', authenticate, ctrl.getUserAttempts);
router.get('/my/dashboard', authenticate, ctrl.getDashboardStats);

module.exports = router;
