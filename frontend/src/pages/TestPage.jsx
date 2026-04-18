import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { testAPI } from '../services/api'
import { useTimer } from '../hooks'
import { Spinner } from '../components/common'
import toast from 'react-hot-toast'
import {
  ChevronLeft, ChevronRight, Flag, Send, Menu,
  X, Clock, AlertCircle, Maximize2
} from 'lucide-react'

const ALL_OPTION_KEYS   = ['a', 'b', 'c', 'd', 'e']
const ALL_OPTION_LABELS = ['A', 'B', 'C', 'D', 'E']
// Only render options that actually have text for the current question
const getOptionKeys = (q) =>
  ALL_OPTION_KEYS.filter(k => q?.[`option_${k}`] != null && q[`option_${k}`] !== '')


const TestPage = () => {
  const { paperId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const attemptIdParam = searchParams.get('attempt')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [paper, setPaper] = useState(null)
  const [sections, setSections] = useState([]) // [{section_id, section_name, questions:[]}] or flat []
  const [isSectioned, setIsSectioned] = useState(false)
  // Seed attemptId immediately from URL param to avoid null stale closures
  const [attemptId, setAttemptId] = useState(attemptIdParam ? parseInt(attemptIdParam, 10) : null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0)
  const [currentQIdx, setCurrentQIdx] = useState(0)
  const [responses, setResponses] = useState({}) // {questionId: {selected, marked}}
  const [navOpen, setNavOpen] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [tabSwitches, setTabSwitches] = useState(0)
  const saveQueueRef = useRef({})
  const autoSaveIntervalRef = useRef(null)
  const startTimeRef = useRef(Date.now())

  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches(n => {
          const next = n + 1
          if (next >= 3) toast.error('⚠️ Multiple tab switches detected. This will be reported.')
          else toast('⚠️ Please do not switch tabs during the test!', { icon: '⚠️' })
          return next
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Load test — if the URL already carries an attempt ID (set by PaperDetailPage after
  // calling startAttempt), we still call startAttempt so the backend can return the
  // question list via resume logic, but we only need ONE call, not three.
  // Using `attemptIdParam` as a dep means the effect won't re-run on re-mounts caused
  // by React StrictMode unless the param itself changes.
  useEffect(() => {
    let cancelled = false
    testAPI.startAttempt(paperId)
      .then(res => {
        if (cancelled) return
        const d = res.data.data
        setPaper(d.paper)
        setAttemptId(d.attempt.id)
        setTimeRemaining(d.attempt.time_remaining)
        startTimeRef.current = Date.now() - ((d.paper.duration_minutes * 60 - d.attempt.time_remaining) * 1000)

        // Build sections/questions structure
        const qs = d.questions
        if (qs.length > 0 && qs[0].section_id !== undefined && qs[0].questions) {
          // Sectioned
          setIsSectioned(true)
          setSections(qs)
        } else {
          // Flat
          setIsSectioned(false)
          setSections([{ section_id: null, section_name: 'Questions', questions: qs }])
        }

        // Init responses from existing data
        const initResp = {}
        const allQs = qs[0]?.questions ? qs.flatMap(s => s.questions) : qs
        allQs.forEach(q => {
          initResp[q.id] = { selected: q.selected_option || null, marked: q.is_marked_review || false }
        })
        setResponses(initResp)
      })
      .catch(err => { if (!cancelled) setError(err.response?.data?.message || 'Failed to start test') })
      .finally(() => { if (!cancelled) setLoading(false) })

    // Cleanup: mark cancelled so stale async results are ignored (handles React StrictMode
    // double-invocation and prevents the 2nd unmount/remount from overwriting state)
    return () => { cancelled = true }
  }, [paperId])

  const currentSection = sections[currentSectionIdx]
  const allQuestionsFlat = sections.flatMap(s => s.questions || [])
  const currentQ = currentSection?.questions?.[currentQIdx]

  const globalQIndex = sections.slice(0, currentSectionIdx).reduce((acc, s) => acc + (s.questions?.length || 0), 0) + currentQIdx

  // Auto-save every 30 seconds
  useEffect(() => {
    autoSaveIntervalRef.current = setInterval(() => {
      const pending = saveQueueRef.current
      Object.keys(pending).forEach(async (qId) => {
        const { selected, marked } = pending[qId]
        try {
          await testAPI.saveResponse(attemptId, {
            question_id: parseInt(qId),
            selected_option: selected || null,
            is_marked_review: marked || false,
          })
        } catch { }
      })
      saveQueueRef.current = {}
    }, 30000)
    return () => clearInterval(autoSaveIntervalRef.current)
  }, [attemptId])

  const handleSelect = useCallback(async (optionKey) => {
    if (!currentQ) return
    const qId = currentQ.id
    setResponses(prev => {
      const updated = { ...prev, [qId]: { ...prev[qId], selected: optionKey } }
      saveQueueRef.current[qId] = updated[qId]
      return updated
    })
    // Immediate save
    try {
      await testAPI.saveResponse(attemptId, { question_id: qId, selected_option: optionKey, is_marked_review: responses[qId]?.marked || false })
    } catch { }
  }, [currentQ, attemptId, responses])

  const handleMark = useCallback(async () => {
    if (!currentQ) return
    const qId = currentQ.id
    setResponses(prev => {
      const updated = { ...prev, [qId]: { ...prev[qId], marked: !prev[qId]?.marked } }
      saveQueueRef.current[qId] = updated[qId]
      return updated
    })
  }, [currentQ])

  const goTo = (sectionIdx, qIdx) => {
    setCurrentSectionIdx(sectionIdx)
    setCurrentQIdx(qIdx)
    setNavOpen(false)
  }

  const goNext = () => {
    const sLen = currentSection?.questions?.length || 0
    if (currentQIdx < sLen - 1) {
      setCurrentQIdx(i => i + 1)
    } else if (currentSectionIdx < sections.length - 1) {
      setCurrentSectionIdx(i => i + 1)
      setCurrentQIdx(0)
    }
  }

  const goPrev = () => {
    if (currentQIdx > 0) {
      setCurrentQIdx(i => i - 1)
    } else if (currentSectionIdx > 0) {
      setCurrentSectionIdx(i => i - 1)
      const prevLen = sections[currentSectionIdx - 1]?.questions?.length || 0
      setCurrentQIdx(prevLen - 1)
    }
  }

  const handleSubmit = async (trigger = 'manual') => {
    setSubmitting(true)
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000)
    try {
      const res = await testAPI.submitAttempt(attemptId, { time_taken_seconds: timeTaken, trigger })
      navigate(`/result/${attemptId}`, { replace: true })
    } catch (err) {
      toast.error('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
      setShowSubmitModal(false)
    }
  }

  const { formatted, isWarning, isDanger } = useTimer(timeRemaining, () => handleSubmit('timeout'))

  const getQStatus = (qId) => {
    const r = responses[qId]
    if (r?.marked && r?.selected) return 'marked-answered'
    if (r?.marked) return 'marked'
    if (r?.selected) return 'answered'
    return 'unanswered'
  }

  const counts = {
    answered: allQuestionsFlat.filter(q => responses[q.id]?.selected && !responses[q.id]?.marked).length,
    marked: allQuestionsFlat.filter(q => responses[q.id]?.marked && !responses[q.id]?.selected).length,
    markedAnswered: allQuestionsFlat.filter(q => responses[q.id]?.marked && responses[q.id]?.selected).length,
    skipped: allQuestionsFlat.filter(q => !responses[q.id]?.selected).length,
  }

  if (loading) return <Spinner center size="lg" />
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 max-w-md text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="font-bold text-lg mb-2">Cannot Start Test</h2>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button onClick={() => navigate(-1)} className="btn-secondary">Go Back</button>
      </div>
    </div>
  )

  const isFirst = currentSectionIdx === 0 && currentQIdx === 0
  const isLast = currentSectionIdx === sections.length - 1 && currentQIdx === (currentSection?.questions?.length || 1) - 1

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => setNavOpen(o => !o)} className="btn-ghost p-2 lg:hidden">
            {navOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div>
            <p className=" hidden sm:block font-bold text-sm text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-sm">{paper?.title}</p>
            <p className="text-xs text-gray-500">{globalQIndex + 1}/{allQuestionsFlat.length} Questions</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {tabSwitches > 0 && (
            <span className=" hidden sm:inline text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-lg">
              ⚠️ {tabSwitches} tab switch{tabSwitches > 1 ? 'es' : ''}
            </span>
          )}
          <div className={`flex items-center gap-2 font-bold text-lg tabular-nums px-4 py-1.5 rounded-xl ${isDanger ? 'bg-red-100 text-red-600' : isWarning ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
            }`}>
            <Clock className="w-5 h-5" /> {formatted}
          </div>
          <button onClick={() => setShowSubmitModal(true)} className="btn-primary text-sm gap-2">
            <Send className="w-4 h-4" /> Submit
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Question Navigator Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-20 w-72 bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-800 overflow-y-auto
          transform transition-transform duration-200
          ${navOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          top-[61px] lg:top-0
        `}>
          <div className="p-4">
            {/* Legend */}
            <div className="grid grid-cols-2 gap-1.5 mb-4 text-xs">
              {[
                { cls: 'bg-brand border-brand text-white', label: 'Answered' },
                { cls: 'bg-red-100 border-red-300 text-red-700', label: 'Not Visited' },
                { cls: 'bg-purple-500 border-purple-500 text-white', label: 'Marked' },
                { cls: 'bg-purple-500 border-purple-500 text-white ring-2 ring-green-400', label: 'Marked+Answered' },
              ].map(({ cls, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-[9px] font-bold ${cls}`}>1</div>
                  <span className="text-gray-600 dark:text-gray-400">{label}</span>
                </div>
              ))}
            </div>

            {/* Counts */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: 'Answered', value: counts.answered, color: 'text-green-600' },
                { label: 'Skipped', value: counts.skipped, color: 'text-gray-500' },
                { label: 'Marked', value: counts.marked, color: 'text-purple-600' },
                { label: 'M+Answered', value: counts.markedAnswered, color: 'text-indigo-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2 text-center">
                  <p className={`font-bold text-lg ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Question grid by section */}
            {sections.map((sec, si) => (
              <div key={si} className="mb-4">
                {isSectioned && (
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    {sec.section_name}
                  </p>
                )}
                <div className="grid grid-cols-6 gap-1.5">
                  {(sec.questions || []).map((q, qi) => {
                    const status = getQStatus(q.id)
                    const isCurrent = si === currentSectionIdx && qi === currentQIdx
                    return (
                      <button
                        key={q.id}
                        onClick={() => goTo(si, qi)}
                        className={`q-nav-btn ${status} ${isCurrent ? 'current' : ''}`}
                      >
                        {sections.slice(0, si).reduce((acc, s) => acc + (s.questions?.length || 0), 0) + qi + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main question area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {currentQ && (
            <div className="max-w-3xl mx-auto animate-fade-in">
              {/* Section header */}
              {isSectioned && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="badge badge-blue">{currentSection.section_name}</span>
                  {currentSection.duration_minutes && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {currentSection.duration_minutes} min
                    </span>
                  )}
                </div>
              )}

              {/* Question */}
              <div className="card p-6 mb-4">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand text-white text-sm font-bold flex items-center justify-center">
                      {globalQIndex + 1}
                    </span>
                    <div
                      className="text-gray-900 dark:text-white font-medium leading-relaxed text-base"
                      dangerouslySetInnerHTML={{
                        __html: currentQ.question_text
                          ? currentQ.question_text.includes('<')
                            ? currentQ.question_text
                            : currentQ.question_text.replace(/\n/g, '<br />')
                          : ''
                      }}
                    />
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {getOptionKeys(currentQ).map((key) => {
                    const optionText = currentQ[`option_${key}`]
                    const labelIndex = ALL_OPTION_KEYS.indexOf(key)
                    const isSelected = responses[currentQ.id]?.selected === key
                    return (
                      <button
                        key={key}
                        onClick={() => handleSelect(key)}
                        className={`option-btn ${isSelected ? 'selected' : ''}`}
                      >
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-3
                          ${isSelected ? 'bg-brand text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                          {ALL_OPTION_LABELS[labelIndex]}
                        </span>
                        {optionText}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMark}
                    className={`btn-ghost text-sm gap-2 ${responses[currentQ.id]?.marked ? 'text-purple-600 bg-purple-50' : ''}`}
                  >
                    <Flag className={`w-4 h-4 ${responses[currentQ.id]?.marked ? 'fill-purple-500 text-purple-500' : ''}`} />
                    {responses[currentQ.id]?.marked ? 'Unmark' : 'Mark for Review'}
                  </button>
                  <button
                    onClick={() => setResponses(prev => ({ ...prev, [currentQ.id]: { ...prev[currentQ.id], selected: null } }))}
                    className="btn-ghost text-sm text-red-500"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={goPrev} disabled={isFirst} className="btn-secondary text-sm gap-1 disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  {isLast ? (
                    <button onClick={() => setShowSubmitModal(true)} className="btn-primary text-sm gap-1">
                      <Send className="w-4 h-4" /> Submit Test
                    </button>
                  ) : (
                    <button onClick={goNext} className="btn-primary text-xs sm:text-sm gap-1 px-3 sm:px-4">
                      Next <ChevronRight className="hidden sm:inline w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Overlay for mobile nav */}
      {navOpen && (
        <div className="fixed inset-0 bg-black/30 z-10 lg:hidden" onClick={() => setNavOpen(false)} />
      )}

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative card max-w-md w-full p-6 shadow-2xl rounded-2xl animate-slide-up">
            <h2 className="font-bold text-xl text-gray-900 dark:text-white mb-2">Submit Test?</h2>
            <p className="text-gray-500 text-sm mb-5">
              Are you sure you want to submit? You cannot change your answers after submission.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-5 text-center text-sm">
              {[
                { label: 'Answered', value: counts.answered, color: 'text-green-600' },
                { label: 'Skipped', value: counts.skipped, color: 'text-red-500' },
                { label: 'Marked', value: counts.marked, color: 'text-purple-600' },
                { label: 'Total', value: allQuestionsFlat.length, color: 'text-gray-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <p className={`font-bold text-xl ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {counts.skipped > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl mb-5 text-sm text-yellow-700 dark:text-yellow-300">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>You have {counts.skipped} unanswered questions.</span>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowSubmitModal(false)} className="btn-secondary flex-1">
                Continue Test
              </button>
              <button onClick={() => handleSubmit('manual')} disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Submitting...' : 'Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestPage
