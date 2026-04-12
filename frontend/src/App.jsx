import { useEffect } from 'react'
import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedRoute, Spinner } from './components/common'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'

// Pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ExamsPage from './pages/ExamsPage'
import PapersPage from './pages/PapersPage'
import PaperDetailPage from './pages/PaperDetailPage'
import TestPage from './pages/TestPage'
import ResultPage from './pages/ResultPage'
import SearchPage from './pages/SearchPage'
import MyAttemptsPage from './pages/MyAttemptsPage'
import AdminPage from './pages/AdminPage'
import { ProfilePage, ForgotPasswordPage, AboutPage, PrivacyPage, TermsPage, ContactPage } from './pages/StaticPages'

const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

const Layout = ({ children, noFooter = false }) => (
  <div className="min-h-screen flex flex-col dark:bg-gray-950">
    <Navbar />
    <main className="flex-1">
      {children}
    </main>
    {!noFooter && <Footer />}
  </div>
)

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { borderRadius: '12px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '14px' },
            success: { iconTheme: { primary: '#00b386', secondary: '#fff' } },
          }}

        />
        <ScrollToTop />
        <Routes>
          {/* Public with layout */}

          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/exams" element={<Layout><ExamsPage /></Layout>} />
          <Route path="/exams/:categorySlug" element={<Layout><ExamsPage /></Layout>} />
          <Route path="/exams/:examSlug/papers" element={<Layout><PapersPage /></Layout>} />
          <Route path="/paper/:paperId" element={<Layout><PaperDetailPage /></Layout>} />
          <Route path="/search" element={<Layout><SearchPage /></Layout>} />
          <Route path="/about" element={<Layout><AboutPage /></Layout>} />
          <Route path="/privacy" element={<Layout><PrivacyPage /></Layout>} />
          <Route path="/terms" element={<Layout><TermsPage /></Layout>} />
          <Route path="/contact" element={<Layout><ContactPage /></Layout>} />

          {/* Auth pages - no layout */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Test engine - no navbar/footer */}
          <Route path="/test/:paperId" element={
            <ProtectedRoute>
              <TestPage />
            </ProtectedRoute>
          } />

          {/* Protected with layout */}
          <Route path="/dashboard" element={
            <Layout>
              <ProtectedRoute><DashboardPage /></ProtectedRoute>
            </Layout>
          } />
          <Route path="/result/:attemptId" element={
            <Layout>
              <ProtectedRoute><ResultPage /></ProtectedRoute>
            </Layout>
          } />
          <Route path="/my-attempts" element={
            <Layout>
              <ProtectedRoute><MyAttemptsPage /></ProtectedRoute>
            </Layout>
          } />
          <Route path="/profile" element={
            <Layout>
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            </Layout>
          } />

          {/* Admin - protected + admin only */}
          <Route path="/admin" element={
            <Layout>
              <ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>
            </Layout>
          } />

          {/* 404 */}
          <Route path="*" element={
            <Layout>
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <h1 className="font-display font-bold text-6xl text-gray-200 dark:text-gray-800 mb-4">404</h1>
                <h2 className="font-bold text-2xl text-gray-900 dark:text-white mb-2">Page Not Found</h2>
                <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
                <a href="/" className="btn-primary">Go Home</a>
              </div>
            </Layout>
          } />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
