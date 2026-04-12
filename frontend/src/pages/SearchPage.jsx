import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { examAPI } from '../services/api'
import { useDebounce } from '../hooks'
import { DifficultyBadge, EmptyState, Pagination, SkeletonCard } from '../components/common'
import Ad from '../components/common/Ad'
import { Search, Filter, Clock, FileText, Target, Play } from 'lucide-react'

const DIFFICULTIES = ['', 'easy', 'medium', 'hard']

const SearchPage = () => {
  const [sp, setSp] = useSearchParams()
  const [query, setQuery] = useState(sp.get('q') || '')
  const [category, setCategory] = useState(sp.get('category') || '')
  const [difficulty, setDifficulty] = useState(sp.get('difficulty') || '')
  const [papers, setPapers] = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const debouncedQ = useDebounce(query, 400)

  useEffect(() => { examAPI.getCategories().then(r => setCategories(r.data.data)) }, [])

  useEffect(() => {
    setLoading(true)
    const params = { page, limit: 12 }
    if (debouncedQ) params.q = debouncedQ
    if (category) params.category = category
    if (difficulty) params.difficulty = difficulty

    examAPI.search(params)
      .then(r => {
        setPapers(r.data.data.papers)
        setTotal(r.data.data.pagination.total)
      })
      .finally(() => setLoading(false))
  }, [debouncedQ, category, difficulty, page])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-white mb-6">Find Mock Tests</h1>

      {/* Search + Filters */}
      <div className="card p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={query} onChange={e => { setQuery(e.target.value); setPage(1) }}
            placeholder="Search exams, papers..." className="input pl-10" />
        </div>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }} className="input w-auto">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={difficulty} onChange={e => { setDifficulty(e.target.value); setPage(1) }} className="input w-auto">
          <option value="">All Levels</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        {(query || category || difficulty) && (
          <button onClick={() => { setQuery(''); setCategory(''); setDifficulty(''); setPage(1) }}
            className="btn-ghost text-sm text-red-500">Clear Filters</button>
        )}
      </div>

      <Ad slot="banner" className="mb-6" />

      <p className="text-sm text-gray-500 mb-4">
        {loading ? 'Searching...' : `${total} papers found`}
        {debouncedQ && <span> for "<strong>{debouncedQ}</strong>"</span>}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : papers.length === 0 ? (
        <EmptyState icon={Search} title="No results found"
          desc="Try different keywords or remove filters." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {papers.map(p => (
              <div key={p.id} className="card p-5 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                    {p.category_name}
                  </span>
                  <DifficultyBadge level={p.difficulty} />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{p.title}</h3>
                <p className="text-xs text-gray-500 mb-3">{p.exam_name} {p.year ? `• ${p.year}` : ''}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{p.duration_minutes}m</span>
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{p.total_questions} Qs</span>
                  <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" />{p.total_marks} marks</span>
                </div>
                <div className="flex gap-2 mt-auto">
                  <Link to={`/paper/${p.id}`} className="btn-secondary flex-1 text-xs text-center py-2">Details</Link>
                  <Link to={`/paper/${p.id}`} className="btn-primary flex-1 text-xs gap-1 py-2">
                    <Play className="w-3.5 h-3.5" /> Start
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} pages={Math.ceil(total / 12)} onPage={setPage} />
        </>
      )}
    </div>
  )
}

export default SearchPage
