import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiLogOut, FiMenu, FiX } from 'react-icons/fi'
import { useState } from 'react'

const NavBar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAvatarCard, setShowAvatarCard] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const avatarInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : '?'

  const avatarUrl =
    user?.avatarUrl || user?.avatar || user?.profileImageUrl

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-600">🌾</span>
            <span className="text-xl font-bold text-gray-800">
              Contract Farming
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link to="/marketplace" className="text-gray-700 hover:text-primary-600">
              Marketplace
            </Link>
            <Link to="/farmer-circle" className="text-gray-700 hover:text-primary-600">
              Farmer Circle
            </Link>
            <Link to="/buyer-circle" className="text-gray-700 hover:text-primary-600">
              Buyer Circle
            </Link>
            {user?.role === 'admin' && (
              <Link to="/admin/dashboard" className="text-gray-700 hover:text-primary-600">
                Admin Dashboard
              </Link>
            )}

            {user ? (
              <>
                <button
                  onClick={() => setShowAvatarCard(true)}
                  className="h-9 w-9 rounded-full bg-primary-600 text-white flex items-center justify-center overflow-hidden"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className="h-9 w-9 object-cover"
                    />
                  ) : (
                    avatarInitial
                  )}
                </button>

                <Link to="/profile" className="text-gray-800 font-medium">
                  {user.name}
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1"
                >
                  <FiLogOut />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            <Link to="/marketplace" className="block px-4 py-2">
              Marketplace
            </Link>
            <Link to="/farmer-circle" className="block px-4 py-2">
              Farmer Circle
            </Link>
            <Link to="/buyer-circle" className="block px-4 py-2">
              Buyer Circle
            </Link>
            {user?.role === 'admin' && (
              <Link to="/admin/dashboard" className="block px-4 py-2">
                Admin Dashboard
              </Link>
            )}

            {user ? (
              <>
                <Link to="/profile" className="block px-4 py-2">
                  {user.name}
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block px-4 py-2">
                  Login
                </Link>
                <Link to="/register" className="block px-4 py-2">
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {showAvatarCard && user && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
            <div className="h-20 w-20 rounded-full bg-primary-600 text-white flex items-center justify-center text-2xl mx-auto overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="h-20 w-20 object-cover"
                />
              ) : (
                avatarInitial
              )}
            </div>

            <p className="mt-3 font-semibold">{user.name}</p>
            <p className="text-sm text-gray-500">{user.role}</p>
            <p className="text-sm text-gray-500">{user.email}</p>

            <button
              onClick={() => setShowAvatarCard(false)}
              className="mt-4 px-4 py-2 border rounded"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}

export default NavBar
