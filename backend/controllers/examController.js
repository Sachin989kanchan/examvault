const db = require('../config/db');
const { sendSuccess, sendError, slugify } = require('../utils/helpers');
const cache = require('../utils/cache');   // ← ADD THIS LINE

// Get all categories
const getCategories = async (req, res) => {
  try {
    // 1. Check cache first

    const cached = cache.get('categories');
    if (cached) return sendSuccess(res, cached);
    // 2. Cache miss → hit DB

    const [categories] = await db.execute(`
      SELECT c.*, COUNT(DISTINCT e.id) as exam_count
      FROM categories c
      LEFT JOIN exams e ON e.category_id = c.id AND e.is_active = 1
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `);
    // 3. Store in cache for 5 minutes (300 seconds)
    cache.set('categories', categories, 300);
    return sendSuccess(res, categories);

  } catch (err) {
    return sendError(res, 'Failed to fetch categories', 500);
  }
};

// Get exams by category
const getExamsByCategory = async (req, res) => {
  try {
    const { slug } = req.params;

    const [categories] = await db.execute(
      'SELECT * FROM categories WHERE slug = ? AND is_active = 1',
      [slug]
    );
    if (!categories.length) return sendError(res, 'Category not found', 404);

    const [exams] = await db.execute(`
      SELECT e.*, 
        COUNT(DISTINCT p.id) as paper_count,
        c.name as category_name,
        c.slug as category_slug,
        c.icon as category_icon
      FROM exams e
      LEFT JOIN papers p ON p.exam_id = e.id AND p.is_active = 1
      JOIN categories c ON c.id = e.category_id
      WHERE e.category_id = ? AND e.is_active = 1
      GROUP BY e.id
      ORDER BY e.name ASC
    `, [categories[0].id]);

    return sendSuccess(res, { category: categories[0], exams });
  } catch (err) {
    console.error('getFeaturedPapers error:', err); // ← ADD THIS

    return sendError(res, 'Failed to fetch exams', 500);
  }
};

// Get papers by exam
const getPapersByExam = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;

    const [exams] = await db.execute(
      `SELECT e.*, c.name as category_name, c.slug as category_slug
       FROM exams e JOIN categories c ON c.id = e.category_id
       WHERE e.slug = ? AND e.is_active = 1`,
      [slug]
    );
    if (!exams.length) return sendError(res, 'Exam not found', 404);

    const [papers] = await db.execute(`
      SELECT p.*,
        COUNT(DISTINCT q.id) as question_count
      FROM papers p
      LEFT JOIN questions q ON q.paper_id = p.id
      WHERE p.exam_id = ? AND p.is_active = 1
      GROUP BY p.id
      ORDER BY p.year DESC, p.title ASC
    `, [exams[0].id]);

    // PERF FIX: Replace the per-paper query loop (2 queries × N papers) with
    // 2 bulk queries total, regardless of how many papers exist.
    if (userId && papers.length > 0) {
      const paperIds = papers.map(p => p.id);
      const placeholders = paperIds.map(() => '?').join(', ');

      // Single query: last attempt per paper for this user
      const [lastAttempts] = await db.execute(
        `SELECT a.paper_id, a.id, a.status, a.score, a.accuracy, a.submitted_at
         FROM attempts a
         INNER JOIN (
           SELECT paper_id, MAX(created_at) as max_created
           FROM attempts WHERE user_id = ? AND paper_id IN (${placeholders})
           GROUP BY paper_id
         ) latest ON a.paper_id = latest.paper_id AND a.created_at = latest.max_created
         WHERE a.user_id = ?`,
        [userId, ...paperIds, userId]
      );

      // Single query: attempt counts per paper for this user
      const [counts] = await db.execute(
        `SELECT paper_id, COUNT(*) as cnt FROM attempts WHERE user_id = ? AND paper_id IN (${placeholders}) GROUP BY paper_id`,
        [userId, ...paperIds]
      );

      const lastAttemptMap = {};
      lastAttempts.forEach(a => { lastAttemptMap[a.paper_id] = a; });
      const countMap = {};
      counts.forEach(c => { countMap[c.paper_id] = c.cnt; });

      papers.forEach(paper => {
        paper.last_attempt = lastAttemptMap[paper.id] || null;
        paper.attempt_count = countMap[paper.id] || 0;
      });
    }

    return sendSuccess(res, { exam: exams[0], papers });
  } catch (err) {
    return sendError(res, 'Failed to fetch papers', 500);
  }
};

// Get paper details// routes/exam.js has:  /papers/:paperId  ← number ID
// frontend api.js has: getPaperDetails: (id) => api.get(`/papers/${id}`)  ← passes ID

const getPaperDetails = async (req, res) => {
  try {
    const { paperId } = req.params;                  // ← back to paperId
    const cacheKey = `paper:${paperId}`;             // ← cache key uses id

    const cached = cache.get(cacheKey);
    if (cached) return sendSuccess(res, cached);

    const [papers] = await db.execute(`
      SELECT p.*, e.name as exam_name, e.slug as exam_slug,
        c.name as category_name, c.slug as category_slug
      FROM papers p
      JOIN exams e ON e.id = p.exam_id
      JOIN categories c ON c.id = e.category_id
      WHERE p.id = ? AND p.is_active = 1           
    `, [paperId]);                                   // ← WHERE p.id

    if (!papers.length) return sendError(res, 'Paper not found', 404);

    const [sections] = await db.execute(
      'SELECT * FROM sections WHERE paper_id = ? ORDER BY sort_order ASC',
      [paperId]                                      // ← paperId
    );

    const result = { paper: papers[0], sections };
    cache.set(cacheKey, result, 180);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, 'Failed to fetch paper details', 500);
  }
};

// Search exams
const searchExams = async (req, res) => {
  try {
    const { q, category, difficulty, page = 1, limit = 20 } = req.query;
    const safeLimit = Number(Math.min(Math.max(parseInt(limit) || 20, 1), 100));
    const safePage = Number(Math.max(parseInt(page) || 1, 1));
    const safeOffset = Number((safePage - 1) * safeLimit);

    let conditions = ['p.is_active = 1', 'e.is_active = 1'];
    const params = [];

    if (q) {
      conditions.push('(p.title LIKE ? OR e.name LIKE ? OR c.name LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (category) {
      conditions.push('c.slug = ?');
      params.push(category);
    }
    if (difficulty) {
      conditions.push('p.difficulty = ?');
      params.push(difficulty);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [papers] = await db.query(`
      SELECT p.id, p.title, p.difficulty, p.duration_minutes, p.total_questions,
        p.total_marks, p.year, p.is_free,
        e.name as exam_name, e.slug as exam_slug,
        c.name as category_name, c.slug as category_slug, c.icon as category_icon
      FROM papers p
      JOIN exams e ON e.id = p.exam_id
      JOIN categories c ON c.id = e.category_id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, safeLimit, safeOffset]);

    const [total] = await db.query(`
      SELECT COUNT(*) as cnt
      FROM papers p JOIN exams e ON e.id = p.exam_id JOIN categories c ON c.id = e.category_id
      ${where}
    `, params);

    return sendSuccess(res, {
      papers,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: total[0].cnt,
        pages: Math.ceil(total[0].cnt / safeLimit),
      }
    });
  } catch (err) {
    console.error(err);
    return sendError(res, 'Search failed', 500);
  }
};

// Get popular/featured papers
const getFeaturedPapers = async (req, res) => {
  try {
    // cache for getfeatured papers
    const cached = cache.get('featured_papers');
    if (cached) return sendSuccess(res, cached);

    const [papers] = await db.execute(`
      SELECT p.id, p.title, p.difficulty, p.duration_minutes, p.total_questions,
        p.total_marks, p.year, p.is_free,
        e.name as exam_name, e.slug as exam_slug,
        c.name as category_name, c.slug as category_slug, c.icon as category_icon,
        COUNT(a.id) as attempt_count
      FROM papers p
      JOIN exams e ON e.id = p.exam_id
      JOIN categories c ON c.id = e.category_id
      LEFT JOIN attempts a ON a.paper_id = p.id
      WHERE p.is_active = 1 AND e.is_active = 1
      GROUP BY p.id
      ORDER BY attempt_count DESC, p.created_at DESC
      LIMIT 8
    `);
    cache.set('featured_papers', papers, 120); // 2 minutes

    return sendSuccess(res, papers);
  } catch (err) {
    return sendError(res, 'Failed to fetch featured papers', 500);
  }
};

// ADMIN: Create category
const createCategory = async (req, res) => {
  try {
    const { name, description, icon, color } = req.body;
    const slug = slugify(name);

    const [existing] = await db.execute('SELECT id FROM categories WHERE slug = ?', [slug]);
    if (existing.length) return sendError(res, 'Category with this name already exists', 409);

    const [result] = await db.execute(
      'INSERT INTO categories (name, slug, description, icon, color) VALUES (?, ?, ?, ?, ?)',
      [name, slug, description, icon, color]
    );
    cache.del('categories');  // ✅ bust so next GET refetches fresh

    return sendSuccess(res, { id: result.insertId }, 'Category created', 201);
  } catch (err) {
    return sendError(res, 'Failed to create category', 500);
  }
};

// ADMIN: Create exam
const createExam = async (req, res) => {
  try {
    const { category_id, name, description, difficulty } = req.body;
    const slug = slugify(name);

    const [result] = await db.execute(
      'INSERT INTO exams (category_id, name, slug, description, difficulty, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [category_id, name, slug, description, difficulty || 'medium', req.user.id]
    );
    cache.del('categories');        // creating exam changes exam_count in categories

    return sendSuccess(res, { id: result.insertId }, 'Exam created', 201);
  } catch (err) {
    return sendError(res, 'Failed to create exam', 500);
  }
};

// ADMIN: Create paper  
const createPaper = async (req, res) => {
  try {
    const {
      exam_id, title, description, duration_minutes, total_marks,
      passing_marks, marks_per_question, negative_marks, difficulty,
      shuffle_questions, shuffle_options, attempt_limit, allow_reattempt,
      section_locking, is_free, year, sections
    } = req.body;

    const [result] = await db.execute(`
      INSERT INTO papers (exam_id, title, description, duration_minutes, total_marks,
        passing_marks, marks_per_question, negative_marks, difficulty,
        shuffle_questions, shuffle_options, attempt_limit, allow_reattempt,
        section_locking, is_free, year, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      exam_id, title, description || null, duration_minutes, total_marks,
      passing_marks || 40, marks_per_question || 1, negative_marks || 0.25, difficulty || 'medium',
      shuffle_questions ? 1 : 0, shuffle_options ? 1 : 0,
      attempt_limit || 1, allow_reattempt ? 1 : 0,
      section_locking ? 1 : 0, is_free !== false ? 1 : 0, year || null, req.user.id
    ]);

    const paperId = result.insertId;

    // Create sections if provided
    if (sections && Array.isArray(sections)) {
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        await db.execute(
          'INSERT INTO sections (paper_id, name, duration_minutes, total_questions, marks_per_question, negative_marks, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [paperId, sec.name, sec.duration_minutes || null, sec.total_questions || 0, sec.marks_per_question || 1, sec.negative_marks || 0.25, i]
        );
      }
    }
    cache.del('featured_papers');
    cache.flush('paper:');
    return sendSuccess(res, { id: paperId }, 'Paper created', 201);
  } catch (err) {
    console.error(err);
    return sendError(res, 'Failed to create paper', 500);
  }
};

// ADMIN: Add question
const addQuestion = async (req, res) => {
  try {
    const {
      paper_id, section_id, question_text, option_a, option_b, option_c, option_d,
      correct_option, explanation, difficulty, topic
    } = req.body;

    const [result] = await db.execute(`
      INSERT INTO questions (paper_id, section_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, topic)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [paper_id, section_id || null, question_text, option_a, option_b, option_c, option_d, correct_option, explanation || null, difficulty || 'medium', topic || null]);

    await db.execute(
      'UPDATE papers SET total_questions = (SELECT COUNT(*) FROM questions WHERE paper_id = ?) WHERE id = ?',
      [paper_id, paper_id]
    );

    return sendSuccess(res, { id: result.insertId }, 'Question added', 201);
  } catch (err) {
    return sendError(res, 'Failed to add question', 500);
  }
};

// ADMIN: Update question
const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, topic } = req.body;

    await db.execute(`
      UPDATE questions SET question_text=?, option_a=?, option_b=?, option_c=?, option_d=?,
        correct_option=?, explanation=?, difficulty=?, topic=?
      WHERE id=?
    `, [question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, topic, id]);

    return sendSuccess(res, {}, 'Question updated');
  } catch (err) {
    return sendError(res, 'Failed to update question', 500);
  }
};

// ADMIN: Delete question
const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const [q] = await db.execute('SELECT paper_id FROM questions WHERE id = ?', [id]);
    await db.execute('DELETE FROM questions WHERE id = ?', [id]);
    if (q.length) {
      await db.execute(
        'UPDATE papers SET total_questions = (SELECT COUNT(*) FROM questions WHERE paper_id = ?) WHERE id = ?',
        [q[0].paper_id, q[0].paper_id]
      );
    }
    return sendSuccess(res, {}, 'Question deleted');
  } catch (err) {
    return sendError(res, 'Failed to delete question', 500);
  }
};

// Get questions for a paper (admin)
const getQuestions = async (req, res) => {
  try {
    const { paperId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const safeOffset = (safePage - 1) * safeLimit;

    const [questions] = await db.execute(`
      SELECT q.*, s.name as section_name
      FROM questions q
      LEFT JOIN sections s ON s.id = q.section_id
      WHERE q.paper_id = ?
      ORDER BY q.section_id ASC, q.sort_order ASC
      LIMIT ? OFFSET ?
    `, [paperId, safeLimit, safeOffset]);

    const [total] = await db.execute('SELECT COUNT(*) as cnt FROM questions WHERE paper_id = ?', [paperId]);

    return sendSuccess(res, { questions, total: total[0].cnt });
  } catch (err) {
    return sendError(res, 'Failed to fetch questions', 500);
  }
};

// ADMIN: Get all users
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const safeLimit = Number(Math.min(Math.max(parseInt(limit) || 20, 1), 100));
    const safePage = Number(Math.max(parseInt(page) || 1, 1));
    const safeOffset = Number((safePage - 1) * safeLimit);

    let where = 'WHERE 1=1';
    const params = [];
    if (search) {
      where += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [users] = await db.query(`
      SELECT id, name, email, phone, role, is_active, is_email_verified, last_login, created_at
      FROM users ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, safeLimit, safeOffset]);

    const [total] = await db.query(`SELECT COUNT(*) as cnt FROM users ${where}`, params);

    return sendSuccess(res, { users, total: total[0].cnt });
  } catch (err) {
    return sendError(res, 'Failed to fetch users', 500);
  }
};

// ADMIN: Toggle user status
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE users SET is_active = NOT is_active WHERE id = ?', [id]);
    return sendSuccess(res, {}, 'User status updated');
  } catch (err) {
    return sendError(res, 'Failed to update user', 500);
  }
};

// ADMIN: Analytics dashboard
const getAdminAnalytics = async (req, res) => {
  try {
    const [[users]] = await db.execute('SELECT COUNT(*) as total, SUM(is_active) as active FROM users WHERE role = "student"');
    const [[exams]] = await db.execute('SELECT COUNT(*) as total FROM exams WHERE is_active = 1');
    const [[papers]] = await db.execute('SELECT COUNT(*) as total FROM papers WHERE is_active = 1');
    const [[attempts]] = await db.execute('SELECT COUNT(*) as total, COUNT(CASE WHEN status="completed" THEN 1 END) as completed FROM attempts');

    const [recentAttempts] = await db.execute(`
      SELECT a.id, a.status, a.score, a.accuracy, a.submitted_at,
        u.name as user_name, p.title as paper_title
      FROM attempts a
      JOIN users u ON u.id = a.user_id
      JOIN papers p ON p.id = a.paper_id
      ORDER BY a.created_at DESC
      LIMIT 10
    `);

    const [topPapers] = await db.execute(`
      SELECT p.title, COUNT(a.id) as attempt_count, AVG(a.score) as avg_score
      FROM papers p
      LEFT JOIN attempts a ON a.paper_id = p.id
      WHERE p.is_active = 1
      GROUP BY p.id
      ORDER BY attempt_count DESC
      LIMIT 5
    `);

    return sendSuccess(res, {
      summary: { users, exams, papers, attempts },
      recentAttempts,
      topPapers,
    });
  } catch (err) {
    return sendError(res, 'Failed to fetch analytics', 500);
  }
};

// Get audit logs
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const safeOffset = (safePage - 1) * safeLimit;

    const [logs] = await db.execute(`
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `, [safeLimit, safeOffset]);

    return sendSuccess(res, logs);
  } catch (err) {
    return sendError(res, 'Failed to fetch logs', 500);
  }
};

// ─── NEW: Bulk upload questions via Excel ─────────────────────────────────────
// Appended below — all functions above are unchanged.
const { parseExcel } = require('../utils/parseExcel');

const bulkUploadQuestions = async (req, res) => {
  // Multer error handler runs after this if multer itself failed,
  // but if multer succeeded and no file was attached:
  if (!req.file) {
    return sendError(res, 'No file uploaded. Please attach an .xlsx file with field name "file".', 400);
  }

  // ── paper_id from UI dropdown (sent as form field alongside the file) ───────
  const paperIdOverride = req.body.paper_id ? parseInt(req.body.paper_id, 10) : null;

  // ── Parse Excel ─────────────────────────────────────────────────────────────
  let parsed;
  try {
    parsed = parseExcel(req.file.buffer, paperIdOverride);
  } catch (parseErr) {
    return sendError(res, `Failed to parse Excel file: ${parseErr.message}`, 422);
  }

  const { totalRows, valid, errors } = parsed;

  if (totalRows === 0) {
    return sendError(res, 'The uploaded file has no data rows. Please check your Excel template.', 422);
  }

  // If every row failed validation, return immediately — no DB call needed
  if (valid.length === 0) {
    return sendSuccess(res, {
      totalRows,
      inserted: 0,
      failed: errors.length,
      errors,
    }, 'No valid rows found. Please fix the errors and re-upload.');
  }

  // ── Batch insert inside a transaction ────────────────────────────────────────
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Build a single multi-row INSERT for all valid questions.
    // Using conn.query() (not execute()) because the placeholder
    // count is dynamic and server-side prepared statements do not
    // support this pattern reliably in all MySQL versions.
    const placeholders = valid.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const values = valid.flatMap((q) => [
      q.paper_id,
      q.section_id,
      q.question_text,
      q.option_a,
      q.option_b,
      q.option_c,
      q.option_d,
      q.correct_option,
      q.explanation,
      q.difficulty,
      q.topic,
    ]);

    await conn.query(
      `INSERT INTO questions
         (paper_id, section_id, question_text, option_a, option_b, option_c, option_d,
          correct_option, explanation, difficulty, topic)
       VALUES ${placeholders}`,
      values
    );

    // Re-sync total_questions counter for every paper that was touched
    const affectedPaperIds = [...new Set(valid.map((q) => q.paper_id))];
    for (const paperId of affectedPaperIds) {
      await conn.execute(
        'UPDATE papers SET total_questions = (SELECT COUNT(*) FROM questions WHERE paper_id = ?) WHERE id = ?',
        [paperId, paperId]
      );
    }

    await conn.commit();

    return sendSuccess(
      res,
      { totalRows, inserted: valid.length, failed: errors.length, errors },
      `Successfully inserted ${valid.length} question(s)`,
      201
    );
  } catch (dbErr) {
    await conn.rollback();
    console.error('Bulk upload DB error:', dbErr);
    return sendError(res, 'Database error during bulk insert. All rows have been rolled back.', 500);
  } finally {
    conn.release();
  }
};

// ─── ADMIN: Hard delete paper ──────────────────────────────────────────────────
const deletePaper = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return sendError(res, 'Invalid paper ID', 400);

    const [existing] = await db.execute('SELECT id FROM papers WHERE id = ?', [id]);
    if (!existing.length) return sendError(res, 'Paper not found', 404);

    await db.execute('DELETE FROM papers WHERE id = ?', [id]);
    cache.del('featured_papers');   // ← ADD THESE TWO before line 595
    cache.flush('paper:');

    return sendSuccess(res, {}, 'Paper deleted successfully');
  } catch (err) {
    console.error(err);
    return sendError(res, 'Failed to delete paper', 500);
  }
};

// ─── ADMIN: Rename exam (update name + slug) ───────────────────────────────────
const renameExam = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return sendError(res, 'Invalid exam ID', 400);

    const { name } = req.body;
    if (!name || !name.trim()) return sendError(res, 'Name is required', 400);

    const [existing] = await db.execute('SELECT id FROM exams WHERE id = ?', [id]);
    if (!existing.length) return sendError(res, 'Exam not found', 404);

    let slug = slugify(name.trim());

    // Ensure slug is unique (exclude current record)
    const [slugConflict] = await db.execute(
      'SELECT id FROM exams WHERE slug = ? AND id != ?',
      [slug, id]
    );
    if (slugConflict.length) {
      slug = `${slug}-${Date.now()}`;
    }

    await db.execute(
      'UPDATE exams SET name = ?, slug = ?, updated_at = NOW() WHERE id = ?',
      [name.trim(), slug, id]
    );
    cache.del('categories');    // ← ADD HERE (exam name changed)
    cache.flush('paper:');      // ← paper details embed exam name
    return sendSuccess(res, { id, name: name.trim(), slug }, 'Exam updated successfully');
  } catch (err) {
    console.error(err);
    return sendError(res, 'Failed to update exam', 500);
  }
};

// ─── ADMIN: Delete exam (papers cascade via FK) ───────────────────────────────
const deleteExam = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return sendError(res, 'Invalid exam ID', 400);

    const [existing] = await db.execute('SELECT id, name FROM exams WHERE id = ?', [id]);
    if (!existing.length) return sendError(res, 'Exam not found', 404);

    await db.execute('DELETE FROM exams WHERE id = ?', [id]);
    cache.del('categories');    // ← ADD THESE before line 647
    cache.flush('paper:');
    return sendSuccess(res, {}, `Exam "${existing[0].name}" deleted successfully`);
  } catch (err) {
    console.error(err);
    return sendError(res, 'Failed to delete exam', 500);
  }
};

// ─── ADMIN: Get all exams (with paper count) ───────────────────────────────────
const getAllExams = async (req, res) => {
  try {
    const { category_id, search } = req.query;
    let conditions = [];
    const params = [];

    if (category_id) {
      conditions.push('e.category_id = ?');
      params.push(parseInt(category_id, 10));
    }
    if (search) {
      conditions.push('e.name LIKE ?');
      params.push(`%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [exams] = await db.query(`
      SELECT e.id, e.name, e.slug, e.difficulty, e.is_active, e.created_at,
        c.name as category_name,
        COUNT(DISTINCT p.id) as paper_count
      FROM exams e
      JOIN categories c ON c.id = e.category_id
      LEFT JOIN papers p ON p.exam_id = e.id
      ${where}
      GROUP BY e.id
      ORDER BY c.name ASC, e.name ASC
    `, params);

    return sendSuccess(res, exams);
  } catch (err) {
    console.error(err);
    return sendError(res, 'Failed to fetch exams', 500);
  }
};

// ─── ADMIN: Get all papers (with exam + category) ─────────────────────────────
const getAllPapers = async (req, res) => {
  try {
    const { exam_id, search, page = 1, limit = 30 } = req.query;
    const safeLimit = Number(Math.min(Math.max(parseInt(limit) || 30, 1), 100));
    const safePage = Number(Math.max(parseInt(page) || 1, 1));
    const safeOffset = Number((safePage - 1) * safeLimit);

    let conditions = [];
    const params = [];

    if (exam_id) {
      conditions.push('p.exam_id = ?');
      params.push(parseInt(exam_id, 10));
    }
    if (search) {
      conditions.push('p.title LIKE ?');
      params.push(`%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [papers] = await db.query(`
      SELECT p.id, p.title, p.year, p.difficulty, p.total_questions,
        p.duration_minutes, p.is_free, p.is_active, p.created_at,
        e.name as exam_name, e.id as exam_id,
        c.name as category_name
      FROM papers p
      JOIN exams e ON e.id = p.exam_id
      JOIN categories c ON c.id = e.category_id
      ${where}
      ORDER BY c.name ASC, e.name ASC, p.title ASC
      LIMIT ? OFFSET ?
    `, [...params, safeLimit, safeOffset]);

    const [total] = await db.query(`
      SELECT COUNT(*) as cnt FROM papers p
      JOIN exams e ON e.id = p.exam_id
      JOIN categories c ON c.id = e.category_id
      ${where}
    `, params);

    return sendSuccess(res, { papers, total: total[0].cnt });
  } catch (err) {
    console.error(err);
    return sendError(res, 'Failed to fetch papers', 500);
  }
};

module.exports = {
  getCategories, getExamsByCategory, getPapersByExam, getPaperDetails,
  searchExams, getFeaturedPapers,
  createCategory, createExam, createPaper,
  addQuestion, updateQuestion, deleteQuestion, getQuestions,
  getAllUsers, toggleUserStatus, getAdminAnalytics, getAuditLogs,
  bulkUploadQuestions,
  // ── New manage endpoints ──
  deletePaper, renameExam, deleteExam, getAllExams, getAllPapers,
};
