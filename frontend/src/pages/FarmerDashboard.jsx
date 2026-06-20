import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { toast } from 'react-toastify'
import { FiPlus, FiPackage, FiFileText, FiDollarSign, FiTrendingUp, FiFeather } from 'react-icons/fi'
import NavBar from '../components/NavBar'
import { useAuth } from '../context/AuthContext'

const FarmerDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalCrops: 0,
    availableContracts: 0,
    totalEarnings: 0,
    pendingOffers: 0
  })
  const [recentCrops, setRecentCrops] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only farmers should see this dashboard
    if (!user) return

    if (user.role !== 'farmer') {
      navigate('/buyer/dashboard')
      return
    }

    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    try {
      const [cropsRes, contractsRes] = await Promise.all([
        api.get('/crops/farmer/my-crops'),
        api.get('/contracts')
      ])

      const crops = cropsRes.data.data || []
      const contracts = contractsRes.data.data || []

      setStats({
        totalCrops: crops.length,
        availableContracts: contracts.length,
        totalEarnings: 0, // Calculate from payments
        pendingOffers: contracts.filter(c => (c.status || '').toLowerCase() === 'pending').length
      })

      setRecentCrops(crops)
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveCrop = async (cropId) => {
    if (!window.confirm('Are you sure you want to remove this crop?')) return

    try {
      await api.delete(`/crops/${cropId}`)
      toast.success('Crop removed successfully')
      fetchDashboardData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove crop')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-green-50 flex flex-col">
      <NavBar />
      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-900">Farmer Dashboard</h1>
          <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 border border-green-200 shadow-sm">
            <FiFeather className="text-green-700 text-xl" />
            <span className="text-green-700 font-semibold">Welcome back, {user?.name}!</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-800">
            <span className="text-xl">★</span>
            <span className="font-bold text-lg">
              {Number(user?.rating?.average || 0).toFixed(1)} / 5.0
            </span>
            <span className="text-sm text-gray-700 ml-1">({user?.rating?.count || 0})</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card p-6 min-h-[140px] bg-gradient-to-br from-green-600 to-green-700 shadow-lg border-green-500 transition-transform duration-300 ease-in-out hover:scale-105 hover:-translate-y-1 hover:shadow-2xl active:scale-95">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Crops</p>
                <p className="text-3xl font-bold text-white">{stats.totalCrops}</p>
              </div>
              <FiPackage className="text-4xl text-green-200" />
            </div>
          </div>

          <div className="card p-6 min-h-[140px] bg-gradient-to-br from-teal-600 to-teal-700 shadow-lg border-teal-500 transition-transform duration-300 ease-in-out hover:scale-105 hover:-translate-y-1 hover:shadow-2xl active:scale-95">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-sm">Available Contracts</p>
                <p className="text-3xl font-bold text-white">{stats.availableContracts}</p>
              </div>
              <FiFileText className="text-4xl text-teal-200" />
            </div>
          </div>

          <div className="card p-6 min-h-[140px] bg-gradient-to-br from-lime-600 to-lime-700 shadow-lg border-lime-500 transition-transform duration-300 ease-in-out hover:scale-105 hover:-translate-y-1 hover:shadow-2xl active:scale-95">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lime-100 text-sm">Total Earnings</p>
                <p className="text-3xl font-bold text-white">₹{stats.totalEarnings.toLocaleString()}</p>
              </div>
              <FiDollarSign className="text-4xl text-lime-200" />
            </div>
          </div>

          <div className="card p-6 min-h-[140px] bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-lg border-emerald-500 transition-transform duration-300 ease-in-out hover:scale-105 hover:-translate-y-1 hover:shadow-2xl active:scale-95">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Pending Offers</p>
                <p className="text-3xl font-bold text-white">{stats.pendingOffers}</p>
              </div>
              <FiTrendingUp className="text-4xl text-emerald-200" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              to="/farmer/crops/new"
              className="group block rounded-2xl p-8 min-h-[180px] bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1 active:scale-95 transition-transform duration-300 ease-in-out cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <FiPlus className="text-4xl" />
                <div>
                  <div className="text-lg font-bold">Upload My Crop</div>
                  <div className="text-sm opacity-90">Add a new crop listing</div>
                </div>
              </div>
            </Link>
            <Link
              to="/contracts/buyers"
              className="group block rounded-2xl p-8 min-h-[180px] bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1 active:scale-95 transition-transform duration-300 ease-in-out cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <FiFileText className="text-4xl" />
                <div>
                  <div className="text-lg font-bold">Buyer Requests</div>
                  <div className="text-sm opacity-90">View and manage requests</div>
                </div>
              </div>
            </Link>
            <Link
              to="/contracts?type=accepted"
              className="group block rounded-2xl p-8 min-h-[180px] bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1 active:scale-95 transition-transform duration-300 ease-in-out cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <FiFileText className="text-4xl" />
                <div>
                  <div className="text-lg font-bold">My Contracts</div>
                  <div className="text-sm opacity-90">Accepted and active contracts</div>
                </div>
              </div>
            </Link>
            <Link
              to="/payments"
              className="group block rounded-2xl p-8 min-h-[180px] bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1 active:scale-95 transition-transform duration-300 ease-in-out cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <FiDollarSign className="text-4xl" />
                <div>
                  <div className="text-lg font-bold">Payments</div>
                  <div className="text-sm opacity-90">View and track payments</div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="card bg-white shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Recent upload</h2>
            <Link to="/farmer/crops" className="text-primary-600 hover:underline">
              View All
            </Link>
          </div>
          {recentCrops.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Crop Name</th>
                    <th className="text-left py-3 px-4">Quantity</th>
                    <th className="text-left py-3 px-4">Expected Price</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCrops.map((crop) => (
                    <tr key={crop._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{crop.name}</td>
                      <td className="py-3 px-4">{crop.quantity} {crop.unit}</td>
                      <td className="py-3 px-4">₹{crop.expectedPrice}/{crop.unit}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-sm ${
                          crop.status === 'available' ? 'bg-green-100 text-green-800' :
                          crop.status === 'contracted' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {crop.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 space-x-3">
                        <Link
                          to={`/farmer/crops/edit/${crop._id}`}
                          className="text-primary-600 hover:underline"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleRemoveCrop(crop._id)}
                          className="text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No crops listed yet. Start by adding your first crop!</p>
              <Link to="/farmer/crops/new" className="btn-primary mt-4 inline-block">
                Add Crop
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default FarmerDashboard
