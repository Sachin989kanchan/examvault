import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Loading spinner
export const Spinner = ({ size = 'md', center = false }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  const el = (
    <div className={`${sizes[size]} border-[3px] border-brand/30 border-t-brand rounded-full animate-spin`} />
  )
  return center ? <div className="flex justify-center items-center py-16">{el}</div> : el
}

// Protected route
export const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, initializing } = useAuth()
  if (initializing) return <Spinner center size="lg" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}

// Difficulty badge
export const DifficultyBadge = ({ level }) => {
  const styles = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`badge ${styles[level] || styles.medium} capitalize`}>{level}</span>
  )
}

// Empty state
export const EmptyState = ({ icon: Icon, title, desc, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {Icon && <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-gray-400" />
    </div>}
    <h3 className="font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
    {desc && <p className="text-sm text-gray-500 mb-4 max-w-sm">{desc}</p>}
    {action}
  </div>
)

// Skeleton loader
export const SkeletonCard = () => (
  <div className="card p-5 space-y-3">
    <div className="skeleton h-4 w-3/4 rounded" />
    <div className="skeleton h-3 w-1/2 rounded" />
    <div className="skeleton h-8 w-full rounded mt-4" />
  </div>
)

// Stat card
export const StatCard = ({ label, value, icon: Icon, color = 'brand', sub }) => {
  const colors = {
    brand: 'bg-brand/10 text-brand',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  }
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  )
}

// Page header
export const PageHeader = ({ title, subtitle, actions, breadcrumb }) => (
  <div className="mb-6">
    {breadcrumb && <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">{breadcrumb}</div>}
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  </div>
)

// Pagination
export const Pagination = ({ page, pages, onPage }) => {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button disabled={page === 1} onClick={() => onPage(page - 1)} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">← Prev</button>
      {Array.from({ length: Math.min(5, pages) }, (_, i) => {
        const p = page <= 3 ? i + 1 : page - 2 + i
        if (p < 1 || p > pages) return null
        return (
          <button key={p} onClick={() => onPage(p)}
            className={`w-9 h-9 rounded-lg text-sm font-semibold ${p === page ? 'bg-brand text-white' : 'btn-secondary'}`}>
            {p}
          </button>
        )
      })}
      <button disabled={page === pages} onClick={() => onPage(page + 1)} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Next →</button>
    </div>
  )
}

// Modal
export const Modal = ({ open, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative ${maxWidth} w-full card shadow-2xl rounded-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto`}>
        {title && <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
