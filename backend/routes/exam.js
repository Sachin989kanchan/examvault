const router = require('express').Router();
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const ctrl = require('../controllers/examController');

// ─── Public routes ────────────────────────────────────────────────────────────
router.get('/categories', ctrl.getCategories);
router.get('/categories/:slug', ctrl.getExamsByCategory);
router.get('/exams/:slug/papers', optionalAuth, ctrl.getPapersByExam);
router.get('/papers/:paperId', optionalAuth, ctrl.getPaperDetails);
router.get('/search', ctrl.searchExams);
router.get('/featured', ctrl.getFeaturedPapers);

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.post('/categories', authenticate, authorize('admin', 'super_admin'), ctrl.createCategory);
router.post('/exams', authenticate, authorize('admin', 'super_admin'), ctrl.createExam);
router.post('/papers', authenticate, authorize('admin', 'super_admin'), ctrl.createPaper);

router.get('/papers/:paperId/questions', authenticate, authorize('admin', 'super_admin'), ctrl.getQuestions);
router.post('/questions', authenticate, authorize('admin', 'super_admin'), ctrl.addQuestion);
router.put('/questions/:id', authenticate, authorize('admin', 'super_admin'), ctrl.updateQuestion);
router.delete('/questions/:id', authenticate, authorize('admin', 'super_admin'), ctrl.deleteQuestion);

// Admin user management
router.get('/admin/users', authenticate, authorize('admin', 'super_admin'), ctrl.getAllUsers);
router.patch('/admin/users/:id/toggle', authenticate, authorize('admin', 'super_admin'), ctrl.toggleUserStatus);
router.get('/admin/analytics', authenticate, authorize('admin', 'super_admin'), ctrl.getAdminAnalytics);
router.get('/admin/audit-logs', authenticate, authorize('super_admin'), ctrl.getAuditLogs);

// ─── NEW: Bulk upload questions via Excel ─────────────────────────────────────
// Placed AFTER all existing routes — zero changes to any route above this line.
const { upload, handleUploadError } = require('../middleware/upload');

router.post(
  '/admin/questions/bulk-upload',
  authenticate,
  authorize('admin', 'super_admin'),
  upload.single('file'),   // field name must be "file" in FormData
  ctrl.bulkUploadQuestions,
  handleUploadError        // catches multer / file-type errors cleanly
);

// ─── NEW: Manage routes ────────────────────────────────────────────────────────
// Appended below — all routes above are unchanged.

// Hard delete paper
router.delete('/papers/:id', authenticate, authorize('admin', 'super_admin'), ctrl.deletePaper);

// Rename exam
router.put('/exams/:id', authenticate, authorize('admin', 'super_admin'), ctrl.renameExam);

// Delete exam (papers cascade via FK ON DELETE CASCADE)
router.delete('/exams/:id', authenticate, authorize('admin', 'super_admin'), ctrl.deleteExam);

// Admin list all exams + all papers (for Manage tab)
router.get('/admin/exams', authenticate, authorize('admin', 'super_admin'), ctrl.getAllExams);
router.get('/admin/papers', authenticate, authorize('admin', 'super_admin'), ctrl.getAllPapers);

module.exports = router;
