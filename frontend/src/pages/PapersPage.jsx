import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { examAPI } from '../services/api'
import { Spinner, DifficultyBadge, SkeletonCard, EmptyState } from '../components/common'
import Ad from '../components/common/Ad'
import { useAuth } from '../context/AuthContext'
import { ChevronRight, Clock, FileText, Target, Play, CheckCircle } from 'lucide-react'

const PapersPage = () => {
  const { examSlug } = useParams()
  const { isAuthenticated } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    examAPI.getExamPapers(examSlug)
      .then(res => setData(res.data.data))
      .finally(() => setLoading(false))
  }, [examSlug])

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )

  const { exam, papers } = data || {}

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
        <Link to="/" className="hover:text-brand">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/exams" className="hover:text-brand">Exams</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={`/exams/${exam?.category_slug}`} className="hover:text-brand">{exam?.category_name}</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-700 dark:text-gray-300">{exam?.name}</span>
      </nav>

      <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-white mb-1">{exam?.name}</h1>
      <p className="text-gray-500 text-sm mb-6">{exam?.description} • {papers?.length} papers available</p>

      <Ad slot="banner" className="mb-6" />

      {!papers?.length ? (
        <EmptyState icon={FileText} title="No papers yet" desc="Papers will be added soon." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {papers.map(p => (
            <div key={p.id} className="card p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <DifficultyBadge level={p.difficulty} />
                  {p.year && <span className="badge badge-gray">{p.year}</span>}
                  {p.is_free
                    ? <span className="badge bg-green-100 text-green-700">Free</span>
                    : <span className="badge badge-blue">Premium</span>}
                </div>
                {p.last_attempt?.status === 'completed' && (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
              </div>

              <h2 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{p.title}</h2>
              {p.description && <p className="text-xs text-gray-500 mb-3 leading-relaxed">{p.description}</p>}

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {p.duration_minutes} min</span>
                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {p.total_questions} Qs</span>
                <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {p.total_marks} marks</span>
              </div>

              {p.last_attempt && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 mb-3 text-xs flex items-center justify-between">
                  <span className="text-gray-500">Last attempt:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {Number(p.last_attempt.score).toFixed(0)}/{p.total_marks} ({Number(p.last_attempt.accuracy).toFixed(1)}%)
                  </span>
                </div>
              )}

              <div className="flex gap-2 mt-auto">
                <Link to={`/paper/${p.id}`} className="btn-secondary flex-1 text-sm text-center">Details</Link>
                <Link to={`/paper/${p.id}`} className="btn-primary flex-1 text-sm gap-1">
                  <Play className="w-4 h-4" />
                  {p.last_attempt ? 'Reattempt' : 'Start'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PapersPage
