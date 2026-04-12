import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`

  // ✅ Fix caching issue
  config.headers['Cache-Control'] = 'no-cache'
  config.headers['Pragma'] = 'no-cache'

  return config
})

// Handle 401 → refresh token
let refreshing = false
let queue = []

const processQueue = (error, token = null) => {
  queue.forEach(p => error ? p.reject(error) : p.resolve(token))
  queue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      if (refreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      refreshing = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken })
        const { accessToken, refreshToken: newRefresh } = data.data

        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', newRefresh)

        api.defaults.headers.Authorization = `Bearer ${accessToken}`
        processQueue(null, accessToken)

        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch (err) {
        processQueue(err, null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        refreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  getProfile: () => api.get('/auth/profile'),
}

// Exams
export const examAPI = {
  getCategories: () => api.get('/categories'),
  getCategory: (slug) => api.get(`/categories/${slug}`),
  getExamPapers: (slug) => api.get(`/exams/${slug}/papers`),
  getPaperDetails: (id) => api.get(`/papers/${id}`),
  search: (params) => api.get('/search', { params }),
  getFeatured: () => api.get('/featured'),
  // Admin
  createCategory: (data) => api.post('/categories', data),
  createExam: (data) => api.post('/exams', data),
  createPaper: (data) => api.post('/papers', data),
  getQuestions: (paperId, params) => api.get(`/papers/${paperId}/questions`, { params }),
  addQuestion: (data) => api.post('/questions', data),
  updateQuestion: (id, data) => api.put(`/questions/${id}`, data),
  deleteQuestion: (id) => api.delete(`/questions/${id}`),
  getAdminUsers: (params) => api.get('/admin/users', { params }),
  toggleUserStatus: (id) => api.patch(`/admin/users/${id}/toggle`),
  getAdminAnalytics: () => api.get('/admin/analytics'),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  // ── NEW ──────────────────────────────────────────────────────────────────────
  // formData must be a FormData instance with field "file" set to the .xlsx File.
  // Content-Type is intentionally omitted here so axios sets the correct
  // multipart/form-data boundary automatically.
  bulkUploadQuestions: (formData) =>
    api.post('/admin/questions/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // large files may take longer than the default 30 s
    }),
  // ── Manage ───────────────────────────────────────────────────────────────────
  getAllExams: (params) => api.get('/admin/exams', { params }),
  getAllPapers: (params) => api.get('/admin/papers', { params }),
  renameExam: (id, data) => api.put(`/exams/${id}`, data),
  deleteExam: (id) => api.delete(`/exams/${id}`),
  deletePaper: (id) => api.delete(`/papers/${id}`),
}

// Test
export const testAPI = {
  startAttempt: (paperId) => api.post(`/test/papers/${paperId}/start`),
  saveResponse: (attemptId, data) => api.post(`/test/attempts/${attemptId}/save`, data),
  submitAttempt: (attemptId, data) => api.post(`/test/attempts/${attemptId}/submit`, data),
  getResult: (attemptId) => api.get(`/test/attempts/${attemptId}/result`),
  getMyAttempts: (params) => api.get('/test/my/attempts', { params }),
  getDashboard: () => api.get('/test/my/dashboard'),
}

export default api
