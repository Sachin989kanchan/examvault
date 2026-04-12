import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { examAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Spinner, DifficultyBadge, SkeletonCard } from '../components/common'
import Ad from '../components/common/Ad'
import {
  ArrowRight, Search, Clock, FileText, Target,
  Users, Trophy, BookOpen, TrendingUp, ChevronRight, Zap
} from 'lucide-react'

const STATS = [
  { label: 'Registered Students', value: '8.2 Crore+', icon: Users },
  { label: 'Student Selections', value: '4+ Lacs', icon: Trophy },
  { label: 'Tests Attempted', value: '242 Crore+', icon: Target },
  { label: 'Questions Available', value: '50 Lacs+', icon: FileText },
]

const CategoryCard = ({ cat }) => (
  <Link
    to={`/exams/${cat.slug}`}
    className="card p-5 flex items-center justify-between gap-4 hover:shadow-md hover:border-brand/30 transition-all duration-200 group"
  >
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ backgroundColor: cat.color + '20' }}>
        {cat.icon}
      </div>
      <div>
        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-brand transition-colors">
          {cat.name}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">{cat.exam_count} Exam Types</p>
      </div>
    </div>
    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand group-hover:translate-x-1 transition-all" />
  </Link>
)

const PaperCard = ({ paper }) => (
  <div className="card p-5 hover:shadow-md transition-shadow group">
    <div className="flex items-start justify-between mb-3">
      <span className="text-xs font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
        {paper.category_icon} {paper.category_name}
      </span>
      <DifficultyBadge level={paper.difficulty} />
    </div>
    <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-sm leading-tight">
      {paper.paper_title || paper.title}
    </h3>
    <p className="text-xs text-gray-500 mb-4">{paper.exam_name}</p>
    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {paper.duration_minutes} min</span>
      <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {paper.total_questions} Qs</span>
      <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {paper.total_marks} marks</span>
    </div>
    <Link to={`/paper/${paper.id}`} className="btn-primary w-full text-sm">
      Start Test <ArrowRight className="w-4 h-4" />
    </Link>
  </div>
)

const HomePage = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')

  useEffect(() => {
    Promise.all([examAPI.getCategories(), examAPI.getFeatured()])
      .then(([catRes, featRes]) => {
        setCategories(catRes.data.data || [])
        setFeatured(featRes.data.data || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQ.trim()) navigate(`/search?q=${encodeURIComponent(searchQ)}`)
  }

  return (
    <div>
      {/* Header Ad */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <Ad slot="banner" />
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-teal-50 via-green-50 to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-green-200 dark:border-gray-700 rounded-full px-4 py-1.5 mb-6 shadow-sm">
                <Zap className="w-4 h-4 text-brand" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">India's No.1 Exam Preparation Platform</span>
              </div>

              <h1 className="font-display font-bold text-4xl sm:text-5xl text-gray-900 dark:text-white leading-tight mb-4">
                One Destination for<br />
                <span className="text-brand">Complete Exam Preparation</span>
              </h1>

              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                {['Learn', 'Practice', 'Improve', 'Succeed'].map((s, i) => (
                  <span key={s} className="flex items-center gap-2">
                    {i > 0 && <span className="text-gray-300">→</span>}
                    <span className="font-semibold">{s}</span>
                  </span>
                ))}
              </div>

              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                Start your preparation for government exams. For Free! Practice with lakhs of questions and get detailed analytics.
              </p>

              {/* Search bar */}
              <form onSubmit={handleSearch} className="flex gap-3 mb-8 max-w-lg">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Search exams, mock tests..."
                    className="input pl-11 py-3 text-base"
                  />
                </div>
                <button type="submit" className="btn-primary px-6 py-3">Search</button>
              </form>

              <div className="flex flex-wrap gap-6">
                {[
                  { label: 'Papers', value: '10+', icon: FileText },
                  { label: 'Exams', value: '18+', icon: BookOpen },
                  { label: 'Categories', value: '8', icon: Target },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-brand" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{value}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden lg:flex justify-center">
              <div className="relative w-80 h-80">
                <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-teal-300/20 rounded-3xl" />
                <div className="absolute inset-4 grid grid-cols-2 gap-4">
                  {[
                    { label: 'Accuracy', value: '92%', color: 'bg-green-100' },
                    { label: 'Rank', value: '#1', color: 'bg-blue-100' },
                    { label: 'Tests Done', value: '47', color: 'bg-purple-100' },
                    { label: 'Score', value: '98/100', color: 'bg-yellow-100' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`${color} rounded-2xl flex flex-col items-center justify-center p-4`}>
                      <p className="text-2xl font-bold text-gray-800">{value}</p>
                      <p className="text-xs text-gray-600 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ad below hero */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Ad slot="leaderboard" />
      </div>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-white">Browse by Category</h2>
          <p className="text-gray-500 text-sm mt-1">Click any category to explore papers</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => <CategoryCard key={cat.id} cat={cat} />)}
          </div>
        )}
      </section>

      {/* Ad between sections */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Ad slot="banner" />
      </div>

      {/* Featured Papers */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-white">Popular Mock Tests</h2>
              <p className="text-gray-500 text-sm mt-1">Most attempted tests by students</p>
            </div>
            <Link to="/search" className="btn-ghost text-sm">View All <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.slice(0, 4).map(paper => <PaperCard key={paper.id} paper={paper} />)}
          </div>
        </section>
      )}

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="bg-gradient-to-r from-brand to-teal-500 rounded-2xl p-8 text-white text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="font-display font-bold text-2xl mb-2">Start Your Journey Today</h2>
            <p className="opacity-90 mb-6">Join 8 crore+ students preparing with ExamVault. It's completely free to get started.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/register" className="bg-white text-brand font-bold px-6 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                Sign Up Free
              </Link>
              <Link to="/exams" className="border border-white/40 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-white/10 transition-colors">
                Browse Exams
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer Ad */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <Ad slot="banner" />
      </div>
    </div>
  )
}

export default HomePage
