import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { examAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { StatCard, Spinner, Pagination, Modal } from '../components/common'
import BulkUploadModal from '../components/admin/BulkUploadModal'
import toast from 'react-hot-toast'
import {
  Users, FileText, BookOpen, Target, Shield,
  Plus, Edit, Trash2, ToggleLeft, ToggleRight,
  BarChart2, ClipboardList, Search, Upload,
  RefreshCw, X, Check, ChevronDown, Settings2,
  AlertTriangle, Pencil, FolderPlus, GraduationCap, Tag, Layers, Palette, Hash
} from 'lucide-react'

const TABS = ['overview', 'users', 'questions', 'add-paper', 'create-exam', 'create-category', 'manage', 'logs']

const AdminPage = () => {
  const { user, isSuperAdmin } = useAuth()
  const [tab, setTab] = useState('overview')
  const [analytics, setAnalytics] = useState(null)
  const [users, setUsers] = useState([])
  const [userTotal, setUserTotal] = useState(0)
  const [userPage, setUserPage] = useState(1)
  const [userSearch, setUserSearch] = useState('')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [addPaperData, setAddPaperData] = useState({ exam_id: '', title: '', duration_minutes: 60, total_marks: 100, passing_marks: 40, marks_per_question: 1, negative_marks: 0.25, difficulty: 'medium', is_free: true })
  const [categories, setCategories] = useState([])
  const [exams, setExams] = useState([])

  // ── NEW state ────────────────────────────────────────────────────────────────
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)

  // Create Exam tab state
  const [createExamData, setCreateExamData] = useState({
    category_id: '',
    name: '',
    description: '',
    difficulty: 'medium',
  })
  const [createExamLoading, setCreateExamLoading] = useState(false)
  const [createExamSuccess, setCreateExamSuccess] = useState(null) // { id, name, slug }

  // Create Category tab state
  const [createCatData, setCreateCatData] = useState({
    name: '', description: '', icon: '', color: '#3B82F6',
  })
  const [createCatLoading, setCreateCatLoading] = useState(false)
  const [createCatSuccess, setCreateCatSuccess] = useState(null) // { id, name, slug }

  // Manage tab state
  const [manageView, setManageView] = useState('exams') // 'exams' | 'papers'
  const [manageExams, setManageExams] = useState([])
  const [managePapers, setManagePapers] = useState([])
  const [managePaperTotal, setManagePaperTotal] = useState(0)
  const [managePaperPage, setManagePaperPage] = useState(1)
  const [manageLoading, setManageLoading] = useState(false)
  const [manageSearch, setManageSearch] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [filterExamId, setFilterExamId] = useState('')
  // Rename exam inline edit
  const [editingExamId, setEditingExamId] = useState(null)
  const [editingExamName, setEditingExamName] = useState('')
  // Delete confirm modal
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { type:'exam'|'paper', id, name }

  useEffect(() => {
    examAPI.getAdminAnalytics()
      .then(r => setAnalytics(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
    examAPI.getCategories().then(r => setCategories(r.data.data))
  }, [])

  const loadUsers = (p = 1) => {
    examAPI.getAdminUsers({ page: p, limit: 15, search: userSearch })
      .then(r => { setUsers(r.data.data.users); setUserTotal(r.data.data.total) })
  }

  const loadLogs = () => {
    examAPI.getAuditLogs({ limit: 50 }).then(r => setLogs(r.data.data))
  }

  useEffect(() => {
    if (tab === 'users') loadUsers(userPage)
    if (tab === 'logs') loadLogs()
  }, [tab, userPage])

  const handleToggleUser = async (id) => {
    await examAPI.toggleUserStatus(id)
    toast.success('User status updated')
    loadUsers(userPage)
  }

  const handleAddPaper = async (e) => {
    e.preventDefault()
    try {
      await examAPI.createPaper(addPaperData)
      toast.success('Paper created successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create paper')
    }
  }

  const handleCreateExam = async (e) => {
    e.preventDefault()
    if (!createExamData.category_id) return toast.error('Please select a category')
    if (!createExamData.name.trim()) return toast.error('Exam name is required')
    setCreateExamLoading(true)
    try {
      const res = await examAPI.createExam({
        category_id: parseInt(createExamData.category_id),
        name: createExamData.name.trim(),
        description: createExamData.description.trim() || null,
        difficulty: createExamData.difficulty,
      })
      const created = res.data.data
      setCreateExamSuccess({ id: created.id, name: createExamData.name.trim() })
      toast.success('Exam created successfully!')
      setCreateExamData({ category_id: '', name: '', description: '', difficulty: 'medium' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create exam')
    } finally {
      setCreateExamLoading(false)
    }
  }

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    if (!createCatData.name.trim()) return toast.error('Category name is required')
    setCreateCatLoading(true)
    try {
      const res = await examAPI.createCategory({
        name: createCatData.name.trim(),
        description: createCatData.description.trim() || null,
        icon: createCatData.icon.trim() || null,
        color: createCatData.color || '#3B82F6',
      })
      const created = res.data.data
      setCreateCatSuccess({ id: created.id, name: createCatData.name.trim() })
      toast.success('Category created successfully!')
      setCreateCatData({ name: '', description: '', icon: '', color: '#3B82F6' })
      // Refresh categories list so it shows in dropdowns immediately
      examAPI.getCategories().then(r => setCategories(r.data.data))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create category')
    } finally {
      setCreateCatLoading(false)
    }
  }

  const loadExamsForCategory = async (catId) => {
    const cat = categories.find(c => c.id === parseInt(catId))
    if (cat) {
      const res = await examAPI.getCategory(cat.slug)
      setExams(res.data.data.exams || [])
    }
  }

  // ── Manage tab loaders ────────────────────────────────────────────────────────
  const loadManageExams = useCallback(async () => {
    setManageLoading(true)
    try {
      const params = {}
      if (filterCategoryId) params.category_id = filterCategoryId
      if (manageSearch) params.search = manageSearch
      const res = await examAPI.getAllExams(params)
      setManageExams(res.data.data || [])
    } catch { toast.error('Failed to load exams') }
    finally { setManageLoading(false) }
  }, [filterCategoryId, manageSearch])

  const loadManagePapers = useCallback(async (p = 1) => {
    setManageLoading(true)
    try {
      const params = { page: p, limit: 20 }
      if (filterExamId) params.exam_id = filterExamId
      if (manageSearch) params.search = manageSearch
      const res = await examAPI.getAllPapers(params)
      setManagePapers(res.data.data.papers || [])
      setManagePaperTotal(res.data.data.total || 0)
      setManagePaperPage(p)
    } catch { toast.error('Failed to load papers') }
    finally { setManageLoading(false) }
  }, [filterExamId, manageSearch])

  useEffect(() => {
    if (tab === 'manage') {
      if (manageView === 'exams') loadManageExams()
      else loadManagePapers(1)
    }
  }, [tab, manageView])

  const handleManageSearch = () => {
    if (manageView === 'exams') loadManageExams()
    else loadManagePapers(1)
  }

  const startRenameExam = (exam) => {
    setEditingExamId(exam.id)
    setEditingExamName(exam.name)
  }

  const cancelRename = () => {
    setEditingExamId(null)
    setEditingExamName('')
  }

  const saveRenameExam = async (id) => {
    if (!editingExamName.trim()) return toast.error('Name cannot be empty')
    try {
      await examAPI.renameExam(id, { name: editingExamName.trim() })
      toast.success('Exam renamed successfully')
      setEditingExamId(null)
      loadManageExams()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to rename exam')
    }
  }

  const confirmDelete = (type, id, name) => setDeleteConfirm({ type, id, name })

  const executeDelete = async () => {
    if (!deleteConfirm) return
    try {
      if (deleteConfirm.type === 'exam') {
        await examAPI.deleteExam(deleteConfirm.id)
        toast.success('Exam deleted')
        loadManageExams()
      } else {
        await examAPI.deletePaper(deleteConfirm.id)
        toast.success('Paper deleted')
        loadManagePapers(managePaperPage)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    } finally {
      setDeleteConfirm(null)
    }
  }

  if (loading) return <Spinner center size="lg" />

  const { summary, recentAttempts, topPapers } = analytics || {}

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
          <Shield className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-white">Admin Panel</h1>
          <p className="text-xs text-gray-500">Logged in as <strong>{user?.name}</strong> ({user?.role})</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.filter(t => t !== 'logs' || isSuperAdmin).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors capitalize flex items-center gap-1.5 ${
              tab === t ? 'bg-white dark:bg-gray-900 text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'manage' && <Settings2 className="w-3.5 h-3.5" />}
            {t === 'create-exam' && <GraduationCap className="w-3.5 h-3.5" />}
            {t === 'create-category' && <Layers className="w-3.5 h-3.5" />}
            {t.replace(/-/g, ' ')}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Students" value={summary?.users?.total ?? 0} icon={Users} color="blue" />
            <StatCard label="Active Students" value={summary?.users?.active ?? 0} icon={Users} color="green" />
            <StatCard label="Total Exams" value={summary?.exams?.total ?? 0} icon={BookOpen} color="brand" />
            <StatCard label="Total Papers" value={summary?.papers?.total ?? 0} icon={FileText} color="purple" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Total Attempts" value={summary?.attempts?.total ?? 0} icon={Target} color="blue" />
            <StatCard label="Completed Tests" value={summary?.attempts?.completed ?? 0} icon={Target} color="green" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-gray-400" /> Top Papers by Attempts
              </h3>
              <div className="space-y-3">
                {topPapers?.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300 truncate max-w-[60%]">{p.title}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{p.attempt_count} attempts</span>
                      <span className="font-bold text-brand">{Number(p.avg_score || 0).toFixed(0)} avg</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-gray-400" /> Recent Test Activity
              </h3>
              <div className="space-y-2">
                {recentAttempts?.slice(0, 6).map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{a.user_name}</p>
                      <p className="text-gray-400 truncate max-w-[150px]">{a.paper_title}</p>
                    </div>
                    <span className={`badge capitalize ${a.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="Search users..." className="input pl-10"
                onKeyDown={e => e.key === 'Enter' && loadUsers(1)} />
            </div>
            <button onClick={() => loadUsers(1)} className="btn-primary text-sm">Search</button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {['Name', 'Email', 'Phone', 'Role', 'Verified', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{u.name}</td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3 text-gray-500">{u.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`badge capitalize ${
                          u.role === 'super_admin' ? 'bg-red-100 text-red-700' :
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_email_verified
                          ? <span className="text-green-600 font-semibold">✓</span>
                          : <span className="text-red-500">✗</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(u.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleToggleUser(u.id)}
                          className={`text-xs font-semibold px-2 py-1 rounded-lg ${u.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                          {u.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={userPage} pages={Math.ceil(userTotal / 15)} onPage={(p) => { setUserPage(p); loadUsers(p) }} />
        </div>
      )}

      {/* ── NEW: Questions tab ─────────────────────────────────────────────────── */}
      {tab === 'questions' && (
        <div className="space-y-6">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Question Management</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Upload questions in bulk via an Excel (.xlsx) file.
              </p>
            </div>
            <button
              onClick={() => setBulkUploadOpen(true)}
              className="btn-primary gap-2 text-sm"
            >
              <Upload className="w-4 h-4" />
              Bulk Upload
            </button>
          </div>

          {/* Info card */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">How to use Bulk Upload</h3>
            <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside">
              <li>Create an Excel file (.xlsx) with the columns listed below.</li>
              <li>Each row represents one question. The <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">paper_id</code> must match an existing paper.</li>
              <li>Click <strong>Bulk Upload</strong>, select your file, then click Upload Questions.</li>
              <li>Invalid rows are skipped — valid rows are always committed together.</li>
            </ol>

            <div className="mt-5 overflow-x-auto">
              <table className="text-xs w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    {['Column', 'Required', 'Accepted values', 'Example'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-bold text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    ['paper_id',      '✅ Yes', 'Positive integer',         '42'],
                    ['question_text', '✅ Yes', 'Any text',                  'What is 2+2?'],
                    ['option_a',      '✅ Yes', 'Any text',                  '3'],
                    ['option_b',      '✅ Yes', 'Any text',                  '4'],
                    ['option_c',      '✅ Yes', 'Any text',                  '5'],
                    ['option_d',      '✅ Yes', 'Any text',                  '6'],
                    ['correct_option','✅ Yes', 'a / b / c / d',             'b'],
                    ['section_id',    '⬜ No',  'Positive integer or blank', '3'],
                    ['explanation',   '⬜ No',  'Any text',                  'Because 2+2=4'],
                    ['difficulty',    '⬜ No',  'easy / medium / hard',       'easy'],
                    ['topic',         '⬜ No',  'Any text',                  'Arithmetic'],
                  ].map(([col, req, vals, ex]) => (
                    <tr key={col} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-3 py-2 font-mono text-brand">{col}</td>
                      <td className="px-3 py-2">{req}</td>
                      <td className="px-3 py-2 text-gray-500">{vals}</td>
                      <td className="px-3 py-2 text-gray-400 italic">{ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Paper */}
      {tab === 'add-paper' && (
        <div className="card p-6 max-w-2xl">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-5">Create New Paper</h2>
          <form onSubmit={handleAddPaper} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select className="input" onChange={e => loadExamsForCategory(e.target.value)} required>
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Exam</label>
                <select className="input" value={addPaperData.exam_id}
                  onChange={e => setAddPaperData(d => ({ ...d, exam_id: e.target.value }))} required>
                  <option value="">Select Exam</option>
                  {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Paper Title</label>
              <input value={addPaperData.title} onChange={e => setAddPaperData(d => ({ ...d, title: e.target.value }))}
                placeholder="e.g. SSC CGL 2024 Mock Test 1" className="input" required />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { key: 'duration_minutes', label: 'Duration (min)', type: 'number' },
                { key: 'total_marks', label: 'Total Marks', type: 'number' },
                { key: 'passing_marks', label: 'Passing Marks', type: 'number' },
                { key: 'marks_per_question', label: '+Marks/Q', type: 'number', step: '0.25' },
                { key: 'negative_marks', label: '-Marks/Wrong', type: 'number', step: '0.25' },
              ].map(({ key, label, type, step }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                  <input type={type} step={step} value={addPaperData[key]}
                    onChange={e => setAddPaperData(d => ({ ...d, [key]: e.target.value }))}
                    className="input" required />
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
                <select value={addPaperData.difficulty}
                  onChange={e => setAddPaperData(d => ({ ...d, difficulty: e.target.value }))} className="input">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {[
                { key: 'is_free', label: 'Free Paper' },
                { key: 'shuffle_questions', label: 'Shuffle Questions' },
                { key: 'shuffle_options', label: 'Shuffle Options' },
                { key: 'allow_reattempt', label: 'Allow Re-attempt' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!addPaperData[key]}
                    onChange={e => setAddPaperData(d => ({ ...d, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded accent-brand" />
                  <span className="text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>

            <button type="submit" className="btn-primary gap-2">
              <Plus className="w-4 h-4" /> Create Paper
            </button>
          </form>
        </div>
      )}

      {/* ── Create Exam ─────────────────────────────────────────────────────────── */}
      {tab === 'create-exam' && (
        <div className="max-w-2xl space-y-5">

          {/* Page header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Create New Exam</h2>
              <p className="text-xs text-gray-500 mt-0.5">Add an exam under an existing category. Papers can be added to it afterwards.</p>
            </div>
          </div>

          {/* Success banner */}
          {createExamSuccess && (
            <div className="flex items-start gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-green-800 dark:text-green-300 text-sm">Exam created!</p>
                <p className="text-green-700 dark:text-green-400 text-xs mt-0.5">
                  <strong>"{createExamSuccess.name}"</strong> (ID: {createExamSuccess.id}) is now live. You can now add papers to it from the <button onClick={() => setTab('add-paper')} className="underline font-semibold hover:text-green-600">Add Paper</button> tab.
                </p>
              </div>
              <button onClick={() => setCreateExamSuccess(null)} className="text-green-500 hover:text-green-700 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Form card */}
          <div className="card p-6">
            <form onSubmit={handleCreateExam} className="space-y-5">

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    className="input pl-9"
                    value={createExamData.category_id}
                    onChange={e => setCreateExamData(d => ({ ...d, category_id: e.target.value }))}
                    required
                  >
                    <option value="">Select a category…</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {categories.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No categories loaded. Refresh the page if this persists.</p>
                )}
              </div>

              {/* Exam Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Exam Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    className="input pl-9"
                    value={createExamData.name}
                    onChange={e => setCreateExamData(d => ({ ...d, name: e.target.value }))}
                    placeholder="e.g. SSC CGL, UPSC CSE, GATE CS"
                    required
                    maxLength={120}
                  />
                </div>
                {createExamData.name && (
                  <p className="text-xs text-gray-400 mt-1">
                    Slug preview: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-brand">
                      {createExamData.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                    </code>
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Description <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  value={createExamData.description}
                  onChange={e => setCreateExamData(d => ({ ...d, description: e.target.value }))}
                  placeholder="Brief description of this exam, syllabus, pattern…"
                  maxLength={500}
                />
                <p className="text-xs text-gray-400 text-right mt-0.5">{createExamData.description.length}/500</p>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty Level
                </label>
                <div className="flex gap-3">
                  {[
                    { value: 'easy',   label: 'Easy',   color: 'green' },
                    { value: 'medium', label: 'Medium', color: 'yellow' },
                    { value: 'hard',   label: 'Hard',   color: 'red' },
                  ].map(({ value, label, color }) => (
                    <label key={value}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 cursor-pointer text-sm font-semibold transition-all ${
                        createExamData.difficulty === value
                          ? color === 'green'  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : color === 'yellow' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                          :                      'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}>
                      <input
                        type="radio"
                        name="difficulty"
                        value={value}
                        checked={createExamData.difficulty === value}
                        onChange={e => setCreateExamData(d => ({ ...d, difficulty: e.target.value }))}
                        className="sr-only"
                      />
                      <span className={`w-2 h-2 rounded-full ${
                        color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Preview card */}
              {(createExamData.name || createExamData.category_id) && (
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Preview</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center">
                      <GraduationCap className="w-4.5 h-4.5 text-brand" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                        {createExamData.name || <span className="text-gray-400 italic">Exam name…</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {categories.find(c => c.id === parseInt(createExamData.category_id))?.name || 'No category'}
                        </span>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full capitalize ${
                          createExamData.difficulty === 'easy'   ? 'bg-green-100 text-green-700' :
                          createExamData.difficulty === 'hard'   ? 'bg-red-100 text-red-700' :
                                                                   'bg-yellow-100 text-yellow-700'
                        }`}>{createExamData.difficulty}</span>
                      </div>
                    </div>
                  </div>
                  {createExamData.description && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{createExamData.description}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={createExamLoading}
                  className="btn-primary gap-2 min-w-[140px] justify-center"
                >
                  {createExamLoading
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating…</>
                    : <><Plus className="w-4 h-4" /> Create Exam</>
                  }
                </button>
                <button
                  type="button"
                  onClick={() => { setCreateExamData({ category_id: '', name: '', description: '', difficulty: 'medium' }); setCreateExamSuccess(null) }}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* Helper info */}
          <div className="card p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> What happens next?
            </p>
            <ol className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-decimal list-inside">
              <li>The exam is created and becomes visible under its category.</li>
              <li>Go to <button onClick={() => setTab('add-paper')} className="underline font-semibold hover:text-blue-800">Add Paper</button> tab → select this exam → create papers under it.</li>
              <li>Use <strong>Bulk Upload</strong> in the Questions tab to populate questions.</li>
              <li>Use the <button onClick={() => setTab('manage')} className="underline font-semibold hover:text-blue-800">Manage</button> tab to rename or delete exams/papers anytime.</li>
            </ol>
          </div>
        </div>
      )}

      {/* ── Create Category ──────────────────────────────────────────────────────── */}
      {tab === 'create-category' && (
        <div className="max-w-2xl space-y-5">

          {/* Page header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <Layers className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Create New Category</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Categories group related exams together (e.g. "SSC Exams", "Banking Exams"). Exams are created inside categories.
              </p>
            </div>
          </div>

          {/* Success banner */}
          {createCatSuccess && (
            <div className="flex items-start gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-green-800 dark:text-green-300 text-sm">Category created!</p>
                <p className="text-green-700 dark:text-green-400 text-xs mt-0.5">
                  <strong>"{createCatSuccess.name}"</strong> (ID: {createCatSuccess.id}) is ready. Now go to{' '}
                  <button onClick={() => setTab('create-exam')} className="underline font-semibold hover:text-green-600">Create Exam</button>{' '}
                  to add exams under it.
                </p>
              </div>
              <button onClick={() => setCreateCatSuccess(null)} className="text-green-500 hover:text-green-700 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Existing categories quick-view */}
          {categories.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Existing Categories ({categories.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color || '#6b7280' }} />
                    {c.name}
                    <span className="text-gray-400">({c.exam_count ?? 0})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Form card */}
          <div className="card p-6">
            <form onSubmit={handleCreateCategory} className="space-y-5">

              {/* Category Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    className="input pl-9"
                    value={createCatData.name}
                    onChange={e => setCreateCatData(d => ({ ...d, name: e.target.value }))}
                    placeholder="e.g. SSC Exams, Banking Exams, State PSC"
                    required
                    maxLength={100}
                  />
                </div>
                {createCatData.name && (
                  <p className="text-xs text-gray-400 mt-1">
                    Slug:{' '}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-brand">
                      {createCatData.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                    </code>
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Description <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  value={createCatData.description}
                  onChange={e => setCreateCatData(d => ({ ...d, description: e.target.value }))}
                  placeholder="Brief description shown to users on the Exams page…"
                  maxLength={300}
                />
                <p className="text-xs text-gray-400 text-right mt-0.5">{createCatData.description.length}/300</p>
              </div>

              {/* Icon + Color row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Icon emoji */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Icon <span className="text-gray-400 font-normal text-xs">(emoji or text)</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      className="input pl-9"
                      value={createCatData.icon}
                      onChange={e => setCreateCatData(d => ({ ...d, icon: e.target.value }))}
                      placeholder="📚  or  book-open"
                      maxLength={30}
                    />
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Brand Colour
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={createCatData.color}
                      onChange={e => setCreateCatData(d => ({ ...d, color: e.target.value }))}
                      className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5 bg-white dark:bg-gray-900"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316'].map(hex => (
                        <button
                          type="button"
                          key={hex}
                          onClick={() => setCreateCatData(d => ({ ...d, color: hex }))}
                          title={hex}
                          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${createCatData.color === hex ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 font-mono">{createCatData.color}</p>
                </div>
              </div>

              {/* Preview */}
              {createCatData.name && (
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Preview</p>
                  <div className="flex items-center gap-3">
                    {/* Icon circle */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: createCatData.color }}
                    >
                      {createCatData.icon
                        ? <span className="text-xl">{createCatData.icon}</span>
                        : <Layers className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{createCatData.name}</p>
                      {createCatData.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{createCatData.description}</p>
                      )}
                      <p className="text-xs mt-1">
                        <span className="px-2 py-0.5 rounded-full text-white text-xs font-semibold" style={{ backgroundColor: createCatData.color }}>
                          0 exams
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={createCatLoading}
                  className="btn-primary gap-2 min-w-[160px] justify-center"
                >
                  {createCatLoading
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating…</>
                    : <><Plus className="w-4 h-4" /> Create Category</>
                  }
                </button>
                <button
                  type="button"
                  onClick={() => { setCreateCatData({ name: '', description: '', icon: '', color: '#3B82F6' }); setCreateCatSuccess(null) }}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* What's next */}
          <div className="card p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800">
            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Recommended workflow
            </p>
            <ol className="text-xs text-indigo-600 dark:text-indigo-400 space-y-1 list-decimal list-inside">
              <li>Create a <strong>Category</strong> here (e.g. "SSC Exams").</li>
              <li>Go to <button onClick={() => setTab('create-exam')} className="underline font-semibold hover:text-indigo-800">Create Exam</button> → pick this category → create exams (e.g. "SSC CGL 2024").</li>
              <li>Go to <button onClick={() => setTab('add-paper')} className="underline font-semibold hover:text-indigo-800">Add Paper</button> → pick the exam → create papers.</li>
              <li>Use <strong>Bulk Upload</strong> in Questions tab to add questions to each paper.</li>
            </ol>
          </div>
        </div>
      )}

      {/* Audit Logs */}
      {tab === 'logs' && isSuperAdmin && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {['User', 'Action', 'Entity', 'IP', 'Time'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">
                      {log.user_name || `User#${log.user_id}`}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="badge badge-blue text-xs">{log.action}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">
                      {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">{log.ip_address || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">
                      {new Date(log.created_at).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Manage Tab ────────────────────────────────────────────────────────── */}
      {tab === 'manage' && (
        <div className="space-y-5">
          {/* Sub-nav: Exams / Papers */}
          <div className="flex items-center gap-2">
            {['exams', 'papers'].map(v => (
              <button key={v} onClick={() => { setManageView(v); setManageSearch(''); setFilterCategoryId(''); setFilterExamId('') }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors border ${
                  manageView === v
                    ? 'bg-brand text-white border-brand shadow'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand'
                }`}>
                {v === 'exams' ? <><BookOpen className="w-3.5 h-3.5 inline mr-1.5" />Exams</> : <><FileText className="w-3.5 h-3.5 inline mr-1.5" />Papers</>}
              </button>
            ))}
          </div>

          {/* Filter bar */}
          <div className="card p-3 flex flex-wrap gap-3 items-end">
            {manageView === 'exams' && (
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Filter by Category</label>
                <select className="input text-sm" value={filterCategoryId}
                  onChange={e => setFilterCategoryId(e.target.value)}>
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {manageView === 'papers' && (
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Filter by Exam</label>
                <select className="input text-sm" value={filterExamId}
                  onChange={e => setFilterExamId(e.target.value)}>
                  <option value="">All Exams</option>
                  {manageExams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={manageSearch} onChange={e => setManageSearch(e.target.value)}
                  placeholder={`Search ${manageView}…`} className="input text-sm pl-9"
                  onKeyDown={e => e.key === 'Enter' && handleManageSearch()} />
              </div>
            </div>
            <button onClick={handleManageSearch} className="btn-primary text-sm h-[38px] px-4">
              <Search className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setManageSearch(''); setFilterCategoryId(''); setFilterExamId(''); setTimeout(handleManageSearch, 50) }}
              className="btn text-sm h-[38px] px-3 text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ── Exams Table ── */}
          {manageView === 'exams' && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-brand" /> Exams
                  <span className="text-xs font-normal text-gray-400 ml-1">({manageExams.length} total)</span>
                </h3>
              </div>
              {manageLoading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
              ) : manageExams.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No exams found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/60">
                      <tr>
                        {['#', 'Exam Name', 'Category', 'Papers', 'Difficulty', 'Status', 'Created', 'Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {manageExams.map((exam, idx) => (
                        <tr key={exam.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors group">
                          <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white min-w-[200px]">
                            {editingExamId === exam.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  autoFocus
                                  value={editingExamName}
                                  onChange={e => setEditingExamName(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveRenameExam(exam.id); if (e.key === 'Escape') cancelRename() }}
                                  className="input input-sm text-sm py-1 px-2 h-8 w-44"
                                />
                                <button onClick={() => saveRenameExam(exam.id)}
                                  className="p-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={cancelRename}
                                  className="p-1 rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>{exam.name}</span>
                                <button onClick={() => startRenameExam(exam)}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-gray-400 hover:text-brand hover:bg-brand/10 transition-all">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{exam.category_name}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                              <FileText className="w-3 h-3" /> {exam.paper_count}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge capitalize text-xs ${
                              exam.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              exam.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>{exam.difficulty || 'medium'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge text-xs ${exam.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {exam.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {new Date(exam.created_at).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => startRenameExam(exam)}
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold transition-colors">
                                <Pencil className="w-3 h-3" /> Rename
                              </button>
                              <button onClick={() => confirmDelete('exam', exam.id, exam.name)}
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold transition-colors">
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Papers Table ── */}
          {manageView === 'papers' && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-500" /> Papers
                  <span className="text-xs font-normal text-gray-400 ml-1">({managePaperTotal} total)</span>
                </h3>
                {manageExams.length === 0 && (
                  <button onClick={loadManageExams} className="text-xs text-brand hover:underline">
                    Load exam filter list
                  </button>
                )}
              </div>
              {manageLoading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
              ) : managePapers.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No papers found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/60">
                      <tr>
                        {['#', 'Paper Title', 'Exam', 'Category', 'Year', 'Questions', 'Duration', 'Free', 'Status', 'Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {managePapers.map((paper, idx) => (
                        <tr key={paper.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 text-gray-400 text-xs">{(managePaperPage - 1) * 20 + idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-[220px]">
                            <span className="truncate block" title={paper.title}>{paper.title}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{paper.exam_name}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{paper.category_name}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{paper.year || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold text-brand">{paper.total_questions}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{paper.duration_minutes} min</td>
                          <td className="px-4 py-3">
                            <span className={`badge text-xs ${paper.is_free ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                              {paper.is_free ? 'Free' : 'Paid'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge text-xs ${paper.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {paper.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => confirmDelete('paper', paper.id, paper.title)}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold transition-colors">
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination
                page={managePaperPage}
                pages={Math.ceil(managePaperTotal / 20)}
                onPage={(p) => loadManagePapers(p)}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Delete Confirm Modal ────────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  Delete {deleteConfirm.type === 'exam' ? 'Exam' : 'Paper'}?
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  You are about to permanently delete{' '}
                  <strong className="text-gray-800 dark:text-gray-200">"{deleteConfirm.name}"</strong>.
                  {deleteConfirm.type === 'exam' && (
                    <span className="block mt-1 text-red-500 font-medium">
                      ⚠️ All papers and questions under this exam will also be deleted.
                    </span>
                  )}
                  This action <strong>cannot be undone</strong>.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button onClick={executeDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW: Bulk Upload Modal ─────────────────────────────────────────────── */}
      <BulkUploadModal
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
      />
    </div>
  )
}

export default AdminPage
