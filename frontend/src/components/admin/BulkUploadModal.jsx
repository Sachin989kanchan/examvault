import { useRef, useState, useEffect } from 'react'
import { Modal } from '../common'
import { examAPI } from '../../services/api'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, ChevronDown } from 'lucide-react'

const BulkUploadModal = ({ open, onClose }) => {
  const fileInputRef = useRef(null)

  // ── Paper selection state ────────────────────────────────────────────────────
  const [categories, setCategories]   = useState([])
  const [exams, setExams]             = useState([])
  const [papers, setPapers]           = useState([])
  const [selectedCat, setSelectedCat] = useState('')
  const [selectedExam, setSelectedExam] = useState('')
  const [selectedPaper, setSelectedPaper] = useState('')   // this is the paper_id
  const [loadingPapers, setLoadingPapers] = useState(false)

  // ── Upload state ─────────────────────────────────────────────────────────────
  const [file, setFile]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')

  // Load categories once when modal opens
  useEffect(() => {
    if (open && categories.length === 0) {
      examAPI.getCategories()
        .then(r => setCategories(r.data.data || []))
        .catch(() => {})
    }
  }, [open])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCategoryChange = async (catId) => {
    setSelectedCat(catId)
    setSelectedExam('')
    setSelectedPaper('')
    setExams([])
    setPapers([])
    if (!catId) return
    const cat = categories.find(c => String(c.id) === String(catId))
    if (!cat) return
    const res = await examAPI.getCategory(cat.slug)
    setExams(res.data.data.exams || [])
  }

  const handleExamChange = async (examSlug) => {
    setSelectedExam(examSlug)
    setSelectedPaper('')
    setPapers([])
    if (!examSlug) return
    setLoadingPapers(true)
    try {
      const res = await examAPI.getExamPapers(examSlug)
      setPapers(res.data.data.papers || [])
    } catch {
      setPapers([])
    } finally {
      setLoadingPapers(false)
    }
  }

  const handleFileChange = (e) => {
    const picked = e.target.files?.[0]
    if (!picked) return
    if (!picked.name.toLowerCase().endsWith('.xlsx')) {
      setError('Only .xlsx files are accepted.')
      setFile(null)
      e.target.value = ''
      return
    }
    setFile(picked)
    setError('')
    setResult(null)
  }

  const handleUpload = async () => {
    if (!selectedPaper) { setError('Please select a paper first.'); return }
    if (!file)          { setError('Please select an .xlsx file first.'); return }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('paper_id', selectedPaper)   // sent to backend

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await examAPI.bulkUploadQuestions(formData)
      setResult(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFile(null); setResult(null); setError('')
    setSelectedCat(''); setSelectedExam(''); setSelectedPaper('')
    setExams([]); setPapers([])
    setLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  const resetForAnother = () => {
    setResult(null); setFile(null); setError('')
    setSelectedPaper(''); setSelectedExam(''); setSelectedCat('')
    setExams([]); setPapers([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Selected paper object (for display)
  const paperObj = papers.find(p => String(p.id) === String(selectedPaper))

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Modal open={open} onClose={handleClose} title="Bulk Upload Questions" maxWidth="max-w-xl">

      {/* ── Step 1: Select Paper ─────────────────────────────────────────────── */}
      <div className="mb-5">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand text-white text-xs flex items-center justify-center font-bold">1</span>
          Select Paper
        </p>

        <div className="grid grid-cols-1 gap-3">

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
            <select
              className="input text-sm"
              value={selectedCat}
              onChange={e => handleCategoryChange(e.target.value)}
              disabled={loading}
            >
              <option value="">— Select Category —</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Exam — show only after category picked */}
          {exams.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Exam</label>
              <select
                className="input text-sm"
                value={selectedExam}
                onChange={e => handleExamChange(e.target.value)}
                disabled={loading}
              >
                <option value="">— Select Exam —</option>
                {exams.map(e => (
                  <option key={e.id} value={e.slug}>{e.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Paper — show only after exam picked */}
          {(loadingPapers || papers.length > 0) && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Paper</label>
              {loadingPapers ? (
                <div className="input text-sm text-gray-400">Loading papers…</div>
              ) : (
                <select
                  className="input text-sm"
                  value={selectedPaper}
                  onChange={e => setSelectedPaper(e.target.value)}
                  disabled={loading}
                >
                  <option value="">— Select Paper —</option>
                  {papers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.year ? `(${p.year})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Selected paper confirmation badge */}
          {paperObj && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-green-700 dark:text-green-300 truncate">{paperObj.title}</p>
                <p className="text-xs text-green-600 dark:text-green-400">Paper ID: {paperObj.id} — all questions will be added to this paper</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Step 2: Upload Excel ─────────────────────────────────────────────── */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand text-white text-xs flex items-center justify-center font-bold">2</span>
          Upload Excel File
        </p>

        {/* Column hint */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-3">
          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Required columns in Excel</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
            question_text · option_a · option_b · option_c · option_d · correct_option
          </p>
          <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
            Optional: section_id · explanation · difficulty · topic
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
            ✓ paper_id is not needed — selected paper above will be used automatically
          </p>
        </div>

        {/* File drop zone */}
        <div
          onClick={() => !loading && fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors
            ${file
              ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
              : 'border-gray-300 dark:border-gray-600 hover:border-brand hover:bg-brand/5'
            }
            ${loading ? 'opacity-60 cursor-not-allowed' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleFileChange}
            disabled={loading}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="w-7 h-7 text-green-500 flex-shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Upload className="w-7 h-7 text-gray-400 mx-auto" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click to select Excel file</p>
              <p className="text-xs text-gray-400">.xlsx only · Max 5 MB</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* ── Result summary ───────────────────────────────────────────────────── */}
      {result && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-4">
          <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Total Rows</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{result.totalRows}</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Inserted</p>
              <p className="text-lg font-bold text-green-600">{result.inserted}</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Failed</p>
              <p className="text-lg font-bold text-red-500">{result.failed}</p>
            </div>
          </div>

          {result.inserted > 0 && result.failed === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                All {result.inserted} question{result.inserted !== 1 ? 's' : ''} uploaded successfully!
              </p>
            </div>
          )}

          {result.inserted > 0 && result.failed > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20">
              <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                {result.inserted} inserted, {result.failed} row{result.failed !== 1 ? 's' : ''} skipped.
              </p>
            </div>
          )}

          {result.errors?.length > 0 && (
            <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {result.errors.map(({ row, errors: rowErrors }) => (
                <div key={row} className="px-4 py-2.5 flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Row {row}: </span>
                    <span className="text-xs text-red-600 dark:text-red-400">{rowErrors.join(' · ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Buttons ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button type="button" onClick={handleClose} disabled={loading}
          className="btn-secondary text-sm disabled:opacity-50">
          {result ? 'Close' : 'Cancel'}
        </button>

        {!result && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || !selectedPaper || loading}
            className="btn-primary text-sm gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Questions
              </>
            )}
          </button>
        )}

        {result && result.failed > 0 && (
          <button type="button" onClick={resetForAnother} className="btn-primary text-sm gap-2">
            <Upload className="w-4 h-4" /> Upload Another
          </button>
        )}
      </div>
    </Modal>
  )
}

export default BulkUploadModal
