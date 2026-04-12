import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { testAPI, examAPI } from '../services/api'
import { StatCard, Spinner, EmptyState, DifficultyBadge } from '../components/common'
import Ad from '../components/common/Ad'
import {
  Target, CheckCircle, Clock, TrendingUp, Play,
  FileText, BarChart2, ArrowRight, BookOpen
} from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

const fmt = (n) => n != null ? Number(n).toFixed(1) : '—'
const fmtTime = (secs) => {
  if (!secs) return '—'
  const m = Math.floor(secs / 60), s = secs % 60
  return `${m}m ${s}s`
}

const DashboardPage = () => {
  const { user } = useAuth()
  const [dash, setDash] = useState(null)
  const [loading, setLoading] = useState(true)
  const [featured, setFeatured] = useState([])

  useEffect(() => {
    Promise.all([testAPI.getDashboard(), examAPI.getFeatured()])
      .then(([dashRes, featRes]) => {
        setDash(dashRes.data.data)
        setFeatured(featRes.data.data?.slice(0, 3) || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner center size="lg" />

  const { stats, recent, inProgress, categoryPerf } = dash || {}

  const categoryChartData = (categoryPerf || []).map(c => ({
    category: c.category.split(' ')[0],
    accuracy: Number(c.avg_accuracy || 0).toFixed(1),
    attempts: c.attempts,
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Greeting */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-white">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">Keep up the great work with your preparation!</p>
        </div>
        <Link to="/search" className="btn-primary hidden sm:inline-flex">
          <FileText className="w-4 h-4" /> Start New Test
        </Link>
      </div>

      {/* Resume in-progress tests */}
      {inProgress?.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <Play className="w-5 h-5 text-brand" /> Resume Tests
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inProgress.map(a => (
              <div key={a.id} className="card p-4 border-l-4 border-brand">
                <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{a.paper_title}</p>
                <p className="text-xs text-gray-500 mb-3">{a.exam_name}</p>
                <Link to={`/test/${a.paper_id}?attempt=${a.id}`}
                  className="btn-primary w-full text-sm">
                  <Play className="w-4 h-4" /> Resume Test
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Tests Attempted" value={stats?.total_attempts ?? 0} icon={FileText} color="blue" />
        <StatCard label="Tests Completed" value={stats?.completed ?? 0} icon={CheckCircle} color="green" />
        <StatCard label="Avg. Accuracy" value={stats?.avg_accuracy ? `${fmt(stats.avg_accuracy)}%` : '—'} icon={Target} color="brand" />
        <StatCard label="Best Score" value={stats?.best_score != null ? Number(stats.best_score).toFixed(0) : '—'} icon={TrendingUp} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent attempts */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" /> Recent Attempts
          </h2>

          {recent?.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No tests attempted yet"
              desc="Start your first mock test to see your performance here."
              action={<Link to="/search" className="btn-primary">Browse Tests</Link>}
            />
          ) : (
            <div className="space-y-3">
              {recent?.map(a => (
                <div key={a.id} className="card p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold
                    ${a.status === 'completed' || a.status === 'timed_out' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {a.score != null ? `${Number(a.score).toFixed(0)}` : '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{a.paper_title}</p>
                    <p className="text-xs text-gray-500">{a.exam_name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs font-semibold ${a.status === 'completed' ? 'text-green-600' : a.status === 'timed_out' ? 'text-yellow-600' : 'text-gray-500'}`}>
                        {a.status === 'timed_out' ? 'Timed Out' : a.status}
                      </span>
                      {a.accuracy != null && (
                        <span className="text-xs text-gray-400">Accuracy: {fmt(a.accuracy)}%</span>
                      )}
                    </div>
                  </div>
                  {(a.status === 'completed' || a.status === 'timed_out') && (
                    <Link to={`/result/${a.id}`} className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0">
                      View Result
                    </Link>
                  )}
                </div>
              ))}
              <Link to="/my-attempts" className="btn-ghost text-sm flex items-center gap-1">
                View all attempts <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Category Performance Chart */}
          {categoryChartData.length > 0 && (
            <div className="card p-5">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-gray-400" /> Category Performance
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Accuracy']} />
                  <Bar dataKey="accuracy" fill="#00b386" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Ad slot="rectangle" />

          {/* Recommended tests */}
          <div className="card p-4">
            <h3 className="font-bold text-gray-800 dark:text-white mb-3 text-sm">Recommended Tests</h3>
            <div className="space-y-3">
              {featured.map(p => (
                <Link key={p.id} to={`/paper/${p.id}`}
                  className="flex items-center gap-3 group hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 -mx-2 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-lg flex-shrink-0">
                    {p.category_icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-brand">
                      {p.title}
                    </p>
                    <p className="text-xs text-gray-400">{p.duration_minutes}m • {p.total_questions}Qs</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand flex-shrink-0" />
                </Link>
              ))}
              <Link to="/search" className="btn-secondary w-full text-sm mt-2">Browse All Tests</Link>
            </div>
          </div>

          {/* Quick links */}
          <div className="card p-4">
            <h3 className="font-bold text-gray-800 dark:text-white mb-3 text-sm">Quick Links</h3>
            <div className="space-y-2">
              {[
                { to: '/exams', label: 'Browse Categories', icon: BookOpen },
                { to: '/my-attempts', label: 'My Test History', icon: Clock },
                { to: '/profile', label: 'Edit Profile', icon: Target },
              ].map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Icon className="w-4 h-4 text-gray-400" /> {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
