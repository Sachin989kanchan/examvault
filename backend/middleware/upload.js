const multer = require('multer');
const { sendError } = require('../utils/helpers');

// Store file in memory — no disk writes; buffer is passed to parseExcel
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const isXlsx =
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.originalname.toLowerCase().endsWith('.xlsx');

  if (isXlsx) {
    cb(null, true);
  } else {
    cb(new Error('Only .xlsx files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB hard cap
    files: 1,
  },
});

/**
 * Express error handler for multer errors.
 * Mount AFTER the route handler so multer rejects surface cleanly.
 *
 * Usage:
 *   router.post('/...', upload.single('file'), ctrl.handler, handleUploadError);
 *
 * Or wrap at the router level:
 *   router.use(handleUploadError);
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 'File too large. Maximum size is 5 MB.', 400);
    }
    return sendError(res, `Upload error: ${err.message}`, 400);
  }
  if (err && err.message === 'Only .xlsx files are allowed') {
    return sendError(res, 'Only .xlsx files are accepted. Please upload a valid Excel file.', 415);
  }
  next(err);
};

module.exports = { upload, handleUploadError };
