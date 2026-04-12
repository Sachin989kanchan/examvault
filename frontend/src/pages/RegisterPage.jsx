import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import { Eye, EyeOff, BookOpen, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const RegisterPage = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('register') // 'register' | 'verify'
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [otp, setOtp] = useState('')
  const [userId, setUserId] = useState(null)

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authAPI.register(form)
      setUserId(res.data.data.userId)
      setStep('verify')
      toast.success('OTP sent to your email!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.verifyEmail({ email: form.email, otp })
      toast.success('Email verified!')
      // Auto login
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {key === 'password' ? (
        <div className="relative">
          <input type={showPass ? 'text' : 'password'} value={form[key]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder} required className="input pr-11" />
          <button type="button" onClick={() => setShowPass(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        <input type={type} value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder} required={key !== 'phone'} className="input" />
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-2xl">
              <span className="text-gray-900 dark:text-white">Exam</span>
              <span className="text-brand">Vault</span>
            </span>
          </Link>
          <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-white">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Free forever. No credit card required.</p>
        </div>

        <div className="card p-8 shadow-lg">
          {step === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              {field('name', 'Full Name', 'text', 'Rahul Kumar')}
              {field('email', 'Email Address', 'email', 'you@example.com')}
              {field('phone', 'Phone Number (optional)', 'tel', '9876543210')}
              {field('password', 'Password', 'password', 'Min 8 chars, uppercase & number')}
              <p className="text-xs text-gray-500">
                Password must be at least 8 characters with one uppercase letter and one number.
              </p>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2">
                {loading ? 'Creating account...' : 'Create Free Account'}
              </button>
              <p className="text-xs text-gray-400 text-center">
                By signing up, you agree to our{' '}
                <Link to="/terms" className="text-brand hover:underline">Terms</Link> and{' '}
                <Link to="/privacy" className="text-brand hover:underline">Privacy Policy</Link>.
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="text-center mb-4">
                <CheckCircle className="w-12 h-12 text-brand mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We sent a 6-digit OTP to <strong className="text-gray-900 dark:text-white">{form.email}</strong>
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  required
                  maxLength={6}
                  className="input text-center text-2xl tracking-widest font-bold"
                />
              </div>
              <button type="submit" disabled={loading || otp.length < 6} className="btn-primary w-full py-3">
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
              <button type="button" onClick={() => setStep('register')} className="w-full text-sm text-gray-500 hover:text-gray-700">
                ← Go back
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand font-semibold hover:underline">Login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
