const XLSX = require('xlsx');

const VALID_OPTIONS = ['a', 'b', 'c', 'd', 'e'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

const str = (val) => (val === undefined || val === null ? '' : String(val).trim());

const resolveRow = (raw) => ({
  // paper_id is now OPTIONAL — overridden by the value sent from the UI
  paper_id: str(raw.paper_id ?? raw['Paper ID'] ?? raw['PaperID'] ?? ''),
  section_id: str(raw.section_id ?? raw['Section ID'] ?? raw['SectionID'] ?? ''),
  question_text: str(raw.question_text ?? raw['Question Text'] ?? raw['Question'] ?? ''),
  option_a: str(raw.option_a ?? raw['Option A'] ?? raw['OptionA'] ?? ''),
  option_b: str(raw.option_b ?? raw['Option B'] ?? raw['OptionB'] ?? ''),
  option_c: str(raw.option_c ?? raw['Option C'] ?? raw['OptionC'] ?? ''),
  option_d: str(raw.option_d ?? raw['Option D'] ?? raw['OptionD'] ?? ''),
  option_e: str(raw.option_e ?? raw['Option E'] ?? raw['OptionE'] ?? ''), // optional
  correct_option: str(raw.correct_option ?? raw['Correct Option'] ?? raw['Correct Answer'] ?? raw['Answer'] ?? '').toLowerCase(),
  explanation: str(raw.explanation ?? raw['Explanation'] ?? ''),
  difficulty: str(raw.difficulty ?? raw['Difficulty'] ?? 'medium').toLowerCase(),
  topic: str(raw.topic ?? raw['Topic'] ?? ''),
});

/**
 * Parse an .xlsx buffer into validated question rows.
 *
 * @param {Buffer} buffer          File buffer from multer memoryStorage
 * @param {number|null} paperIdOverride
 *   When provided (selected from UI dropdown), this value is used as paper_id
 *   for every row — the Excel column is ignored. When null, the Excel column
 *   is used and validated as before.
 *
 * @returns {{ totalRows, valid, errors }}
 */
const parseExcel = (buffer, paperIdOverride = null) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('The Excel file contains no sheets.');

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const valid = [];
  const errors = [];

  rows.forEach((raw, index) => {
    const rowNum = index + 2;
    const row = resolveRow(raw);
    const rowErrors = [];

    // ── Required fields ────────────────────────────────────────────────────
    if (!row.question_text) rowErrors.push('question_text is required');
    if (!row.option_a) rowErrors.push('option_a is required');
    if (!row.option_b) rowErrors.push('option_b is required');
    if (!row.option_c) rowErrors.push('option_c is required');
    if (!row.option_d) rowErrors.push('option_d is required');
    // option_e is optional — blank means the question only has 4 options

    if (!row.correct_option || !VALID_OPTIONS.includes(row.correct_option)) {
      rowErrors.push(`correct_option must be one of: a, b, c, d, e (got "${row.correct_option}")`);
    }

    // If correct_option is 'e', option_e must not be blank
    if (row.correct_option === 'e' && !row.option_e) {
      rowErrors.push('correct_option is "e" but option_e is empty');
    }

    // ── paper_id: use override from UI, else validate from Excel ──────────
    let paperId = paperIdOverride;

    if (!paperId) {
      const fromExcel = parseInt(row.paper_id, 10);
      if (!row.paper_id || isNaN(fromExcel) || fromExcel <= 0) {
        rowErrors.push('paper_id must be a valid positive integer');
      } else {
        paperId = fromExcel;
      }
    }

    // ── Optional fields ────────────────────────────────────────────────────
    const difficulty = VALID_DIFFICULTIES.includes(row.difficulty) ? row.difficulty : 'medium';
    const sectionId = parseInt(row.section_id, 10);

    if (rowErrors.length) {
      errors.push({ row: rowNum, errors: rowErrors });
    } else {
      valid.push({
        paper_id: paperId,
        section_id: (!isNaN(sectionId) && sectionId > 0) ? sectionId : null,
        question_text: row.question_text,
        option_a: row.option_a,
        option_b: row.option_b,
        option_c: row.option_c,
        option_d: row.option_d,
        option_e: row.option_e || null,   // null when blank — 4-option question
        correct_option: row.correct_option,
        explanation: row.explanation || null,
        difficulty,
        topic: row.topic || null,
      });
    }
  });

  return { totalRows: rows.length, valid, errors };
};

module.exports = { parseExcel };