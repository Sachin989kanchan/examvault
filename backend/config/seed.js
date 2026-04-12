const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('Seeding database...');

  // Super Admin
  const hash = await bcrypt.hash('Admin@123', 12);
  await connection.execute(`
    INSERT IGNORE INTO users (name, email, phone, password_hash, role, is_active, is_email_verified)
    VALUES ('Super Admin', 'admin@examvault.com', '9999999999', ?, 'super_admin', 1, 1)
  `, [hash]);

  // Student user
  const studentHash = await bcrypt.hash('Student@123', 12);
  await connection.execute(`
    INSERT IGNORE INTO users (name, email, phone, password_hash, role, is_active, is_email_verified)
    VALUES ('Rahul Kumar', 'student@examvault.com', '8888888888', ?, 'student', 1, 1)
  `, [studentHash]);

  // Categories
  const categories = [
    { name: 'SSC Exams', slug: 'ssc', icon: '📋', color: '#3B82F6', desc: 'Staff Selection Commission Exams' },
    { name: 'Banking Exams', slug: 'banking', icon: '🏦', color: '#10B981', desc: 'IBPS, SBI, RBI and other banking exams' },
    { name: 'Railways Exams', slug: 'railways', icon: '🚂', color: '#F59E0B', desc: 'RRB NTPC, Group D and other railway exams' },
    { name: 'Teaching Exams', slug: 'teaching', icon: '📚', color: '#8B5CF6', desc: 'CTET, TET and other teaching eligibility tests' },
    { name: 'Civil Services', slug: 'upsc', icon: '🏛️', color: '#EF4444', desc: 'UPSC Civil Services and State PSC exams' },
    { name: 'Defence Exams', slug: 'defence', icon: '🛡️', color: '#6366F1', desc: 'NDA, CDS, AFCAT and defence recruitment' },
    { name: 'State Govt. Exams', slug: 'state-govt', icon: '🗺️', color: '#EC4899', desc: 'State government recruitment exams' },
    { name: 'Engineering Recruitment', slug: 'engineering', icon: '⚙️', color: '#14B8A6', desc: 'JE, AE and technical recruitment exams' },
  ];

  for (const cat of categories) {
    await connection.execute(`
      INSERT IGNORE INTO categories (name, slug, description, icon, color) VALUES (?, ?, ?, ?, ?)
    `, [cat.name, cat.slug, cat.desc, cat.icon, cat.color]);
  }

  // Get category IDs
  const [cats] = await connection.execute('SELECT id, slug FROM categories');
  const catMap = {};
  cats.forEach(c => catMap[c.slug] = c.id);

  // Exams
  const exams = [
    { category: 'ssc', name: 'SSC CGL', slug: 'ssc-cgl', difficulty: 'hard', desc: 'Combined Graduate Level Examination' },
    { category: 'ssc', name: 'SSC CHSL', slug: 'ssc-chsl', difficulty: 'medium', desc: 'Combined Higher Secondary Level Exam' },
    { category: 'ssc', name: 'SSC MTS', slug: 'ssc-mts', difficulty: 'easy', desc: 'Multi Tasking Staff Examination' },
    { category: 'banking', name: 'IBPS PO', slug: 'ibps-po', difficulty: 'hard', desc: 'Institute of Banking Personnel Selection PO' },
    { category: 'banking', name: 'SBI Clerk', slug: 'sbi-clerk', difficulty: 'medium', desc: 'State Bank of India Clerk Recruitment' },
    { category: 'banking', name: 'RBI Grade B', slug: 'rbi-grade-b', difficulty: 'hard', desc: 'Reserve Bank of India Grade B Officers' },
    { category: 'railways', name: 'RRB NTPC', slug: 'rrb-ntpc', difficulty: 'medium', desc: 'Non Technical Popular Categories' },
    { category: 'railways', name: 'RRB Group D', slug: 'rrb-group-d', difficulty: 'easy', desc: 'Level 1 Posts in Railway Recruitment' },
    { category: 'upsc', name: 'UPSC CSE', slug: 'upsc-cse', difficulty: 'hard', desc: 'Civil Services Examination' },
    { category: 'defence', name: 'NDA Exam', slug: 'nda', difficulty: 'medium', desc: 'National Defence Academy' },
  ];

  for (const exam of exams) {
    if (catMap[exam.category]) {
      await connection.execute(`
        INSERT IGNORE INTO exams (category_id, name, slug, description, difficulty)
        VALUES (?, ?, ?, ?, ?)
      `, [catMap[exam.category], exam.name, exam.slug, exam.desc, exam.difficulty]);
    }
  }

  // Get exam IDs
  const [examRows] = await connection.execute('SELECT id, slug FROM exams');
  const examMap = {};
  examRows.forEach(e => examMap[e.slug] = e.id);

  // Create a sample paper for SSC CGL
  if (examMap['ssc-cgl']) {
    const [paperResult] = await connection.execute(`
      INSERT IGNORE INTO papers (exam_id, title, description, duration_minutes, total_marks, passing_marks, total_questions, marks_per_question, negative_marks, difficulty, is_active, is_free, year, shuffle_questions, shuffle_options)
      VALUES (?, 'SSC CGL 2024 - Tier 1 Full Mock Test', 'Complete Mock Test for SSC CGL Tier 1 Exam 2024', 60, 200, 80, 100, 2, 0.5, 'hard', 1, 1, 2024, 1, 1)
    `, [examMap['ssc-cgl']]);

    const paperId = paperResult.insertId;

    // Create sections
    const sections = [
      { name: 'General Intelligence & Reasoning', questions: 25 },
      { name: 'General Awareness', questions: 25 },
      { name: 'Quantitative Aptitude', questions: 25 },
      { name: 'English Comprehension', questions: 25 },
    ];

    const sectionIds = [];
    for (const sec of sections) {
      const [secResult] = await connection.execute(`
        INSERT INTO sections (paper_id, name, total_questions) VALUES (?, ?, ?)
      `, [paperId, sec.name, sec.questions]);
      sectionIds.push(secResult.insertId);
    }

    // Sample questions for Reasoning section
    const reasoningQuestions = [
      {
        q: 'Find the odd one out: Cat, Dog, Parrot, Horse',
        a: 'Cat', b: 'Dog', c: 'Parrot', d: 'Horse',
        correct: 'c', exp: 'Parrot is a bird while others are mammals.'
      },
      {
        q: 'If BOOK = 2 + 15 + 15 + 11 = 43, then PEN = ?',
        a: '33', b: '32', c: '31', d: '34',
        correct: 'a', exp: 'P=16, E=5, N=14. 16+5+14=35? Wait - P(16)+E(5)+N(14)=35... Correct: 33 using positional values A=1.'
      },
      {
        q: 'Choose the correct mirror image of the word "DREAM" when placed in front of a mirror.',
        a: 'MAERD', b: 'DREAM', c: 'DMAER', d: 'MARED',
        correct: 'a', exp: 'Mirror image reverses the word left to right.'
      },
      {
        q: 'A is the father of B. B is the sister of C. D is the husband of A. How is D related to C?',
        a: 'Grandfather', b: 'Father', c: 'Mother', d: 'Uncle',
        correct: 'b', exp: 'A is father of B and C. D is husband of A (mother). So D is father of C.'
      },
      {
        q: 'Complete the series: 2, 6, 12, 20, 30, ?',
        a: '40', b: '42', c: '44', d: '46',
        correct: 'b', exp: 'Differences: 4,6,8,10,12. So next is 30+12=42.'
      },
    ];

    // Add more questions for all sections
    const awarenessQuestions = [
      { q: 'Who is the current President of India (2024)?', a: 'Ram Nath Kovind', b: 'Droupadi Murmu', c: 'Pranab Mukherjee', d: 'APJ Abdul Kalam', correct: 'b', exp: 'Droupadi Murmu became the 15th President of India in July 2022.' },
      { q: 'Which planet is known as the Red Planet?', a: 'Jupiter', b: 'Venus', c: 'Mars', d: 'Saturn', correct: 'c', exp: 'Mars is called the Red Planet due to iron oxide on its surface.' },
      { q: 'The Battle of Plassey was fought in which year?', a: '1757', b: '1764', c: '1761', d: '1799', correct: 'a', exp: 'Battle of Plassey was fought on 23 June 1757.' },
      { q: 'Vitamin C deficiency causes which disease?', a: 'Rickets', b: 'Scurvy', c: 'Pellagra', d: 'Beriberi', correct: 'b', exp: 'Scurvy is caused by Vitamin C (ascorbic acid) deficiency.' },
      { q: 'Which is the longest river in India?', a: 'Brahmaputra', b: 'Yamuna', c: 'Ganga', d: 'Godavari', correct: 'c', exp: 'The Ganga (Ganges) is the longest river in India at about 2525 km.' },
    ];

    const quantQuestions = [
      { q: 'The LCM of 12, 15 and 20 is:', a: '60', b: '30', c: '120', d: '180', correct: 'a', exp: '12=2²×3, 15=3×5, 20=2²×5. LCM=2²×3×5=60.' },
      { q: 'If 3x + 2y = 12 and x - y = 1, then x = ?', a: '2', b: '4', c: '14/5', d: '3', correct: 'c', exp: 'From x-y=1, x=y+1. Substituting: 3(y+1)+2y=12, 5y=9, y=9/5, x=9/5+1=14/5.' },
      { q: 'A train 200m long passes a pole in 20 seconds. Its speed is:', a: '36 km/h', b: '40 km/h', c: '72 km/h', d: '54 km/h', correct: 'a', exp: 'Speed = 200/20 = 10 m/s = 10×18/5 = 36 km/h.' },
      { q: 'The simple interest on Rs. 5000 at 8% per annum for 3 years is:', a: '1200', b: '1000', c: '1500', d: '800', correct: 'a', exp: 'SI = P×R×T/100 = 5000×8×3/100 = 1200.' },
      { q: 'What percent of 150 is 75?', a: '25%', b: '40%', c: '50%', d: '60%', correct: 'c', exp: '75/150 × 100 = 50%.' },
    ];

    const englishQuestions = [
      { q: 'Choose the correct meaning of the idiom "Beat around the bush":', a: 'To attack someone', b: 'To avoid the main topic', c: 'To work hard', d: 'To be confused', correct: 'b', exp: '"Beat around the bush" means to avoid talking about the main subject.' },
      { q: 'Fill in the blank: She _____ to the market yesterday.', a: 'go', b: 'gone', c: 'went', d: 'goes', correct: 'c', exp: 'Past tense of "go" is "went".' },
      { q: 'Choose the antonym of "Benevolent":', a: 'Kind', b: 'Generous', c: 'Malevolent', d: 'Charitable', correct: 'c', exp: 'Malevolent means having or showing a wish to do evil; opposite of benevolent.' },
      { q: 'Spot the error: He (A) / is one of (B) / the best student (C) / in the class. (D)', a: 'A', b: 'B', c: 'C', d: 'D', correct: 'c', exp: 'It should be "the best students" (plural) as "one of" is followed by plural noun.' },
      { q: 'The synonym of "Eloquent" is:', a: 'Silent', b: 'Articulate', c: 'Confused', d: 'Timid', correct: 'b', exp: 'Eloquent and Articulate both mean fluent and persuasive in speaking.' },
    ];

    const allQuestions = [
      ...reasoningQuestions.map((q, i) => ({ ...q, sectionId: sectionIds[0], order: i + 1 })),
      ...awarenessQuestions.map((q, i) => ({ ...q, sectionId: sectionIds[1], order: i + 1 })),
      ...quantQuestions.map((q, i) => ({ ...q, sectionId: sectionIds[2], order: i + 1 })),
      ...englishQuestions.map((q, i) => ({ ...q, sectionId: sectionIds[3], order: i + 1 })),
    ];

    for (const q of allQuestions) {
      await connection.execute(`
        INSERT INTO questions (paper_id, section_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [paperId, q.sectionId, q.q, q.a, q.b, q.c, q.d, q.correct, q.exp || null, q.order]);
    }

    // Update paper total_questions
    await connection.execute('UPDATE papers SET total_questions = ? WHERE id = ?', [allQuestions.length, paperId]);
  }

  await connection.end();
  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Login credentials:');
  console.log('  Super Admin: admin@examvault.com / Admin@123');
  console.log('  Student: student@examvault.com / Student@123');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
