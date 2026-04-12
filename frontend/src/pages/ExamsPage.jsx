import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { examAPI } from '../services/api'
import { Spinner, DifficultyBadge, SkeletonCard, EmptyState } from '../components/common'
import Ad from '../components/common/Ad'
import { ChevronRight, FileText, BookOpen } from 'lucide-react'

const ExamsPage = () => {
  const { categorySlug } = useParams()
  const [data, setData] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchers = categorySlug
      ? [examAPI.getCategory(categorySlug)]
      : [examAPI.getCategories()]

    Promise.all(fetchers)
      .then(([res]) => {
        if (categorySlug) setData(res.data.data)
        else setCategories(res.data.data)
      })
      .finally(() => setLoading(false))
  }, [categorySlug])

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )

  // All categories view
  if (!categorySlug) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-white mb-2">All Exam Categories</h1>
        <p className="text-gray-500 text-sm mb-6">Select a category to explore available exams and mock tests.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map(cat => (
            <Link key={cat.id} to={`/exams/${cat.slug}`}
              className="card p-5 flex items-center justify-between gap-4 hover:shadow-md hover:border-brand/30 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ backgroundColor: cat.color + '20' }}>
                  {cat.icon}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white group-hover:text-brand transition-colors">{cat.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>
                  <p className="text-xs font-semibold text-brand mt-1">{cat.exam_count} Exam Types</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand group-hover:translate-x-1 transition-all flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // Category → Exams view
  const { category, exams } = data || {}
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
        <Link to="/" className="hover:text-brand">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/exams" className="hover:text-brand">Exams</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-700 dark:text-gray-300">{category?.name}</span>
      </nav>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
          style={{ backgroundColor: category?.color + '20' }}>
          {category?.icon}
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-white">{category?.name}</h1>
          <p className="text-gray-500 text-sm">{category?.description}</p>
        </div>
      </div>

      <Ad slot="banner" className="mb-6" />

      {!exams?.length ? (
        <EmptyState icon={BookOpen} title="No exams found" desc="No exams available in this category yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {exams.map(exam => (
            <Link key={exam.id} to={`/exams/${exam.slug}/papers`}
              className="card p-5 hover:shadow-md hover:border-brand/30 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white group-hover:text-brand transition-colors">
                    {exam.name}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{exam.description}</p>
                </div>
                <DifficultyBadge level={exam.difficulty} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand" />
                  <strong className="text-gray-700 dark:text-gray-300">{exam.paper_count}</strong> Papers
                </span>
                <span className="text-brand font-semibold group-hover:underline flex items-center gap-1">
                  View Papers <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default ExamsPage
