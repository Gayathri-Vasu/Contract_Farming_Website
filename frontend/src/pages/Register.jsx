import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import NavBar from '../components/NavBar'

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'farmer',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    farmSize: '',
    businessName: '',
    businessType: 'retailer'
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { register, user } = useAuth()
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState({
    cities: [],
    states: [],
    pincodes: [],
    businessNames: [],
    farmSizes: []
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')

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

  // Load auto-suggestions based on previous registrations
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await api.get('/suggestions/register')
        if (res.data?.success && res.data.data) {
          setSuggestions(prev => ({
            ...prev,
            ...res.data.data
          }))
        }
      } catch (error) {
        console.error('Failed to load registration suggestions:', error)
      }
    }

    fetchSuggestions()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1]
      setFormData({
        ...formData,
        address: { ...formData.address, [addressField]: value }
      })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      try {
        const url = URL.createObjectURL(file)
        setAvatarPreview(url)
      } catch {
        setAvatarPreview('')
      }
    } else {
      setAvatarFile(null)
      setAvatarPreview('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Prepare registration data
    const registrationData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
      phone: formData.phone.trim(),
      role: formData.role,
      address: {
        street: formData.address.street?.trim() || '',
        city: formData.address.city?.trim() || '',
        state: formData.address.state?.trim() || '',
        pincode: formData.address.pincode?.trim() || '',
        country: formData.address.country || 'India'
      }
    }

    // Add role-specific fields
    if (formData.role === 'farmer') {
      // Only include farmSize if it's a valid number
      if (formData.farmSize && !isNaN(parseFloat(formData.farmSize))) {
        registrationData.farmSize = parseFloat(formData.farmSize)
      }
    } else if (formData.role === 'buyer') {
      if (formData.businessName) {
        registrationData.businessName = formData.businessName
      }
      if (formData.businessType) {
        registrationData.businessType = formData.businessType
      }
    }

    try {
      setErrors({})

      // Build FormData so we can optionally include avatar image
      const data = new FormData()
      data.append('name', registrationData.name)
      data.append('email', registrationData.email)
      data.append('password', registrationData.password)
      data.append('phone', registrationData.phone)
      data.append('role', registrationData.role)
      // Address fields need to be flattened because backend expects address object
      data.append('address[street]', registrationData.address.street)
      data.append('address[city]', registrationData.address.city)
      data.append('address[state]', registrationData.address.state)
      data.append('address[pincode]', registrationData.address.pincode)
      data.append('address[country]', registrationData.address.country)

      if (registrationData.farmSize !== undefined) {
        data.append('farmSize', registrationData.farmSize)
      }
      if (registrationData.businessName) {
        data.append('businessName', registrationData.businessName)
      }
      if (registrationData.businessType) {
        data.append('businessType', registrationData.businessType)
      }

      if (avatarFile) {
        data.append('avatar', avatarFile)
      }

      const result = await register(data)
      
      if (result.success) {
        const designation = result.user?.role === 'farmer' ? 'Farmer' : result.user?.role === 'buyer' ? 'Buyer' : result.user?.role === 'admin' ? 'Admin' : result.user?.role || 'User'
        toast.success(`Successfully registered as ${designation}!`)
      } else {
        // Handle validation errors
        if (result.errors && Array.isArray(result.errors)) {
          const errorObj = {}
          result.errors.forEach(err => {
            const field = err.param || err.field || 'general'
            errorObj[field] = err.msg || err.message
          })
          setErrors(errorObj)
          
          // Show first error as toast
          const firstError = result.errors[0]
          toast.error(firstError.msg || firstError.message || 'Please fix the errors below')
        } else {
          toast.error(result.message || 'Registration failed')
        }
        console.error('Registration error:', result)
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Registration failed. Please check console for details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100">
      <NavBar />
      <div className="flex items-center justify-center py-12 px-4">
        <div className="card max-w-2xl w-full">
          <div className="flex flex-col items-center mb-4">
            <div className="h-20 w-20 rounded-full bg-primary-600 text-white flex items-center justify-center text-2xl font-semibold overflow-hidden">
              {avatarPreview ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <img
                  src={avatarPreview}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                (formData.name?.charAt(0) || '?').toUpperCase()
              )}
            </div>
            <div className="mt-3">
              <label className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                Upload profile photo (optional)
              </label>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center text-gray-900 mb-6">
            Create Your Account
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="input-field"
                >
                  <option value="farmer">Farmer</option>
                  <option value="buyer">Buyer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className={`input-field ${errors.phone ? 'border-red-500' : ''}`}
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  minLength={6}
                  className={`input-field ${errors.password ? 'border-red-500' : ''}`}
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              {formData.role === 'farmer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Farm Size (acres)
                  </label>
                  <input
                    type="number"
                    name="farmSize"
                    value={formData.farmSize}
                    onChange={handleChange}
                    className={`input-field ${errors.farmSize ? 'border-red-500' : ''}`}
                    step="0.01"
                  />
                  {errors.farmSize && <p className="text-red-500 text-sm mt-1">{errors.farmSize}</p>}
                </div>
              )}

              {formData.role === 'buyer' && (
                <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    className="input-field"
                    list="business-name-suggestions"
                    autoComplete="off"
                  />
                </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Type
                    </label>
                    <select
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleChange}
                      className="input-field"
                    >
                      <option value="retailer">Retailer</option>
                      <option value="exporter">Exporter</option>
                      <option value="company">Company</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Address Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    className="input-field"
                    list="city-suggestions"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    className="input-field"
                    list="state-suggestions"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    name="address.pincode"
                    value={formData.address.pincode}
                    onChange={handleChange}
                    className="input-field"
                    list="pincode-suggestions"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {errors.general}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>

          {/* Auto-suggestion sources powered by previous registrations */}
          <datalist id="city-suggestions">
            {suggestions.cities.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          <datalist id="state-suggestions">
            {suggestions.states.map((state) => (
              <option key={state} value={state} />
            ))}
          </datalist>
          <datalist id="pincode-suggestions">
            {suggestions.pincodes.map((pin) => (
              <option key={pin} value={pin} />
            ))}
          </datalist>
          <datalist id="business-name-suggestions">
            {suggestions.businessNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <p className="mt-6 text-center text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register

