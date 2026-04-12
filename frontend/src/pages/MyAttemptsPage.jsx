import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { testAPI } from '../services/api'
import { Spinner, EmptyState, Pagination } from '../components/common'
import { Clock, Target, CheckCircle, FileText, BarChart2 } from 'lucide-react'

const fmtTime = (s) => { if (!s) return '—'; const m = Math.floor(s / 60); return `${m}m ${s % 60}s` }
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const MyAttemptsPage = () => {
  const [attempts, setAttempts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const load = (p = 1) => {
    setLoading(true)
    testAPI.getMyAttempts({ page: p, limit: 10 })
      .then(r => { setAttempts(r.data.data.attempts); setTotal(r.data.data.total) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page])

  const statusColor = (s) => ({
    completed: 'text-green-600 bg-green-100',
    timed_out: 'text-yellow-600 bg-yellow-100',
    in_progress: 'text-blue-600 bg-blue-100',
    abandoned: 'text-gray-500 bg-gray-100',
  }[s] || 'text-gray-500 bg-gray-100')

  if (loading && page === 1) return <Spinner center size="lg" />

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-white mb-6">
        My Test Attempts ({total})
      </h1>

      {attempts.length === 0 ? (
        <EmptyState icon={FileText} title="No attempts yet"
          desc="Start your first mock test to see your history here."
          action={<Link to="/search" className="btn-primary">Browse Tests</Link>} />
      ) : (
        <div className="space-y-4">
          {attempts.map(a => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`badge ${statusColor(a.status)} capitalize`}>
                      {a.status === 'timed_out' ? 'Timed Out' : a.status}
                    </span>
                    <span className="text-xs text-gray-400">{a.category_name}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white truncate">{a.paper_title}</h3>
                  <p className="text-xs text-gray-500">{a.exam_name}</p>
                </div>

                {(a.status === 'completed' || a.status === 'timed_out') && (
                  <Link to={`/result/${a.id}`} className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0 gap-1">
                    <BarChart2 className="w-3.5 h-3.5" /> View Result
                  </Link>
                )}
              </div>

              {(a.status === 'completed' || a.status === 'timed_out') && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {[
                    { icon: Target, label: 'Score', value: `${Number(a.score).toFixed(0)}/${a.total_marks}` },
                    { icon: CheckCircle, label: 'Accuracy', value: `${Number(a.accuracy).toFixed(1)}%` },
                    { icon: Clock, label: 'Time', value: fmtTime(a.time_taken_seconds) },
                    { icon: FileText, label: 'Date', value: fmtDate(a.submitted_at) },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5 text-center">
                      <Icon className="w-4 h-4 text-brand mx-auto mb-1" />
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{value}</p>
                      <p className="text-xs text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {a.status === 'in_progress' && (
                <div className="mt-3">
                  <Link to={`/test/${a.paper_id}?attempt=${a.id}`} className="btn-primary text-sm w-full sm:w-auto">
                    Resume Test
                  </Link>
                </div>
              )}
            </div>
          ))}
          <Pagination page={page} pages={Math.ceil(total / 10)} onPage={setPage} />
        </div>
      )}
    </div>
  )
}

export default MyAttemptsPage
