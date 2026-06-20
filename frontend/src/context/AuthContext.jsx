import { createContext, useState, useEffect, useContext } from 'react'

import { api, setAuthToken } from '../api/client'



const AuthContext = createContext()



export const useAuth = () => {

  const context = useContext(AuthContext)

  if (!context) {

    throw new Error('useAuth must be used within AuthProvider')

  }

  return context

}



const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(null)

  const [loading, setLoading] = useState(true)

  // Use sessionStorage so auth is isolated per browser tab.
  // localStorage is shared across tabs and causes one login to override another.
  const [token, setToken] = useState(sessionStorage.getItem('token'))



  const logout = () => {

    sessionStorage.removeItem('token')

    setToken(null)

    setUser(null)

    setAuthToken(null)

  }



  const fetchUser = async () => {

    if (token) {

      api.defaults.headers.common.Authorization = `Bearer ${token}`

      try {

        const res = await api.get('/auth/me')

        setUser(res.data.user)

      } catch (error) {

        console.error('Error fetching user:', error)

        logout()

      } finally {

        setLoading(false)

      }

    } else {

      setLoading(false)

    }

  }



  // Set axios default header and fetch user on mount

  useEffect(() => {

    setAuthToken(token)

    fetchUser()

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [token])



  const login = async (email, password) => {

    try {

      const res = await api.post('/auth/login', { email, password })

      

      // Check if response has the expected structure

      if (!res.data || !res.data.success) {

        return {

          success: false,

          message: res.data?.message || 'Login failed: Invalid response from server'

        }

      }

      

      const { token: newToken, user: userData } = res.data

      

      if (!newToken || !userData) {

        return {

          success: false,

          message: 'Login failed: Missing token or user data'

        }

      }

      

      sessionStorage.setItem('token', newToken)

      setToken(newToken)

      setUser(userData)

      setAuthToken(newToken)

      

      return { success: true }

    } catch (error) {

      console.error('Login error:', error)

      console.error('Error response:', error.response?.data)

      

      // Handle network errors

      if (!error.response) {

        return {

          success: false,

          message: 'Network error: Could not connect to server. Please check if the backend is running.'

        }

      }

      

      // Handle server errors

      if (error.response?.status >= 500) {

        return {

          success: false,

          message: error.response?.data?.message || 'Server error: Please try again later'

        }

      }

      

      return {

        success: false,

        message: error.response?.data?.message || 'Login failed'

      }

    }

  }



  const register = async (userData) => {

    try {

      const res = await api.post('/auth/register', userData)

      

      // Check if response has the expected structure

      if (!res.data || typeof res.data !== 'object' || !res.data.success) {

        return {

          success: false,

          message: res.data?.message || 'Registration failed: Invalid response from server'

        }

      }

      

      const { token: newToken, user: newUser } = res.data

      

      if (!newToken || !newUser) {

        return {

          success: false,

          message: 'Registration failed: Missing token or user data'

        }

      }

      

      sessionStorage.setItem('token', newToken)

      setToken(newToken)

      setUser(newUser)

      setAuthToken(newToken)

      

      return { success: true, user: newUser }

    } catch (error) {

      console.error('Registration error:', error)

      console.error('Error response:', error.response?.data)

      console.error('Error status:', error.response?.status)

      

      // Handle network errors

      if (!error.response) {

        return {

          success: false,

          message: 'Network error: Could not connect to server. Please check if the backend is running.'

        }

      }

      

      // Handle validation errors

      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {

        return {

          success: false,

          message: error.response.data.errors[0]?.msg || error.response.data.errors[0]?.message || 'Validation error',

          errors: error.response.data.errors

        }

      }

      

      // Handle server errors

      if (error.response?.status >= 500) {

        return {

          success: false,

          message: error.response?.data?.message || 'Server error: Please try again later or contact support'

        }

      }

      

      return {

        success: false,

        message: error.response?.data?.message || error.message || 'Registration failed'

      }

    }

  }



  const value = {

    user,

    token,

    loading,

    login,

    register,

    logout,

    fetchUser

  }





  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>

}



export default AuthProvider



