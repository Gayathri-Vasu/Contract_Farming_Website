import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import navBar from '../components/navBar'
import axios from 'axios'
import { api } from '../api/client'

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [devEmails, setDevEmails] = useState([])
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false)
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const isDev = import.meta.env.MODE === 'development'

  useEffect(() => {
    if (user) {
      if (user.role === 'farmer') {
        navigate('/farmer/dashboard')
      } else if (user.role === 'buyer') {
        navigate('/buyer/dashboard')
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard')
      }
    }
  }, [user, navigate])

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const res = await api.get('/users/emails')
        const emails = (res.data?.data || [])
          .map((u) => u.email)
          .filter(Boolean)
        setDevEmails(emails)
      } catch {
        // silently ignore in dev if endpoint missing
      }
    }
    if (isDev) fetchEmails()
  }, [isDev])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const chooseEmail = (email) => {
    setFormData((prev) => ({ ...prev, email }))
    if (!formData.password) {
      toast.info('Email filled. Enter password to continue.')
    }
  }

  const demoFill = (roleHint) => {
    if (!devEmails.length) return
    const lower = roleHint.toLowerCase()
    const found = devEmails.find((e) => e.toLowerCase().includes(lower))
    chooseEmail(found || devEmails[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const result = await login(formData.email, formData.password)
    
    if (result.success) {
      toast.success('Login successful!')
    } else {
      toast.error(result.message || 'Login failed')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100">
      <navBar />
      <div className="flex items-center justify-center py-12 px-4">
        <div className="card max-w-md w-full">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-6">
            Login to Your Account
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {isDev && devEmails.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Pick (Dev only)
                </label>
                <select
                  className="input-field"
                  value={formData.email || ''}
                  onChange={(e) => chooseEmail(e.target.value)}
                >
                  <option value="">Select an email</option>
                  {devEmails.map((email) => (
                    <option key={email} value={email}>
                      {email}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    className="btn-secondary flex-1"
                    onClick={() => demoFill('farmer')}
                  >
                    Demo Login (Farmer)
                  </button>
                  <button
                    type="button"
                    className="btn-secondary flex-1"
                    onClick={() => demoFill('buyer')}
                  >
                    Demo Login (Buyer)
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Only email is auto-filled. Enter password manually.
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div
                className="relative"
                onMouseEnter={() => {
                  if (isDev && devEmails.length > 0) setShowEmailSuggestions(true)
                }}
                onMouseLeave={() => setShowEmailSuggestions(false)}
              >
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => {
                    if (isDev && devEmails.length > 0) setShowEmailSuggestions(true)
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowEmailSuggestions(false), 150)
                  }}
                  required
                  className="input-field"
                  placeholder="Enter your email"
                  autoComplete="username"
                />
                {isDev && devEmails.length > 0 && showEmailSuggestions && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-md z-10 max-h-48 overflow-auto">
                    {devEmails.map((email) => (
                      <button
                        key={email}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          chooseEmail(email)
                          setShowEmailSuggestions(false)
                        }}
                      >
                        {email}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
