import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { examAPI, testAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Spinner, DifficultyBadge } from '../components/common'
import Ad from '../components/common/Ad'
import toast from 'react-hot-toast'
import {
  Clock, FileText, Target, CheckCircle, AlertTriangle,
  ChevronRight, Play, RotateCcw, Shuffle, Lock
} from 'lucide-react'

const PaperDetailPage = () => {
  const { paperId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    examAPI.getPaperDetails(paperId)
      .then(res => setData(res.data.data))
      .catch(() => toast.error('Paper not found'))
      .finally(() => setLoading(false))
  }, [paperId])

  const handleStart = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/paper/${paperId}` } } })
      return
    }
    setStarting(true)
    try {
      const res = await testAPI.startAttempt(paperId)
      const attemptId = res.data.data.attempt.id
      navigate(`/test/${paperId}?attempt=${attemptId}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start test')
    } finally {
      setStarting(false)
    }
  }

  if (loading) return <Spinner center size="lg" />
  if (!data) return <div className="text-center py-16 text-gray-500">Paper not found</div>

  const { paper, sections } = data

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
        <Link to="/" className="hover:text-brand">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/exams" className="hover:text-brand">Exams</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={`/exams/${paper.category_slug}`} className="hover:text-brand">{paper.category_name}</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={`/exams/${paper.exam_slug}/papers`} className="hover:text-brand">{paper.exam_name}</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{paper.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-6">
            <div className="flex items-start gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DifficultyBadge level={paper.difficulty} />
                  {paper.year && <span className="badge badge-gray">Year: {paper.year}</span>}
                  {paper.is_free ? (
                    <span className="badge bg-green-100 text-green-700">Free</span>
                  ) : (
                    <span className="badge badge-blue">Premium</span>
                  )}
                </div>
                <h1 className="font-display font-bold text-xl text-gray-900 dark:text-white leading-tight">
                  {paper.title}
                </h1>
                {paper.description && (
                  <p className="text-sm text-gray-500 mt-2">{paper.description}</p>
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              {[
                { icon: Clock, label: 'Duration', value: `${paper.duration_minutes} min` },
                { icon: FileText, label: 'Questions', value: paper.total_questions },
                { icon: Target, label: 'Total Marks', value: paper.total_marks },
                { icon: CheckCircle, label: 'Passing', value: paper.passing_marks },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                  <Icon className="w-5 h-5 text-brand mx-auto mb-1" />
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Marking scheme */}
            <div className="flex flex-wrap gap-4 text-sm mb-5 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">+</span>
                <span className="text-gray-700 dark:text-gray-300">{paper.marks_per_question} marks per correct answer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">−</span>
                <span className="text-gray-700 dark:text-gray-300">{paper.negative_marks} marks for wrong answer</span>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Shuffle, label: 'Questions shuffled', active: paper.shuffle_questions },
                { icon: Shuffle, label: 'Options shuffled', active: paper.shuffle_options },
                { icon: Lock, label: 'Section locking', active: paper.section_locking },
                { icon: RotateCcw, label: 'Re-attempt allowed', active: paper.allow_reattempt },
              ].map(({ icon: Icon, label, active }) => (
                <div key={label} className={`flex items-center gap-2 text-sm ${active ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`}>
                  <Icon className={`w-4 h-4 ${active ? 'text-brand' : 'text-gray-300'}`} />
                  {label}: <strong className={active ? 'text-brand' : ''}>{active ? 'Yes' : 'No'}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Sections */}
          {sections?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4">Sections</h2>
              <div className="space-y-3">
                {sections.map((sec, i) => (
                  <div key={sec.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{sec.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{sec.total_questions} Qs</span>
                      {sec.duration_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{sec.duration_minutes}m</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Ad slot="banner" />
        </div>

        {/* Sidebar CTA */}
        <div className="space-y-4">
          <div className="card p-6 sticky top-20">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4">Ready to start?</h2>

            <div className="space-y-2 mb-5 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Timer will start immediately after you begin</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Your progress is auto-saved every 30 seconds</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span>Do not switch tabs or minimize the browser during the test</span>
              </div>
              {paper.attempt_limit > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span>Attempt limit: {paper.attempt_limit} time(s)</span>
                </div>
              )}
            </div>

            <button
              onClick={handleStart}
              disabled={starting}
              className="btn-primary w-full py-3 text-base gap-2"
            >
              {starting ? (
                <><Spinner size="sm" /> Starting...</>
              ) : (
                <><Play className="w-5 h-5" /> {isAuthenticated ? 'Start Test' : 'Login to Start'}</>
              )}
            </button>

            {paper.last_attempt && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs text-gray-500 text-center">
                Last attempt: <strong className="text-gray-700 dark:text-gray-300">{Number(paper.last_attempt.score).toFixed(0)}/{paper.total_marks}</strong>
              </div>
            )}
          </div>

          <Ad slot="rectangle" />
        </div>
      </div>
    </div>
  )
}

export default PaperDetailPage
