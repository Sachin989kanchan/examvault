import { useState, useEffect, useCallback, useRef } from 'react'

// Fetch data hook
export const useFetch = (fetchFn, deps = [], immediate = true) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchFn(...args)
      setData(res.data.data)
      return res.data.data
    } catch (err) {
      const msg = err.response?.data?.message || 'An error occurred'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => {
    if (immediate) execute()
  }, [execute])

  return { data, loading, error, refetch: execute }
}

// Countdown timer hook
export const useTimer = (initialSeconds, onExpire) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds)
  const intervalRef = useRef(null)
  const expiredRef = useRef(false)

  useEffect(() => {
    if (initialSeconds <= 0) return
    setTimeLeft(initialSeconds)
    expiredRef.current = false

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          if (!expiredRef.current) {
            expiredRef.current = true
            onExpire?.()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [initialSeconds])

  const pause = () => clearInterval(intervalRef.current)
  const resume = () => {
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current); onExpire?.(); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const hours = Math.floor(timeLeft / 3600)
  const minutes = Math.floor((timeLeft % 3600) / 60)
  const seconds = timeLeft % 60

  return {
    timeLeft,
    formatted: hours > 0
      ? `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`
      : `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`,
    isWarning: timeLeft < 300,
    isDanger: timeLeft < 60,
    pause, resume
  }
}

// Debounce hook
export const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// Local storage hook
export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : defaultValue } catch { return defaultValue }
  })
  const set = useCallback((v) => {
    setValue(v)
    localStorage.setItem(key, JSON.stringify(v))
  }, [key])
  const remove = useCallback(() => {
    setValue(defaultValue)
    localStorage.removeItem(key)
  }, [key, defaultValue])
  return [value, set, remove]
}

// Pagination hook
export const usePagination = (fetchFn, limit = 20) => {
  const [data, setData] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async (p = 1, extra = {}) => {
    setLoading(true)
    try {
      const res = await fetchFn({ page: p, limit, ...extra })
      const d = res.data.data
      setData(Array.isArray(d) ? d : d.data || d.papers || d.users || d.attempts || [])
      setTotal(d.total || d.pagination?.total || 0)
      setPage(p)
    } catch {}
    finally { setLoading(false) }
  }, [fetchFn, limit])

  return { data, page, total, loading, fetch, pages: Math.ceil(total / limit) }
}
