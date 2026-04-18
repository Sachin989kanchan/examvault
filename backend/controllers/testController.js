/*
=== REQUIRED MySQL INDEXES FOR 10M USERS — Run these manually ===
CREATE INDEX idx_attempts_user_paper   ON attempts(user_id, paper_id, status);
CREATE INDEX idx_attempts_paper_score  ON attempts(paper_id, status, score);
CREATE INDEX idx_attempts_user_status  ON attempts(user_id, status, created_at);
CREATE INDEX idx_responses_attempt     ON responses(attempt_id);
CREATE INDEX idx_questions_paper       ON questions(paper_id, section_id, sort_order);
CREATE INDEX idx_papers_exam           ON papers(exam_id, is_active);
CREATE INDEX idx_exams_category        ON exams(category_id, is_active);
CREATE INDEX idx_users_email           ON users(email);
CREATE INDEX idx_audit_logs_user       ON audit_logs(user_id, created_at);
CREATE INDEX idx_otps_email_expires    ON users(email, otp_expires);
*/
const db = require('../config/db');
const { sendSuccess, sendError, auditLog } = require('../utils/helpers');

// Start or resume a test attempt
const startAttempt = async (req, res) => {
  try {
    const { paperId } = req.params;
    const userId = req.user.id;

    // Get paper
    const [papers] = await db.execute(
      'SELECT * FROM papers WHERE id = ? AND is_active = 1',
      [paperId]
    );
    if (!papers.length) return sendError(res, 'Paper not found', 404);

    const paper = papers[0];

    // Check for in-progress attempt to resume
    const [inProgress] = await db.execute(
      'SELECT * FROM attempts WHERE user_id = ? AND paper_id = ? AND status IN ("started", "in_progress") ORDER BY created_at DESC LIMIT 1',
      [userId, paperId]
    );

    if (inProgress.length) {
      const attempt = inProgress[0];

      // FIX: Calculate remaining time FIRST before deciding to resume.
      // If the old attempt has expired (browser crash, abandoned tab, etc.),
      // mark it as timed_out and fall through to create a fresh attempt with
      // full time. Without this check, a stuck old session causes the timer to
      // show e.g. 06:30 instead of 60:00 on the very next exam start.
      const remainingSeconds = calculateTimeRemaining(attempt.started_at, paper.duration_minutes);

      if (remainingSeconds <= 0) {
        // Stale/expired attempt — close it out and create a new one below
        await db.execute(
          'UPDATE attempts SET status = "timed_out", submitted_at = NOW() WHERE id = ?',
          [attempt.id]
        );
        // intentional fall-through: no return here, execution continues to create a new attempt
      } else {
        // Valid in-progress session — resume it normally
        // Always ensure the attempt is promoted to 'in_progress'
        // (it may still be 'started' if a previous session crashed mid-setup,
        // or due to concurrent startAttempt calls in React StrictMode)
        if (attempt.status === 'started') {
          await db.execute('UPDATE attempts SET status = "in_progress" WHERE id = ?', [attempt.id]);
          attempt.status = 'in_progress';
        }

        // Get questions based on paper config
        const questions = await getQuestionsForAttempt(paperId, paper, attempt.id, userId);

        return sendSuccess(res, {
          attempt: {
            id: attempt.id,
            status: attempt.status,
            started_at: attempt.started_at,
            time_remaining: remainingSeconds, // reuse already-computed value
          },
          paper: {
            id: paper.id,
            title: paper.title,
            duration_minutes: paper.duration_minutes,
            total_questions: paper.total_questions,
            marks_per_question: paper.marks_per_question,
            negative_marks: paper.negative_marks,
            section_locking: paper.section_locking,
          },
          questions,
          is_resumed: true,
        });
      }
    }

    // Check attempt limit
    const [prevAttempts] = await db.execute(
      'SELECT COUNT(*) as cnt FROM attempts WHERE user_id = ? AND paper_id = ? AND status IN ("completed", "timed_out")',
      [userId, paperId]
    );

    if (paper.attempt_limit > 0 && prevAttempts[0].cnt >= paper.attempt_limit && !paper.allow_reattempt) {
      return sendError(res, `You have already attempted this paper ${paper.attempt_limit} time(s).`, 403);
    }

    // FIX: Capture start time once BEFORE the INSERT so the DB row and the API
    // response share the exact same timestamp. The old code relied on MySQL's
    // DEFAULT CURRENT_TIMESTAMP (set at INSERT time) but returned `new Date()`
    // in the response — which fired several seconds later after questions and
    // responses were inserted. On any page refresh the backend re-derives
    // time_remaining from the DB timestamp, so they must match to avoid drift.
    const attemptStartedAt = new Date();

    // Create new attempt
    const [result] = await db.execute(
      'INSERT INTO attempts (user_id, paper_id, status, total_marks, started_at) VALUES (?, ?, "started", ?, ?)',
      [userId, paperId, paper.total_marks, attemptStartedAt]
    );

    const attemptId = result.insertId;

    // Get questions
    const questions = await getQuestionsForAttempt(paperId, paper, attemptId, userId);

    // PERF FIX: Single bulk INSERT instead of one query per question.
    // Old code: 105 questions = 105 round-trips to MySQL.
    // New code: always 1 round-trip regardless of question count.
    const allQsFlat = questions[0]?.questions
      ? questions.flatMap(s => s.questions)  // sectioned paper
      : questions;                            // flat paper
    if (allQsFlat.length > 0) {
      const placeholders = allQsFlat.map(() => '(?, ?)').join(', ');
      const values = allQsFlat.flatMap(q => [attemptId, q.id]);
      await db.execute(
        `INSERT IGNORE INTO responses (attempt_id, question_id) VALUES ${placeholders}`,
        values
      );
    }

    await db.execute('UPDATE attempts SET status = "in_progress" WHERE id = ?', [attemptId]);

    auditLog(userId, 'TEST_START', 'attempt', attemptId, { paperId }, req);

    return sendSuccess(res, {
      attempt: {
        id: attemptId,
        status: 'in_progress',
        started_at: attemptStartedAt, // same value stored in DB — prevents timer drift on refresh
        time_remaining: paper.duration_minutes * 60,
      },
      paper: {
        id: paper.id,
        title: paper.title,
        duration_minutes: paper.duration_minutes,
        total_questions: paper.total_questions,
        marks_per_question: paper.marks_per_question,
        negative_marks: paper.negative_marks,
        section_locking: paper.section_locking,
      },
      questions,
      is_resumed: false,
    }, 'Test started');
  } catch (err) {
    console.error('Start attempt error:', err);
    return sendError(res, 'Failed to start test', 500);
  }
};

const getQuestionsForAttempt = async (paperId, paper, attemptId, userId) => {
  const [sections] = await db.execute(
    'SELECT * FROM sections WHERE paper_id = ? ORDER BY sort_order ASC',
    [paperId]
  );

  let questions;
  if (sections.length > 0) {
    questions = [];
    for (const section of sections) {
      let [sectionQs] = await db.execute(
        'SELECT id, question_text, option_a, option_b, option_c, option_d, option_e, section_id, sort_order FROM questions WHERE paper_id = ? AND section_id = ? ORDER BY sort_order ASC',
        [paperId, section.id]
      );

      if (paper.shuffle_questions) {
        sectionQs = shuffleArray(sectionQs);
      }
      if (paper.shuffle_options) {
        sectionQs = sectionQs.map(q => shuffleOptions(q));
      }

      questions.push({
        section_id: section.id,
        section_name: section.name,
        duration_minutes: section.duration_minutes,
        questions: sectionQs,
      });
    }
  } else {
    let [qs] = await db.execute(
      'SELECT id, question_text, option_a, option_b, option_c, option_d, option_e, section_id, sort_order FROM questions WHERE paper_id = ? ORDER BY sort_order ASC',
      [paperId]
    );

    if (paper.shuffle_questions) qs = shuffleArray(qs);
    if (paper.shuffle_options) qs = qs.map(q => shuffleOptions(q));

    questions = qs;
  }

  // Get existing responses for this attempt
  const [responses] = await db.execute(
    'SELECT question_id, selected_option, is_marked_review FROM responses WHERE attempt_id = ?',
    [attemptId]
  );

  const responseMap = {};
  responses.forEach(r => { responseMap[r.question_id] = r; });

  // Attach responses
  if (sections.length > 0) {
    questions.forEach(sec => {
      sec.questions.forEach(q => {
        q.selected_option = responseMap[q.id]?.selected_option || null;
        q.is_marked_review = responseMap[q.id]?.is_marked_review || false;
      });
    });
  } else {
    questions.forEach(q => {
      q.selected_option = responseMap[q.id]?.selected_option || null;
      q.is_marked_review = responseMap[q.id]?.is_marked_review || false;
    });
  }

  return questions;
};

const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const shuffleOptions = (q) => {
  // Build option list — include option_e only if it exists on this question
  const options = [
    { key: 'a', val: q.option_a },
    { key: 'b', val: q.option_b },
    { key: 'c', val: q.option_c },
    { key: 'd', val: q.option_d },
    ...(q.option_e ? [{ key: 'e', val: q.option_e }] : []),
  ];

  // Fisher-Yates shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  // Find the new position of the correct answer by original key
  const allKeys = ['a', 'b', 'c', 'd', 'e'];
  const newCorrectIndex = options.findIndex(o => o.key === q.correct_option);
  const newCorrectKey = allKeys[newCorrectIndex];

  return {
    ...q,
    option_a: options[0]?.val ?? null,
    option_b: options[1]?.val ?? null,
    option_c: options[2]?.val ?? null,
    option_d: options[3]?.val ?? null,
    option_e: options[4]?.val ?? null,
    correct_option: newCorrectKey,
  };
};
const calculateTimeRemaining = (startedAt, durationMinutes) => {
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  const totalSeconds = durationMinutes * 60;
  return Math.max(0, Math.floor(totalSeconds - elapsed));
};

// Save response (auto-save)
const saveResponse = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { question_id, selected_option, is_marked_review, time_spent_seconds } = req.body;

    // Verify attempt belongs to user (accept both 'started' and 'in_progress'
    // to handle edge cases where status promotion hasn't completed yet)
    const [attempts] = await db.execute(
      'SELECT * FROM attempts WHERE id = ? AND user_id = ? AND status IN ("started", "in_progress")',
      [attemptId, req.user.id]
    );
    if (!attempts.length) return sendError(res, 'Invalid attempt', 403);
    const attempt = attempts[0];
    const [_papers] = await db.execute(
      'SELECT duration_minutes FROM papers WHERE id = ?',
      [attempt.paper_id]
    );
    const _remaining = calculateTimeRemaining(
      attempt.started_at,
      _papers[0].duration_minutes
    );
    if (_remaining <= 0)
      return sendError(res, 'Test time has expired', 403);

    await db.execute(`
      INSERT INTO responses (attempt_id, question_id, selected_option, is_marked_review, time_spent_seconds)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        selected_option = VALUES(selected_option),
        is_marked_review = VALUES(is_marked_review),
        time_spent_seconds = VALUES(time_spent_seconds),
        updated_at = NOW()
    `, [attemptId, question_id, selected_option || null, is_marked_review ? 1 : 0, time_spent_seconds || 0]);

    return sendSuccess(res, {}, 'Response saved');
  } catch (err) {
    return sendError(res, 'Failed to save response', 500);
  }
};

// Submit test
const submitAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { time_taken_seconds, trigger } = req.body; // trigger: 'manual' | 'timeout' | 'auto'

    const [attempts] = await db.execute(
      'SELECT a.*, p.marks_per_question, p.negative_marks, p.total_marks, p.total_questions FROM attempts a JOIN papers p ON p.id = a.paper_id WHERE a.id = ? AND a.user_id = ? AND a.status IN ("started", "in_progress")',
      [attemptId, req.user.id]
    );
    if (!attempts.length) return sendError(res, 'Invalid or already submitted attempt', 403);
    const attempt = attempts[0];

    // Get all questions and responses
    const [questions] = await db.execute(
      'SELECT id, correct_option FROM questions WHERE paper_id = ?',
      [attempt.paper_id]
    );

    const [responses] = await db.execute(
      'SELECT * FROM responses WHERE attempt_id = ?',
      [attemptId]
    );

    const responseMap = {};
    responses.forEach(r => { responseMap[r.question_id] = r; });

    let score = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    // PERF FIX: Collect results first, then do 3 bulk UPDATEs instead of
    // 105 individual UPDATEs (one per question). For a 105-question paper
    // this reduces DB round-trips from 105 → 3, and prevents the 30s timeout
    // from killing the submit under load.
    const skippedIds = [];
    const correctUpdates = [];   // { id, marks }
    const wrongUpdates = [];     // { id, penalty }

    for (const q of questions) {
      const resp = responseMap[q.id];
      if (!resp || !resp.selected_option) {
        skipped++;
        skippedIds.push(q.id);
      } else if (resp.selected_option === q.correct_option) {
        correct++;
        const marks = parseFloat(attempt.marks_per_question);
        score += marks;
        correctUpdates.push({ id: q.id, marks });
      } else {
        wrong++;
        const penalty = parseFloat(attempt.negative_marks);
        score -= penalty;
        wrongUpdates.push({ id: q.id, penalty });
      }
    }

    // Bulk update skipped questions
    if (skippedIds.length > 0) {
      const placeholders = skippedIds.map(() => '?').join(', ');
      await db.execute(
        `UPDATE responses SET is_correct = NULL, marks_obtained = 0 WHERE attempt_id = ? AND question_id IN (${placeholders})`,
        [attemptId, ...skippedIds]
      );
    }

    // Bulk update correct questions (group by marks value — usually all same)
    if (correctUpdates.length > 0) {
      const marksVal = correctUpdates[0].marks; // same for all in one paper
      const ids = correctUpdates.map(u => u.id);
      const placeholders = ids.map(() => '?').join(', ');
      await db.execute(
        `UPDATE responses SET is_correct = 1, marks_obtained = ? WHERE attempt_id = ? AND question_id IN (${placeholders})`,
        [marksVal, attemptId, ...ids]
      );
    }

    // Bulk update wrong questions
    if (wrongUpdates.length > 0) {
      const penaltyVal = wrongUpdates[0].penalty; // same for all in one paper
      const ids = wrongUpdates.map(u => u.id);
      const placeholders = ids.map(() => '?').join(', ');
      await db.execute(
        `UPDATE responses SET is_correct = 0, marks_obtained = ? WHERE attempt_id = ? AND question_id IN (${placeholders})`,
        [-penaltyVal, attemptId, ...ids]
      );
    }

    score = Math.max(0, parseFloat(score.toFixed(2)));
    const accuracy = questions.length > 0 ? parseFloat(((correct / questions.length) * 100).toFixed(2)) : 0;
    const status = trigger === 'timeout' ? 'timed_out' : 'completed';

    await db.execute(`
      UPDATE attempts SET
        status = ?, submitted_at = NOW(), time_taken_seconds = ?,
        score = ?, correct_count = ?, wrong_count = ?, skipped_count = ?, accuracy = ?
      WHERE id = ?
    `, [status, time_taken_seconds || null, score, correct, wrong, skipped, accuracy, attemptId]);

    // Calculate rank
    const [ranks] = await db.execute(
      'SELECT COUNT(*) as cnt FROM attempts WHERE paper_id = ? AND status IN ("completed", "timed_out") AND score > ?',
      [attempt.paper_id, score]
    );
    const rank = ranks[0].cnt + 1;

    const [totalAttempts] = await db.execute(
      'SELECT COUNT(*) as cnt FROM attempts WHERE paper_id = ? AND status IN ("completed", "timed_out")',
      [attempt.paper_id]
    );
    const percentile = totalAttempts[0].cnt > 1
      ? parseFloat(((totalAttempts[0].cnt - rank) / totalAttempts[0].cnt * 100).toFixed(2))
      : 100;

    await db.execute(
      'UPDATE attempts SET rank_position = ?, percentile = ? WHERE id = ?',
      [rank, percentile, attemptId]
    );

    auditLog(req.user.id, 'TEST_SUBMIT', 'attempt', attemptId, { score, correct, wrong, skipped }, req);

    return sendSuccess(res, {
      attempt_id: attemptId,
      score,
      total_marks: attempt.total_marks,
      correct,
      wrong,
      skipped,
      accuracy,
      rank,
      percentile,
      status,
    }, 'Test submitted successfully');
  } catch (err) {
    console.error('Submit error:', err);
    return sendError(res, 'Failed to submit test', 500);
  }
};

// Get result details
const getResult = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const [attempts] = await db.execute(`
      SELECT a.*, p.title as paper_title, p.total_marks as paper_total_marks,
        p.marks_per_question, p.negative_marks, p.duration_minutes,
        e.name as exam_name, c.name as category_name
      FROM attempts a
      JOIN papers p ON p.id = a.paper_id
      JOIN exams e ON e.id = p.exam_id
      JOIN categories c ON c.id = e.category_id
      WHERE a.id = ? AND a.user_id = ?
    `, [attemptId, req.user.id]);

    if (!attempts.length) return sendError(res, 'Result not found', 404);

    const attempt = attempts[0];

    // Get section-wise analysis
    const [sectionAnalysis] = await db.execute(`
      SELECT s.name as section_name,
        COUNT(q.id) as total_questions,
        SUM(CASE WHEN r.is_correct = 1 THEN 1 ELSE 0 END) as correct,
        SUM(CASE WHEN r.is_correct = 0 THEN 1 ELSE 0 END) as wrong,
        SUM(CASE WHEN r.selected_option IS NULL THEN 1 ELSE 0 END) as skipped,
        SUM(r.marks_obtained) as marks_obtained
      FROM sections s
      JOIN questions q ON q.section_id = s.id AND q.paper_id = ?
      LEFT JOIN responses r ON r.question_id = q.id AND r.attempt_id = ?
      GROUP BY s.id
    `, [attempt.paper_id, attemptId]);

    // Get question-wise responses for review
    const [responses] = await db.execute(`
      SELECT r.*, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.option_e,
        q.correct_option, q.explanation, q.difficulty, q.topic,
        s.name as section_name
      FROM responses r
      JOIN questions q ON q.id = r.question_id
      LEFT JOIN sections s ON s.id = q.section_id
      WHERE r.attempt_id = ?
      ORDER BY q.section_id ASC, q.sort_order ASC
    `, [attemptId]);

    return sendSuccess(res, {
      attempt,
      section_analysis: sectionAnalysis,
      responses,
    });
  } catch (err) {
    console.error('Get result error:', err);
    return sendError(res, 'Failed to fetch result', 500);
  }
};

// Get user's attempt history
const getUserAttempts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const safeLimit = Number(Math.min(Math.max(parseInt(limit) || 10, 1), 50));
    const safePage = Number(Math.max(parseInt(page) || 1, 1));
    const safeOffset = Number((safePage - 1) * safeLimit);

    const [attempts] = await db.query(`
      SELECT a.id, a.status, a.score, a.total_marks, a.correct_count, a.wrong_count,
        a.skipped_count, a.accuracy, a.rank_position, a.percentile,
        a.started_at, a.submitted_at, a.time_taken_seconds,
        p.title as paper_title, p.duration_minutes,
        e.name as exam_name, c.name as category_name
      FROM attempts a
      JOIN papers p ON p.id = a.paper_id
      JOIN exams e ON e.id = p.exam_id
      JOIN categories c ON c.id = e.category_id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, safeLimit, safeOffset]);

    const [[total]] = await db.query(
      'SELECT COUNT(*) as cnt FROM attempts WHERE user_id = ?',
      [req.user.id]
    );

    return sendSuccess(res, { attempts, total: total.cnt });
  } catch (err) {
    return sendError(res, 'Failed to fetch attempts', 500);
  }
};

// Get user dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [[stats]] = await db.execute(`
      SELECT
        COUNT(*) as total_attempts,
        SUM(CASE WHEN status IN ('completed','timed_out') THEN 1 ELSE 0 END) as completed,
        AVG(CASE WHEN status IN ('completed','timed_out') THEN accuracy ELSE NULL END) as avg_accuracy,
        AVG(CASE WHEN status IN ('completed','timed_out') THEN score ELSE NULL END) as avg_score,
        MAX(score) as best_score
      FROM attempts WHERE user_id = ?
    `, [userId]);

    // Recent attempts
    const [recent] = await db.execute(`
      SELECT a.id, a.status, a.score, a.accuracy, a.submitted_at,
        p.title as paper_title, e.name as exam_name
      FROM attempts a
      JOIN papers p ON p.id = a.paper_id
      JOIN exams e ON e.id = p.exam_id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
      LIMIT 5
    `, [userId]);

    // In-progress (resume)
    const [inProgress] = await db.execute(`
      SELECT a.id, a.started_at, p.id as paper_id, p.title as paper_title,
        p.duration_minutes, e.name as exam_name, c.slug as category_slug, e.slug as exam_slug
      FROM attempts a
      JOIN papers p ON p.id = a.paper_id
      JOIN exams e ON e.id = p.exam_id
      JOIN categories c ON c.id = e.category_id
      WHERE a.user_id = ? AND a.status = 'in_progress'
      ORDER BY a.created_at DESC
      LIMIT 3
    `, [userId]);

    // Performance by category
    const [categoryPerf] = await db.execute(`
      SELECT c.name as category, AVG(a.accuracy) as avg_accuracy, COUNT(a.id) as attempts
      FROM attempts a
      JOIN papers p ON p.id = a.paper_id
      JOIN exams e ON e.id = p.exam_id
      JOIN categories c ON c.id = e.category_id
      WHERE a.user_id = ? AND a.status IN ('completed','timed_out')
      GROUP BY c.id
      ORDER BY attempts DESC
    `, [userId]);

    return sendSuccess(res, { stats, recent, inProgress, categoryPerf });
  } catch (err) {
    console.error('Dashboard error:', err);
    return sendError(res, 'Failed to fetch dashboard', 500);
  }
};

module.exports = {
  startAttempt, saveResponse, submitAttempt,
  getResult, getUserAttempts, getDashboardStats
};
