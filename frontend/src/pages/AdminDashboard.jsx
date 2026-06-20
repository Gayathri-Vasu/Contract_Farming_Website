import { useState, useEffect, useRef } from 'react'

import { Link, useLocation, useNavigate } from 'react-router-dom'

import axios from 'axios'

import { toast } from 'react-toastify'

import { 

  FiUsers, FiPackage, FiFileText, FiDollarSign, FiCheckCircle, 

  FiXCircle, FiTrendingUp, FiTrendingDown, FiShoppingCart, FiUserCheck,

  FiBarChart2, FiMessageSquare

} from 'react-icons/fi'

import NavBar from '../components/NavBar'

import { useAuth } from '../context/AuthContext'

import { MARKET_CROPS } from '../constants/marketCrops'



const ADMIN_TABS = ['overview', 'farmers', 'buyers', 'contracts', 'payments', 'crops', 'analytics']

const getTabFromHash = (hash = '') => {
  const tabFromHash = (hash || '').replace('#', '')
  return ADMIN_TABS.includes(tabFromHash) ? tabFromHash : 'overview'
}

// In-memory UI cache to make back navigation feel instant.
let adminDashboardCache = null

const AdminDashboard = () => {

  const { user } = useAuth()

  const location = useLocation()
  const navigate = useNavigate()

  const [stats, setStats] = useState(adminDashboardCache?.stats ?? null)

  const [farmers, setFarmers] = useState(adminDashboardCache?.farmers ?? [])

  const [buyers, setBuyers] = useState(adminDashboardCache?.buyers ?? [])

  const [contracts, setContracts] = useState(adminDashboardCache?.contracts ?? [])

  const [payments, setPayments] = useState(adminDashboardCache?.payments ?? [])

  const [analytics, setAnalytics] = useState(adminDashboardCache?.analytics ?? null)

  const [loading, setLoading] = useState(!adminDashboardCache)

  const [activeTab, setActiveTab] = useState(() => getTabFromHash(location.hash))
  const isFetchingRef = useRef(false)

  const [marketCrops, setMarketCrops] = useState(MARKET_CROPS)

  const [newMarketCrop, setNewMarketCrop] = useState({

    name: '',

    segment: 'Fruit',

    season: '',

    category: 'fruits',

    price: '',

    details: '',

  })



  useEffect(() => {

    fetchDashboardData({ silent: !!adminDashboardCache })

  }, [])



  // Handle URL hash for tab navigation (e.g., #contracts)

  useEffect(() => {
    setActiveTab(getTabFromHash(location.hash))

  }, [location.hash])

  // Keep URL hash in sync with selected tab so browser back returns
  // to the same section (e.g., contracts) after visiting messages.
  useEffect(() => {
    const desiredHash = `#${activeTab}`
    if (location.hash !== desiredHash) {
      navigate({ pathname: location.pathname, hash: desiredHash }, { replace: true })
    }
  }, [activeTab, location.hash, location.pathname, navigate])



  const fetchDashboardData = async ({ silent = false } = {}) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    if (!silent) setLoading(true)

    try {

      const requests = [

        axios.get('/api/admin/dashboard'),

        axios.get('/api/admin/farmers?limit=50'),

        axios.get('/api/admin/buyers?limit=50'),

        axios.get('/api/admin/contracts?limit=100'),

        axios.get('/api/admin/payments?limit=1000'),

        axios.get('/api/admin/analytics')

      ]



      const [

        statsRes, farmersRes, buyersRes, contractsRes, paymentsRes,

        analyticsRes

      ] = await Promise.all(requests)



      const nextStats = statsRes.data.data
      const nextFarmers = farmersRes.data.data || []
      const nextBuyers = buyersRes.data.data || []
      const nextContracts = contractsRes.data.data || []
      const nextAnalytics = analyticsRes.data.data

      setStats(nextStats)
      setFarmers(nextFarmers)
      setBuyers(nextBuyers)
      setContracts(nextContracts)
      setAnalytics(nextAnalytics)



      const allPayments = (paymentsRes.data.data || []).map((payment) => ({
        ...payment,
        contractId: payment.contract?.contractId || '-',
        cropName: payment.contract?.crop?.name || payment.contract?.cropName || '-',
        buyerName: payment.buyer?.name || '-',
        farmerName: payment.farmer?.name || '-',
        payerName:
          payment.payerRole === 'buyer'
            ? (payment.buyer?.name || 'Buyer')
            : (payment.farmer?.name || 'Farmer'),
        receiverName:
          payment.receiverRole === 'farmer'
            ? (payment.farmer?.name || 'Farmer')
            : (payment.buyer?.name || 'Buyer'),
        date: payment.paidAt || payment.createdAt,
        time: payment.paidAt
          ? new Date(payment.paidAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : '-'
      }))

      allPayments.sort((a, b) => new Date(b.date) - new Date(a.date))
      setPayments(allPayments)

      adminDashboardCache = {
        stats: nextStats,
        farmers: nextFarmers,
        buyers: nextBuyers,
        contracts: nextContracts,
        payments: allPayments,
        analytics: nextAnalytics
      }

    } catch (error) {

      console.error('Error fetching dashboard data:', error)

      toast.error('Failed to load dashboard data', { toastId: 'admin-dashboard-load-error' })

    } finally {

      if (!silent) setLoading(false)
      isFetchingRef.current = false

    }

  }



  const handleVerifyUser = async (userId) => {

    try {

      await axios.put(`/api/admin/users/${userId}/verify`)

      toast.success('User verified successfully')

      fetchDashboardData()

    } catch (error) {

      toast.error('Failed to verify user')

    }

  }



  const handleDeactivateUser = async (userId) => {

    if (!window.confirm('Are you sure you want to deactivate this user?')) return

    try {

      await axios.put(`/api/admin/users/${userId}/deactivate`)

      toast.success('User deactivated successfully')

      fetchDashboardData()

    } catch (error) {

      toast.error('Failed to deactivate user')

    }

  }



  const formatCurrency = (amount) => {

    return new Intl.NumberFormat('en-IN', {

      style: 'currency',

      currency: 'INR',

      maximumFractionDigits: 0

    }).format(amount)

  }



  const formatDate = (date) => {

    return new Date(date).toLocaleDateString('en-IN', {

      year: 'numeric',

      month: 'short',

      day: 'numeric'

    })

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

    <div className="h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col">

      <NavBar />

      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 overflow-auto">

        <div className="mb-8">

          <h1 className="text-3xl font-bold text-white drop-shadow-lg">Admin Dashboard</h1>

          <p className="text-white drop-shadow-md mt-2">Hi! Welcome back, {user?.name}!</p>

        </div>



        {/* Quick Actions */}

        <div className="mb-8 rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-white/95 via-indigo-50/90 to-fuchsia-50/90 backdrop-blur-md shadow-2xl border border-white/50">

          <div className="mb-5">
            <h2 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 bg-clip-text text-transparent drop-shadow-sm">
              Quick Links
            </h2>
            <p className="text-sm text-gray-600 mt-1">Jump to any admin section instantly.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {ADMIN_TABS.map((tab) => (
              <button
                key={`quick-${tab}`}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`group rounded-xl px-4 py-3 text-left border shadow-sm transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-500 scale-[1.02]'
                    : 'bg-white/90 text-gray-700 border-gray-200 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 hover:border-indigo-200 hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      activeTab === tab
                        ? 'bg-white/25 text-white'
                        : 'bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold">
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </span>
                </div>
              </button>
            ))}
          </div>

        </div>



        {/* Overview Tab */}

        {activeTab === 'overview' && stats && (

          <>

            {/* Main Stats Grid */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

              <div className="card bg-gradient-to-br from-cyan-400 to-blue-600 shadow-2xl border-cyan-300/50">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-white text-sm font-bold drop-shadow-md">Total Users</p>

                    <p className="text-3xl font-bold text-white drop-shadow-lg">{stats.users.total}</p>

                    <p className="text-xs text-white/90 drop-shadow-sm mt-2">

                      {stats.users.farmers} Farmers • {stats.users.buyers} Buyers • {stats.users.admins || 1} Admin

                    </p>

                  </div>

                  <FiUsers className="text-4xl text-white drop-shadow-lg" />

                </div>

              </div>



              <div className="card bg-gradient-to-br from-emerald-400 to-green-600 shadow-2xl border-emerald-300/50">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-white text-sm font-bold drop-shadow-md">Total Crops</p>

                    <p className="text-3xl font-bold text-white drop-shadow-lg">{stats.crops.total}</p>

                    <p className="text-xs text-white/90 drop-shadow-sm mt-2">

                      {stats.crops.available} Available • {stats.crops.contracted} Contracted

                    </p>

                  </div>

                  <FiPackage className="text-4xl text-white drop-shadow-lg" />

                </div>

              </div>



              <div className="card bg-gradient-to-br from-rose-400 to-pink-600 shadow-2xl border-rose-300/50">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-white text-sm font-bold drop-shadow-md">Active Contracts</p>

                    <p className="text-3xl font-bold text-white drop-shadow-lg">{stats.contracts.active}</p>

                    <p className="text-xs text-white/90 drop-shadow-sm mt-2">

                      {stats.contracts.total} Total Contracts

                    </p>

                  </div>

                  <FiFileText className="text-4xl text-white drop-shadow-lg" />

                </div>

              </div>



              <div className="card bg-gradient-to-br from-amber-400 to-orange-600 shadow-2xl border-amber-300/50">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-white text-sm font-bold drop-shadow-md">Total Revenue</p>

                    <p className="text-3xl font-bold text-white drop-shadow-lg">

                      {formatCurrency(stats.payments.totalRevenue)}

                    </p>

                    <p className="text-xs text-white/90 drop-shadow-sm mt-2">

                      {stats.payments.completed} Completed Payments

                    </p>

                  </div>

                  <FiDollarSign className="text-4xl text-white drop-shadow-lg" />

                </div>

              </div>

            </div>



            {/* Detailed Stats */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

              <div className="card">

                <h3 className="font-semibold mb-4 flex items-center gap-2">

                  <FiUserCheck className="text-primary-600" /> User Verification

                </h3>

                <div className="space-y-3">

                  <div className="flex justify-between items-center">

                    <span className="text-gray-600">Verified:</span>

                    <span className="font-bold text-green-600">{stats.users.verified}</span>

                  </div>

                  <div className="flex justify-between items-center">

                    <span className="text-gray-600">Pending:</span>

                    <span className="font-bold text-yellow-600">{stats.users.pendingVerification}</span>

                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">

                    <div 

                      className="bg-green-600 h-2 rounded-full" 

                      style={{ width: `${(stats.users.verified / stats.users.total) * 100}%` }}

                    ></div>

                  </div>

                </div>

              </div>



              <div className="card">

                <h3 className="font-semibold mb-4 flex items-center gap-2">

                  <FiFileText className="text-blue-600" /> Contract Status

                </h3>

                <div className="space-y-2">

                  <div className="flex justify-between">

                    <span className="text-gray-600">Pending:</span>

                    <span className="font-semibold">{stats.contracts.pending}</span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-gray-600">Active:</span>

                    <span className="font-semibold text-green-600">{stats.contracts.active}</span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-gray-600">Completed:</span>

                    <span className="font-semibold text-blue-600">{stats.contracts.completed}</span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-gray-600">Disputed:</span>

                    <span className="font-semibold text-red-600">{stats.contracts.disputed}</span>

                  </div>

                </div>

              </div>



              <div className="card">

                <h3 className="font-semibold mb-4 flex items-center gap-2">

                  <FiPackage className="text-green-600" /> Crop Status

                </h3>

                <div className="space-y-2">

                  <div className="flex justify-between">

                    <span className="text-gray-600">Available:</span>

                    <span className="font-semibold text-green-600">{stats.crops.available}</span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-gray-600">Contracted:</span>

                    <span className="font-semibold text-blue-600">{stats.crops.contracted}</span>

                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">

                    <div 

                      className="bg-green-600 h-2 rounded-full" 

                      style={{ width: `${(stats.crops.available / stats.crops.total) * 100}%` }}

                    ></div>

                  </div>

                </div>

              </div>

            </div>

          </>

        )}



        {/* Farmers Tab */}

        {activeTab === 'farmers' && (

          <div className="card">

            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">

              <FiUsers className="text-primary-600" /> All Farmers ({farmers.length})

            </h2>

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1500px]">

                <thead>

                  <tr className="border-b bg-gray-50">

                    <th className="text-left py-3 px-4 font-semibold">Name</th>

                    <th className="text-left py-3 px-4 font-semibold">User ID</th>

                    <th className="text-left py-3 px-4 font-semibold">Email</th>

                    <th className="text-left py-3 px-4 font-semibold">Phone</th>

                    <th className="text-left py-3 px-4 font-semibold">Location</th>

                    <th className="text-left py-3 px-4 font-semibold">Crops</th>

                    <th className="text-left py-3 px-4 font-semibold">Contracts</th>

                    <th className="text-left py-3 px-4 font-semibold">Earnings</th>

                    <th className="text-left py-3 px-4 font-semibold">Status</th>

                    <th className="text-left py-3 px-4 font-semibold">Actions</th>

                  </tr>

                </thead>

                <tbody>

                  {farmers.map((farmer) => (

                    <tr key={farmer._id} className="border-b hover:bg-gray-50">

                      <td className="py-3 px-4 font-medium">{farmer.name}</td>

                      <td className="py-3 px-4 font-mono text-sm">{farmer.userId}</td>

                      <td className="py-3 px-4">{farmer.email}</td>

                      <td className="py-3 px-4">{farmer.phone}</td>

                      <td className="py-3 px-4 text-sm">

                        {farmer.address?.city || 'N/A'}, {farmer.address?.state || 'N/A'}

                      </td>

                      <td className="py-3 px-4">

                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">

                          {farmer.stats?.cropsCount || 0}

                        </span>

                      </td>

                      <td className="py-3 px-4">

                        <div className="text-sm">

                          <div>Total: {farmer.stats?.contractsCount || 0}</div>

                          <div className="text-green-600">Active: {farmer.stats?.activeContracts || 0}</div>

                        </div>

                      </td>

                      <td className="py-3 px-4 font-semibold text-green-600">

                        {formatCurrency(farmer.stats?.totalEarnings || 0)}

                      </td>

                      <td className="py-3 px-4">
                        {farmer.isVerified ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm flex items-center gap-1 w-fit">
                            <FiCheckCircle /> Verified
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">

                        <div className="flex gap-2">

                          {!farmer.isVerified && (

                            <button

                              onClick={() => handleVerifyUser(farmer._id)}

                              className="text-primary-600 hover:underline text-sm"

                            >

                              Verify

                            </button>

                          )}

                          {farmer.isActive && (

                            <button

                              onClick={() => handleDeactivateUser(farmer._id)}

                              className="text-red-600 hover:underline text-sm"

                            >

                              Deactivate

                            </button>

                          )}

                        </div>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        )}



        {/* Buyers Tab */}

        {activeTab === 'buyers' && (

          <div className="card">

            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">

              <FiShoppingCart className="text-blue-600" /> All Buyers ({buyers.length})

            </h2>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b bg-gray-50">

                    <th className="text-left py-3 px-4 font-semibold">Name</th>

                    <th className="text-left py-3 px-4 font-semibold">User ID</th>

                    <th className="text-left py-3 px-4 font-semibold">Email</th>

                    <th className="text-left py-3 px-4 font-semibold">Business</th>

                    <th className="text-left py-3 px-4 font-semibold">Phone</th>

                    <th className="text-left py-3 px-4 font-semibold">Contracts</th>

                    <th className="text-left py-3 px-4 font-semibold">Spending</th>

                    <th className="text-left py-3 px-4 font-semibold">Status</th>

                    <th className="text-left py-3 px-4 font-semibold">Actions</th>

                  </tr>

                </thead>

                <tbody>

                  {buyers.map((buyer) => (

                    <tr key={buyer._id} className="border-b hover:bg-gray-50">

                      <td className="py-3 px-4 font-medium">{buyer.name}</td>

                      <td className="py-3 px-4 font-mono text-sm">{buyer.userId}</td>

                      <td className="py-3 px-4">{buyer.email}</td>

                      <td className="py-3 px-4">

                        <div className="text-sm">

                          <div className="font-medium">{buyer.businessName || 'N/A'}</div>

                          <div className="text-gray-500">{buyer.businessType || ''}</div>

                        </div>

                      </td>

                      <td className="py-3 px-4">{buyer.phone}</td>

                      <td className="py-3 px-4">

                        <div className="text-sm">

                          <div>Total: {buyer.stats?.contractsCount || 0}</div>

                          <div className="text-green-600">Active: {buyer.stats?.activeContracts || 0}</div>

                        </div>

                      </td>

                      <td className="py-3 px-4 font-semibold text-blue-600">

                        {formatCurrency(buyer.stats?.totalSpending || 0)}

                      </td>

                      <td className="py-3 px-4">
                        {buyer.isVerified ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm flex items-center gap-1 w-fit">
                            <FiCheckCircle /> Verified
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">

                        <div className="flex gap-2">

                          {!buyer.isVerified && (

                            <button

                              onClick={() => handleVerifyUser(buyer._id)}

                              className="text-primary-600 hover:underline text-sm"

                            >

                              Verify

                            </button>

                          )}

                          {buyer.isActive && (

                            <button

                              onClick={() => handleDeactivateUser(buyer._id)}

                              className="text-red-600 hover:underline text-sm"

                            >

                              Deactivate

                            </button>

                          )}

                        </div>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        )}



        {/* Contracts Tab */}

        {activeTab === 'contracts' && (

          <div className="card">

            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">

              <FiFileText className="text-purple-600" /> All Contracts ({contracts.length})

            </h2>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b bg-gray-50">

                    <th className="text-left py-3 px-4 font-semibold">Contract Number</th>
                    <th className="text-left py-3 px-4 font-semibold">Crop</th>

                    <th className="text-left py-3 px-4 font-semibold">Farmer</th>

                    <th className="text-left py-3 px-4 font-semibold">Farmer ID</th>

                    <th className="text-left py-3 px-4 font-semibold">Buyer</th>

                    <th className="text-left py-3 px-4 font-semibold">Buyer ID</th>

                    <th className="text-left py-3 px-4 font-semibold">Quantity</th>

                    <th className="text-left py-3 px-4 font-semibold">Amount</th>

                    <th className="text-left py-3 px-4 font-semibold">Delivery Date</th>

                    <th className="text-left py-3 px-4 font-semibold">Status</th>

                    <th className="text-left py-3 px-4 font-semibold">Actions</th>

                  </tr>

                </thead>

                <tbody>

                  {contracts.map((contract) => {
                    const cropName = contract.crop?.name || contract.cropName || '-'
                    const quantityDisplay =
                      contract.quantity != null ? `${contract.quantity} ${contract.unit || ''}`.trim() : '-'
                    const amountDisplay =
                      contract.totalAmount != null
                        ? formatCurrency(contract.totalAmount)
                        : formatCurrency((Number(contract.quantity) || 0) * (Number(contract.pricePerUnit) || 0))
                    const statusText = (contract.status || '-').toString()
                    const statusLower = statusText.toLowerCase()

                    return (
                    <tr key={contract._id} className="border-b hover:bg-gray-50 align-top">

                      <td className="py-3 px-4 font-mono text-sm whitespace-nowrap">
                        {contract.contractId || '-'}
                      </td>

                      <td className="py-3 px-4 min-w-[140px]">
                        <div className="font-medium text-gray-900">{cropName}</div>
                      </td>

                      <td className="py-3 px-4 min-w-[170px]">
                        <div>{contract.farmer?.name || '-'}</div>
                        <div className="text-sm text-gray-500">{contract.farmer?.email || '-'}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-sm whitespace-nowrap">{contract.farmer?.userId || '-'}</td>

                      <td className="py-3 px-4 min-w-[170px]">
                        <div>{contract.buyer?.name || '-'}</div>
                        <div className="text-sm text-gray-500">{contract.buyer?.email || '-'}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-sm whitespace-nowrap">{contract.buyer?.userId || '-'}</td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {quantityDisplay}
                      </td>

                      <td className="py-3 px-4 font-semibold whitespace-nowrap">
                        {amountDisplay}
                      </td>

                      <td className="py-3 px-4 text-sm whitespace-nowrap">
                        {contract.deliveryDate ? formatDate(contract.deliveryDate) : '-'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-sm ${

                          statusLower === 'active' ? 'bg-green-100 text-green-800' :

                          statusLower === 'completed' ? 'bg-blue-100 text-blue-800' :

                          statusLower === 'disputed' ? 'bg-red-100 text-red-800' :

                          statusLower === 'pending' ? 'bg-yellow-100 text-yellow-800' :

                          statusLower === 'accepted' ? 'bg-indigo-100 text-indigo-800' :

                          statusLower === 'signed' ? 'bg-purple-100 text-purple-800' :

                          statusLower === 'paid' ? 'bg-emerald-100 text-emerald-800' :

                          'bg-gray-100 text-gray-800'

                        }`}>

                          {statusText}

                        </span>

                      </td>

                      <td className="py-3 px-4">

                        <Link

                          to={`/contracts/${contract._id}/messages`}
                          state={{ returnTo: '/admin/dashboard#contracts' }}

                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"

                        >

                          <FiMessageSquare className="text-base" />

                          Messages

                        </Link>

                      </td>

                    </tr>
                  )})}

                </tbody>

              </table>

            </div>

          </div>

        )}



        {/* Payments Tab */}

        {activeTab === 'payments' && (

          <div className="card">

            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">

              <FiDollarSign className="text-yellow-600" /> All Payments/Transactions ({payments.length})

            </h2>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b bg-gray-50">

                    <th className="text-left py-3 px-4 font-semibold">Buyer Name</th>

                    <th className="text-left py-3 px-4 font-semibold">Farmer Name</th>

                    <th className="text-left py-3 px-4 font-semibold">Who Paid Whom</th>

                    <th className="text-left py-3 px-4 font-semibold">Crop</th>

                    <th className="text-left py-3 px-4 font-semibold">Amount</th>

                    <th className="text-left py-3 px-4 font-semibold">Date</th>

                    <th className="text-left py-3 px-4 font-semibold">Time</th>

                  </tr>

                </thead>

                <tbody>

                  {payments.map((payment) => (

                    <tr key={payment._id || payment.transactionId || `${payment.contractId}-${payment.date}`} className="border-b hover:bg-gray-50">

                      <td className="py-3 px-4">

                        <div>{payment.buyer?.name || payment.buyerName || '-'}</div>

                        <div className="text-sm text-gray-500">{payment.buyer?.email || '-'}</div>

                      </td>

                      <td className="py-3 px-4">

                        <div>{payment.farmer?.name || payment.farmerName || '-'}</div>

                        <div className="text-sm text-gray-500">{payment.farmer?.email || '-'}</div>

                      </td>

                      <td className="py-3 px-4">

                        <span className="text-sm font-medium text-gray-900">

                          {(payment.payerName || '-') + ' → ' + (payment.receiverName || '-')}

                        </span>

                      </td>

                      <td className="py-3 px-4">{payment.cropName || '-'}</td>

                      <td className="py-3 px-4 font-semibold text-green-600">

                        ₹{Number(payment.amount || 0).toLocaleString()}

                      </td>

                      <td className="py-3 px-4 text-sm">

                        {payment.date ? new Date(payment.date).toLocaleDateString('en-IN', {

                          year: 'numeric',

                          month: 'short',

                          day: 'numeric'

                        }) : '-'}

                      </td>

                      <td className="py-3 px-4 text-sm">{payment.time || '-'}</td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        )}



        {/* Crops Tab */}

        {activeTab === 'crops' && (

          <div className="space-y-6">

            {/* Marketplace master crops controlled by admin only (front-end demo) */}

            <div className="card">

              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">

                <FiPackage className="text-primary-600" /> Marketplace master crops ({marketCrops.length})

              </h2>



              {/* Add new crop to marketplace board */}

              <div className="mb-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">

                <div>

                  <label className="block text-xs font-medium text-gray-600 mb-1">Crop name</label>

                  <input

                    type="text"

                    className="input-field"

                    value={newMarketCrop.name}

                    onChange={(e) => setNewMarketCrop({ ...newMarketCrop, name: e.target.value })}

                    placeholder="e.g. Apple"

                  />

                </div>

                <div>

                  <label className="block text-xs font-medium text-gray-600 mb-1">Segment</label>

                  <select

                    className="input-field"

                    value={newMarketCrop.segment}

                    onChange={(e) => setNewMarketCrop({ ...newMarketCrop, segment: e.target.value })}

                  >

                    <option>Fruit</option>

                    <option>Vegetable</option>

                    <option>Cereal</option>

                  </select>

                </div>

                <div>

                  <label className="block text-xs font-medium text-gray-600 mb-1">Season</label>

                  <input

                    type="text"

                    className="input-field"

                    value={newMarketCrop.season}

                    onChange={(e) => setNewMarketCrop({ ...newMarketCrop, season: e.target.value })}

                    placeholder="e.g. Winter"

                  />

                </div>

                <div>

                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>

                  <select

                    className="input-field"

                    value={newMarketCrop.category}

                    onChange={(e) => setNewMarketCrop({ ...newMarketCrop, category: e.target.value })}

                  >

                    <option value="fruits">Fruits</option>

                    <option value="vegetables">Vegetables</option>

                    <option value="cereals">Cereals & grains</option>

                  </select>

                </div>

                <div>

                  <label className="block text-xs font-medium text-gray-600 mb-1">Today&apos;s price</label>

                  <input

                    type="text"

                    className="input-field"

                    value={newMarketCrop.price}

                    onChange={(e) => setNewMarketCrop({ ...newMarketCrop, price: e.target.value })}

                    placeholder="e.g. ₹120–150/kg"

                  />

                </div>

                <div className="md:col-span-1 lg:col-span-1">

                  <button

                    type="button"

                    className="btn-primary w-full"

                    onClick={() => {

                      if (!newMarketCrop.name.trim() || !newMarketCrop.price.trim()) return

                      setMarketCrops((prev) => [...prev, newMarketCrop])

                      setNewMarketCrop({

                        name: '',

                        segment: 'Fruit',

                        season: '',

                        category: 'fruits',

                        price: '',

                        details: '',

                      })

                    }}

                  >

                    Add

                  </button>

                </div>

              </div>



              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead>

                    <tr className="border-b bg-gray-50">

                      <th className="text-left py-2 px-3 font-semibold">S.No</th>

                      <th className="text-left py-2 px-3 font-semibold">Crop</th>

                      <th className="text-left py-2 px-3 font-semibold">Segment</th>

                      <th className="text-left py-2 px-3 font-semibold">Season</th>

                      <th className="text-left py-2 px-3 font-semibold">Category</th>

                      <th className="text-left py-2 px-3 font-semibold">Today&apos;s price</th>

                      <th className="text-left py-2 px-3 font-semibold">Actions</th>

                    </tr>

                  </thead>

                  <tbody>

                    {marketCrops.map((item, idx) => (

                      <tr key={`${item.name}-${idx}`} className="border-b hover:bg-gray-50">

                        <td className="py-2 px-3 font-medium">{idx + 1}</td>

                        <td className="py-2 px-3 font-medium">{item.name}</td>

                        <td className="py-2 px-3">{item.segment}</td>

                        <td className="py-2 px-3">{item.season}</td>

                        <td className="py-2 px-3 capitalize">{item.category}</td>

                        <td className="py-2 px-3">

                          <input

                            type="text"

                            className="input-field text-sm"

                            value={item.price}

                            onChange={(e) => {

                              const value = e.target.value

                              setMarketCrops((prev) =>

                                prev.map((c, i) => (i === idx ? { ...c, price: value } : c))

                              )

                            }}

                          />

                        </td>

                        <td className="py-2 px-3 space-x-2">

                          <button

                            type="button"

                            className="text-sm text-primary-600 hover:underline"

                            onClick={() => {

                              // In a real app this would persist to backend; here it is already in state

                            }}

                          >

                            Save

                          </button>

                          <button

                            type="button"

                            className="text-sm text-red-600 hover:underline"

                            onClick={() =>

                              setMarketCrops((prev) => prev.filter((_, i) => i !== idx))

                            }

                          >

                            Remove

                          </button>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>

          </div>

        )}



        {/* Analytics Tab */}

        {activeTab === 'analytics' && analytics && (

          <div className="space-y-6">

            {/* Top Farmers */}

            <div className="card">

              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">

                <FiTrendingUp className="text-green-600" /> Top Farmers by Earnings

              </h2>

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead>

                    <tr className="border-b bg-gray-50">

                      <th className="text-left py-3 px-4 font-semibold">Rank</th>

                      <th className="text-left py-3 px-4 font-semibold">Farmer</th>

                      <th className="text-left py-3 px-4 font-semibold">Email</th>

                      <th className="text-left py-3 px-4 font-semibold">Total Earnings</th>

                      <th className="text-left py-3 px-4 font-semibold">Payments</th>

                    </tr>

                  </thead>

                  <tbody>

                    {analytics.topFarmers.map((farmer, index) => (

                      <tr key={farmer._id} className="border-b hover:bg-gray-50">

                        <td className="py-3 px-4 font-bold text-primary-600">#{index + 1}</td>

                        <td className="py-3 px-4 font-medium">{farmer.farmerName}</td>

                        <td className="py-3 px-4">{farmer.farmerEmail}</td>

                        <td className="py-3 px-4 font-semibold text-green-600">

                          {formatCurrency(farmer.totalEarnings)}

                        </td>

                        <td className="py-3 px-4">{farmer.paymentCount}</td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>



            {/* Top Buyers */}

            <div className="card">

              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">

                <FiShoppingCart className="text-blue-600" /> Top Buyers by Spending

              </h2>

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead>

                    <tr className="border-b bg-gray-50">

                      <th className="text-left py-3 px-4 font-semibold">Rank</th>

                      <th className="text-left py-3 px-4 font-semibold">Buyer</th>

                      <th className="text-left py-3 px-4 font-semibold">Business</th>

                      <th className="text-left py-3 px-4 font-semibold">Total Spending</th>

                      <th className="text-left py-3 px-4 font-semibold">Payments</th>

                    </tr>

                  </thead>

                  <tbody>

                    {analytics.topBuyers.map((buyer, index) => (

                      <tr key={buyer._id} className="border-b hover:bg-gray-50">

                        <td className="py-3 px-4 font-bold text-primary-600">#{index + 1}</td>

                        <td className="py-3 px-4 font-medium">{buyer.buyerName}</td>

                        <td className="py-3 px-4">{buyer.businessName || buyer.buyerEmail}</td>

                        <td className="py-3 px-4 font-semibold text-blue-600">

                          {formatCurrency(buyer.totalSpending)}

                        </td>

                        <td className="py-3 px-4">{buyer.paymentCount}</td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>



            {/* Contracts by Status */}

            <div className="card">

              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">

                <FiBarChart2 className="text-purple-600" /> Contracts by Status

              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                {analytics.contractsByStatus.map((item) => (

                  <div key={item._id} className="p-4 bg-gray-50 rounded-lg">

                    <div className="text-sm text-gray-600 capitalize">{item._id}</div>

                    <div className="text-2xl font-bold text-gray-900 mt-1">{item.count}</div>

                    <div className="text-xs text-gray-500 mt-1">

                      {formatCurrency(item.totalAmount)} total

                    </div>

                  </div>

                ))}

              </div>

            </div>



            {/* Crops by Category */}

            <div className="card">

              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">

                <FiPackage className="text-green-600" /> Crops by Category

              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                {analytics.cropsByCategory.map((item) => (

                  <div key={item._id} className="p-4 bg-gray-50 rounded-lg">

                    <div className="text-sm text-gray-600 capitalize">{item._id}</div>

                    <div className="text-2xl font-bold text-gray-900 mt-1">{item.count}</div>

                    <div className="text-xs text-gray-500 mt-1">

                      {item.totalQuantity} {item.totalQuantity > 1 ? 'units' : 'unit'}

                    </div>

                  </div>

                ))}

              </div>

            </div>

          </div>

        )}

      </div>

    </div>

  )

}



export default AdminDashboard

