import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Lock, Eye, EyeOff } from 'lucide-react'

// ─── Profile Page ─────────────────────────────────────────────────────────────
export const ProfilePage = () => {
  const { user } = useAuth()
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChangePw = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match')
    if (pwForm.newPassword.length < 8) return toast.error('Password must be at least 8 characters')
    setLoading(true)
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      toast.success('Password changed successfully!')
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-white mb-6">My Profile</h1>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center text-2xl font-bold text-brand">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-xl text-gray-900 dark:text-white">{user?.name}</h2>
            <p className="text-gray-500 text-sm">{user?.email}</p>
            <span className="badge badge-blue capitalize mt-1">{user?.role}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 mb-0.5">Phone</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{user?.phone || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-0.5">Email Status</p>
            <p className={`font-semibold ${user?.is_email_verified ? 'text-green-600' : 'text-red-500'}`}>
              {user?.is_email_verified ? '✓ Verified' : '✗ Not Verified'}
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
          <Lock className="w-5 h-5 text-gray-400" /> Change Password
        </h2>
        <form onSubmit={handleChangePw} className="space-y-4">
          {[
            { key: 'currentPassword', label: 'Current Password', hint: null },
            { key: 'newPassword', label: 'New Password', hint: 'Min 8 characters with uppercase, numbers & symbols' },
            { key: 'confirm', label: 'Confirm New Password', hint: null },
          ].map(({ key, label, hint }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pwForm[key]}
                  onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                  required
                  minLength={key !== 'currentPassword' ? 8 : undefined}
                  className="input pr-10"
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
            </div>
          ))}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Forgot Password Page ──────────────────────────────────────────────────────
export const ForgotPasswordPage = () => {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.forgotPassword({ email })
      toast.success('OTP sent! Check your email inbox.')
      setStep('reset')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) return toast.error('Please enter the complete 6-digit OTP')
    if (newPw.length < 8) return toast.error('Password must be at least 8 characters')
    if (newPw !== confirmPw) return toast.error('Passwords do not match!')
    setLoading(true)
    try {
      await authAPI.resetPassword({ email, otp, newPassword: newPw })
      toast.success('Password reset successfully! Please login.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. OTP may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full shadow-lg">

        {/* Header */}
        <h1 className="font-display font-bold text-xl text-gray-900 dark:text-white mb-1">
          {step === 'email' ? 'Forgot Password?' : 'Reset Your Password'}
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          {step === 'email'
            ? 'Enter your registered email and we will send you a 6-digit OTP.'
            : `A 6-digit OTP was sent to ${email}. Enter it below to reset your password.`}
        </p>

        {/* Step 1 — Email Input */}
        {step === 'email' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="input"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending OTP...' : 'Send OTP to Email'}
            </button>
          </form>

        ) : (

          /* Step 2 — OTP + New Password */
          <form onSubmit={handleReset} className="space-y-4">

            {/* OTP Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Enter OTP
                <span className="text-gray-400 font-normal ml-1">(6-digit code from your email)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="e.g. 135863"
                required
                maxLength={6}
                className="input text-center tracking-widest text-xl font-bold"
              />
              <p className="text-xs text-gray-400 mt-1">
                📧 Check your inbox at <strong>{email}</strong>
              </p>
            </div>

            {/* New Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                New Password
                <span className="text-gray-400 font-normal ml-1">(min 8 characters)</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  minLength={8}
                  className="input pr-10"
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Use uppercase, lowercase, numbers & symbols</p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Re-enter your new password"
                required
                minLength={8}
                className="input"
              />
              {confirmPw && newPw !== confirmPw && (
                <p className="text-xs text-red-500 mt-1">⚠ Passwords do not match</p>
              )}
              {confirmPw && newPw === confirmPw && (
                <p className="text-xs text-green-500 mt-1">✓ Passwords match</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>

            {/* Resend OTP */}
            <p className="text-center text-xs text-gray-400">
              Didn't receive OTP?{' '}
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-brand hover:underline font-medium"
              >
                Go back & resend
              </button>
            </p>
          </form>
        )}

        <a href="/login" className="block text-center text-sm text-brand mt-4 hover:underline">
          ← Back to Login
        </a>
      </div>
    </div>
  )
}

// ─── About Page ───────────────────────────────────────────────────────────────
export const AboutPage = () => (
  <div className="max-w-3xl mx-auto px-4 py-12">
    <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white mb-6">About ExamVault</h1>
    <div className="prose prose-gray dark:prose-invert max-w-none space-y-4 text-gray-700 dark:text-gray-300">
      <p>ExamVault is India's premier online exam preparation platform designed to help millions of aspirants crack government examinations including SSC, Banking, Railways, UPSC, and many more.</p>
      <p>Our platform offers thousands of practice papers, mock tests, and previous year question papers with detailed solutions and performance analytics to help students understand their strengths and weaknesses.</p>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-6">Our Mission</h2>
      <p>To democratize quality exam preparation by making it accessible, affordable, and effective for every student across India regardless of their location or economic background.</p>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-6">Contact Us</h2>
      <p>Email: support@examvault.com | Phone: 1800-XXX-XXXX</p>
    </div>
  </div>
)

// ─── Privacy Page ─────────────────────────────────────────────────────────────
export const PrivacyPage = () => (
  <div className="max-w-3xl mx-auto px-4 py-12">
    <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white mb-6">Privacy Policy</h1>
    <div className="space-y-4 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
      <p><strong>Last Updated:</strong> January 2025</p>
      <p>ExamVault ("we", "our", or "us") is committed to protecting your personal information and your right to privacy.</p>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Information We Collect</h2>
      <p>We collect information you provide directly: name, email, phone number, and performance data from tests you take on our platform.</p>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">How We Use Your Information</h2>
      <p>We use your information to provide and improve our services, personalize your experience, send you important updates, and analyze usage patterns to enhance the platform.</p>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Data Security</h2>
      <p>We implement industry-standard security measures including encryption, secure HTTPS connections, and regular security audits to protect your data.</p>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Cookies</h2>
      <p>We use cookies and similar tracking technologies to track activity on our service and hold certain information to improve your experience.</p>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Contact Us</h2>
      <p>For privacy concerns: privacy@examvault.com</p>
    </div>
  </div>
)

// ─── Terms Page ───────────────────────────────────────────────────────────────
export const TermsPage = () => (
  <div className="max-w-3xl mx-auto px-4 py-12">
    <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white mb-6">Terms & Conditions</h1>
    <div className="space-y-4 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
      <p><strong>Last Updated:</strong> January 2025</p>
      <p>By accessing and using ExamVault, you agree to be bound by these Terms and Conditions.</p>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Use of Service</h2>
      <p>You may use our service for lawful exam preparation purposes only. You must not misuse our service or attempt to access it using methods other than the interfaces provided.</p>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Account Responsibility</h2>
      <p>You are responsible for maintaining the confidentiality of your account and password. You agree to notify us immediately of any unauthorized use of your account.</p>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Intellectual Property</h2>
      <p>The content, features, and functionality of ExamVault are owned by ExamVault and are protected by copyright, trademark, and other intellectual property laws.</p>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Limitation of Liability</h2>
      <p>ExamVault shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of the service.</p>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Contact</h2>
      <p>For questions: legal@examvault.com</p>
    </div>
  </div>
)

// ─── Contact Page ─────────────────────────────────────────────────────────────
export const ContactPage = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    toast.success('Message sent! We will get back to you within 24 hours.')
    setForm({ name: '', email: '', subject: '', message: '' })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white mb-2">Contact Us</h1>
      <p className="text-gray-500 mb-8">Have questions? We'd love to hear from you.</p>
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Rahul Kumar' },
            { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
            { key: 'subject', label: 'Subject', type: 'text', placeholder: 'How can we help?' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <input type={type} value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder} required className="input" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Message</label>
            <textarea value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={5} placeholder="Your message..." required className="input resize-none" />
          </div>
          <button type="submit" className="btn-primary">Send Message</button>
        </form>
      </div>
    </div>
  )
}