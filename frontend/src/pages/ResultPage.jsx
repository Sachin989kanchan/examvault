import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { testAPI } from '../services/api'
import { Spinner, DifficultyBadge } from '../components/common'
import Ad from '../components/common/Ad'
import {
  CheckCircle, XCircle, MinusCircle, Trophy, Clock,
  Target, TrendingUp, BarChart2, ChevronDown, ChevronUp,
  RotateCcw, Home, ArrowRight
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend
} from 'recharts'

const COLORS = ['#22c55e', '#ef4444', '#94a3b8']
const fmtTime = (s) => { if (!s) return '—'; const m = Math.floor(s / 60); return `${m}m ${s % 60}s` }

const ResultPage = () => {
  const { attemptId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedQ, setExpandedQ] = useState(null)
  const [filter, setFilter] = useState('all') // all | correct | wrong | skipped

  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    const blockBack = () => {
      window.history.pushState(null, '', window.location.href)
    }
    window.addEventListener('popstate', blockBack)
    return () => window.removeEventListener('popstate', blockBack)
  }, [])
  useEffect(() => {
    testAPI.getResult(attemptId)
      .then(res => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [attemptId])

  if (loading) return <Spinner center size="lg" />
  if (!data) return <div className="text-center py-16 text-gray-500">Result not found</div>

  const { attempt, section_analysis, responses } = data

  const pieData = [
    { name: 'Correct', value: attempt.correct_count },
    { name: 'Wrong', value: attempt.wrong_count },
    { name: 'Skipped', value: attempt.skipped_count },
  ]

  const radarData = section_analysis.map(s => ({
    section: s.section_name?.split(' ').slice(0, 2).join(' '),
    accuracy: s.total_questions > 0 ? Math.round(((s.correct || 0) / s.total_questions) * 100) : 0,
  }))

  const percentage = attempt.total_marks > 0
    ? Math.round((attempt.score / attempt.total_marks) * 100)
    : 0

  const passed = attempt.score >= (attempt.total_marks * 0.4)

  const filteredResponses = responses.filter(r => {
    if (filter === 'correct') return r.is_correct === 1
    if (filter === 'wrong') return r.is_correct === 0
    if (filter === 'skipped') return r.selected_option === null
    return true
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Score header */}
      <div className={`card p-8 mb-6 text-center relative overflow-hidden ${passed ? 'bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20' : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20'}`}>
        <div className="relative z-10">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold
            ${passed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            {percentage}%
          </div>

          <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-white mb-1">
            {passed ? '🎉 Congratulations!' : 'Better Luck Next Time!'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{attempt.paper_title}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { icon: Trophy, label: 'Score', value: `${Number(attempt.score).toFixed(0)}/${attempt.total_marks}`, color: 'text-yellow-600' },
              { icon: Target, label: 'Accuracy', value: `${Number(attempt.accuracy).toFixed(1)}%`, color: 'text-brand' },
              { icon: Clock, label: 'Time Taken', value: fmtTime(attempt.time_taken_seconds), color: 'text-blue-600' },
              { icon: TrendingUp, label: 'Rank', value: attempt.rank_position ? `#${attempt.rank_position}` : '—', color: 'text-purple-600' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                <p className={`font-bold text-xl ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {attempt.percentile != null && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
              You scored better than <strong className="text-brand">{Number(attempt.percentile).toFixed(1)}%</strong> of all test takers
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Pie chart */}
        <div className="card p-5">
          <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-gray-400" /> Answer Summary
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" iconSize={10} />
            </PieChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs">
            {[
              { label: 'Correct', value: attempt.correct_count, color: 'text-green-600 bg-green-50' },
              { label: 'Wrong', value: attempt.wrong_count, color: 'text-red-600 bg-red-50' },
              { label: 'Skipped', value: attempt.skipped_count, color: 'text-gray-600 bg-gray-50' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-xl p-2 ${color}`}>
                <p className="font-bold text-lg">{value}</p>
                <p>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section analysis */}
        {section_analysis.length > 0 && (
          <div className="card p-5">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Section Analysis</h3>
            <div className="space-y-3">
              {section_analysis.map((sec, i) => {
                const acc = sec.total_questions > 0 ? Math.round(((sec.correct || 0) / sec.total_questions) * 100) : 0
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{sec.section_name}</span>
                      <span className="font-bold text-gray-900 dark:text-white">{acc}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${acc >= 70 ? 'bg-green-500' : acc >= 40 ? 'bg-yellow-400' : 'bg-red-500'}`}
                        style={{ width: `${acc}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>✓{sec.correct || 0} ✗{sec.wrong || 0} −{sec.skipped || 0}</span>
                      <span>{Number(sec.marks_obtained || 0).toFixed(1)} marks</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Radar chart */}
        {radarData.length > 1 && (
          <div className="card p-5">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Performance Radar</h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="section" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} />
                <Radar name="Accuracy" dataKey="accuracy" stroke="#00b386" fill="#00b386" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link to="/" className="btn-secondary gap-2"><Home className="w-4 h-4" /> Home</Link>
        <Link to={`/paper/${attempt.paper_id}`} className="btn-secondary gap-2"><RotateCcw className="w-4 h-4" /> Reattempt</Link>
        <Link to="/search" className="btn-primary gap-2">Browse More Tests <ArrowRight className="w-4 h-4" /></Link>
      </div>

      <Ad slot="banner" className="mb-6" />

      {/* Question review */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 dark:text-white">Question Review</h3>
          <div className="flex gap-2">
            {['all', 'correct', 'wrong', 'skipped'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold capitalize transition-colors ${filter === f ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredResponses.map((r, i) => {
            const isOpen = expandedQ === r.question_id
            const isCorrect = r.is_correct === 1
            const isWrong = r.is_correct === 0
            const isSkipped = r.selected_option === null

            return (
              <div key={r.question_id} className={`border-2 rounded-xl overflow-hidden transition-all ${isCorrect ? 'border-green-200 dark:border-green-900' :
                isWrong ? 'border-red-200 dark:border-red-900' :
                  'border-gray-200 dark:border-gray-800'
                }`}>
                <button
                  onClick={() => setExpandedQ(isOpen ? null : r.question_id)}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {isCorrect ? <CheckCircle className="w-5 h-5 text-green-500" /> :
                      isWrong ? <XCircle className="w-5 h-5 text-red-500" /> :
                        <MinusCircle className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-gray-500 mr-2">Q{i + 1}.</span>
                    <span
                      className="text-sm text-gray-800 dark:text-gray-200"
                      dangerouslySetInnerHTML={{
                        __html: r.question_text
                          ? r.question_text.includes('<')
                            ? r.question_text
                            : r.question_text.replace(/\n/g, '<br />')
                          : ''
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold ${isCorrect ? 'text-green-600' : isWrong ? 'text-red-600' : 'text-gray-400'}`}>
                      {Number(r.marks_obtained).toFixed(2)} marks
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-2">
                    {['a', 'b', 'c', 'd', 'e'].filter(key => r[`option_${key}`] != null && r[`option_${key}`] !== '').map((key) => {
                      const text = r[`option_${key}`]
                      const isSelected = r.selected_option === key
                      const isCorrectOpt = r.correct_option === key
                      return (
                        <div key={key} className={`flex items-start gap-3 px-3 py-2 rounded-xl text-sm ${isCorrectOpt ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                          isSelected && !isCorrectOpt ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                            'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}>
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                            ${isCorrectOpt ? 'bg-green-500 text-white' : isSelected ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {key.toUpperCase()}
                          </span>
                          <span>{text}</span>
                          {isCorrectOpt && <CheckCircle className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />}
                          {isSelected && !isCorrectOpt && <XCircle className="w-4 h-4 text-red-500 ml-auto flex-shrink-0" />}
                        </div>
                      )
                    })}
                    {r.explanation && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">Explanation</p>
                        <p
                          className="text-sm text-blue-800 dark:text-blue-200"
                          dangerouslySetInnerHTML={{
                            __html: r.explanation
                              ? r.explanation.includes('<')
                                ? r.explanation
                                : r.explanation.replace(/\n/g, '<br />')
                              : ''
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ResultPage
