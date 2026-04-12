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





const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  console.log('Running migrations...');

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
  await connection.query(`USE \`${process.env.DB_NAME}\``);

  // Users table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(191) UNIQUE NOT NULL,
      phone VARCHAR(15),
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('student','admin','super_admin') DEFAULT 'student',
      is_active BOOLEAN DEFAULT TRUE,
      is_email_verified BOOLEAN DEFAULT FALSE,
      avatar_url VARCHAR(500),
      login_attempts INT DEFAULT 0,
      locked_until DATETIME NULL,
      last_login DATETIME NULL,
      refresh_token TEXT NULL,
      otp_code VARCHAR(10) NULL,
      otp_expires DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Categories table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      icon VARCHAR(100),
      color VARCHAR(20),
      is_active BOOLEAN DEFAULT TRUE,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Exams table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS exams (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT NOT NULL,
      name VARCHAR(200) NOT NULL,
      slug VARCHAR(200) UNIQUE NOT NULL,
      description TEXT,
      difficulty ENUM('easy','medium','hard') DEFAULT 'medium',
      is_active BOOLEAN DEFAULT TRUE,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      INDEX idx_category (category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Papers (Test Papers) table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS papers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      exam_id INT NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      duration_minutes INT NOT NULL DEFAULT 60,
      total_marks INT NOT NULL DEFAULT 100,
      passing_marks INT DEFAULT 40,
      total_questions INT DEFAULT 0,
      marks_per_question DECIMAL(5,2) DEFAULT 1.00,
      negative_marks DECIMAL(5,2) DEFAULT 0.25,
      difficulty ENUM('easy','medium','hard') DEFAULT 'medium',
      shuffle_questions BOOLEAN DEFAULT FALSE,
      shuffle_options BOOLEAN DEFAULT FALSE,
      attempt_limit INT DEFAULT 1,
      allow_reattempt BOOLEAN DEFAULT FALSE,
      section_locking BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      is_free BOOLEAN DEFAULT TRUE,
      year INT,
      language VARCHAR(10) DEFAULT 'en',
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      INDEX idx_exam (exam_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Sections table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS sections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      paper_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      duration_minutes INT NULL,
      total_questions INT DEFAULT 0,
      marks_per_question DECIMAL(5,2) DEFAULT 1.00,
      negative_marks DECIMAL(5,2) DEFAULT 0.25,
      sort_order INT DEFAULT 0,
      FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
      INDEX idx_paper (paper_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Questions table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      paper_id INT NOT NULL,
      section_id INT NULL,
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option ENUM('a','b','c','d') NOT NULL,
      explanation TEXT,
      difficulty ENUM('easy','medium','hard') DEFAULT 'medium',
      topic VARCHAR(100),
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
      INDEX idx_paper (paper_id),
      INDEX idx_section (section_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Test Attempts table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS attempts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      paper_id INT NOT NULL,
      status ENUM('started','in_progress','completed','abandoned','timed_out') DEFAULT 'started',
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      submitted_at DATETIME NULL,
      time_taken_seconds INT NULL,
      score DECIMAL(8,2) DEFAULT 0,
      total_marks DECIMAL(8,2) DEFAULT 0,
      correct_count INT DEFAULT 0,
      wrong_count INT DEFAULT 0,
      skipped_count INT DEFAULT 0,
      accuracy DECIMAL(5,2) DEFAULT 0,
      rank_position INT NULL,
      percentile DECIMAL(5,2) NULL,
      snapshot JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
      INDEX idx_user (user_id),
      INDEX idx_paper (paper_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Responses table (individual question responses)
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS responses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      attempt_id INT NOT NULL,
      question_id INT NOT NULL,
      selected_option ENUM('a','b','c','d') NULL,
      correct_option_presented ENUM('a','b','c','d') NULL,
      is_marked_review BOOLEAN DEFAULT FALSE,
      is_correct BOOLEAN NULL,
      marks_obtained DECIMAL(5,2) DEFAULT 0,
      time_spent_seconds INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      UNIQUE KEY unique_attempt_question (attempt_id, question_id),
      INDEX idx_attempt (attempt_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Audit Logs
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id INT,
      details JSON,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_action (action),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Bookmarks
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      question_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_bookmark (user_id, question_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await connection.end();
  console.log('✅ All migrations completed successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
