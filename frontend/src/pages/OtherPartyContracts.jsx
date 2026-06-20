import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { toast } from 'react-toastify'
import { FiFileText, FiUser, FiPackage, FiCalendar, FiDollarSign } from 'react-icons/fi'
import NavBar from '../components/NavBar'
import { useAuth } from '../context/AuthContext'

const OtherPartyContracts = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState({})
  const [incomingRequests, setIncomingRequests] = useState([])
  const [requestContracts, setRequestContracts] = useState({})
  const getRequesterName = (msg = '') => {
    const idx = msg.indexOf(' has requested')
    return idx > 0 ? msg.slice(0, idx) : ''
  }

  useEffect(() => {
    fetchContracts()
  }, [])

  const fetchContracts = async () => {
    setLoading(true)
    try {
      const [contractsRes, notificationsRes] = await Promise.all([
        // Use API filter designed to return "other party" contracts based on current role
        api.get('/contracts?type=other-party-contracts'),
        // Fetch incoming contract requests for current user (if any)
        api.get('/notifications?type=contract_request&isRead=false').catch(() => ({ data: { data: [] } }))
      ])
      setContracts(contractsRes.data.data || [])
      const pendingReqs = (notificationsRes.data?.data || []).filter((n) => n.requestStatus === 'pending')
      setIncomingRequests(pendingReqs)
      // For buyer view, prefetch related contract details to show crop name
      if ((user?.role === 'buyer') && pendingReqs.length > 0) {
        const ids = [...new Set(pendingReqs.filter(n => n.relatedModel === 'Contract').map(n => n.relatedId))].filter(Boolean)
        const results = await Promise.all(ids.map(id => api.get(`/contracts/${id}`).catch(() => null)))
        const map = {}
        results.forEach((res, idx) => {
          if (res?.data?.data) {
            map[ids[idx]] = res.data.data
          }
        })
        setRequestContracts(map)
      } else {
        setRequestContracts({})
      }
    } catch (error) {
      console.error('Error fetching contracts:', error)
      toast.error('Failed to load contracts')
    } finally {
      setLoading(false)
    }
  }

  const handleRequest = async (contractId, contract) => {
    if (!window.confirm(`Request to join this contract with ${user?.role === 'buyer' ? contract.farmer?.name : contract.buyer?.name}?`)) {
      return
    }

    setRequesting({ ...requesting, [contractId]: true })

    try {
      // Create a contract request/notification
      await api.post('/notifications', {
        user: user?.role === 'buyer' ? contract.farmer?._id : contract.buyer?._id,
        type: 'contract_request',
        title: 'Contract Request',
        message: `${user?.name} has requested to join your contract for ${contract.crop?.name}`,
        relatedId: contractId,
        relatedModel: 'Contract',
        requestedBy: user.id
      })

      toast.success('Request sent successfully!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request')
    } finally {
      setRequesting({ ...requesting, [contractId]: false })
    }
  }

  const handleIncomingRequestAction = async (notification, action) => {
    try {
      const path =
        action === 'accept'
          ? `/notifications/${notification._id}/accept-request`
          : `/notifications/${notification._id}/reject-request`
      await api.put(path)
      toast.success(action === 'accept' ? 'Request approved' : 'Request rejected')
      fetchContracts()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update request')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {user?.role === 'buyer' ? "Farmer's Contracts" : "Buyer requests"}
          </h1>
          <p className="text-gray-600 mt-2">
            {user?.role === 'buyer'
              ? 'Browse and request contracts from farmers'
              : 'Browse buyer requests and send your proposal'}
          </p>
        </div>

        {(user?.role === 'farmer' || user?.role === 'buyer') && incomingRequests.length > 0 && (
          <div className="card mb-8 bg-yellow-50 border-yellow-200">
            <h2 className="text-xl font-bold mb-4">
              {user?.role === 'farmer' ? 'Buyer requests' : 'Farmer requests'}
            </h2>
            <div className="space-y-3">
              {incomingRequests.map((notification) => (
                <div
                  key={notification._id}
                  className="p-4 bg-white rounded-lg border border-yellow-200 flex justify-between items-center"
                >
                  <div className="mr-4">
                    <p className="text-gray-900 font-medium">{notification.title}</p>
                    <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                    {user?.role === 'buyer' && notification.relatedModel === 'Contract' && (
                      <div className="text-sm text-gray-700 mt-2">
                        <span className="mr-4">
                          Crop: <strong>{requestContracts[notification.relatedId]?.crop?.name || requestContracts[notification.relatedId]?.cropName}</strong>
                        </span>
                        <span>
                          Farmer: <strong>{getRequesterName(notification.message) || 'Unknown'}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      onClick={() => handleIncomingRequestAction(notification, 'accept')}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={() => handleIncomingRequestAction(notification, 'reject')}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {user?.role !== 'buyer' && (
          (contracts.filter(c => (c.status || '').toLowerCase() === 'pending').length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contracts
                .filter((c) => (c.status || '').toLowerCase() === 'pending')
                .map((contract) => (
                <div key={contract._id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2 py-1 rounded text-sm ${
                      contract.status === 'active' ? 'bg-green-100 text-green-800' :
                      contract.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      contract.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {(contract.status || '').charAt(0).toUpperCase() + (contract.status || '').slice(1)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <FiPackage className="text-primary-600" />
                        <span className="text-sm">Crop</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{contract.crop?.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{contract.crop?.category}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <FiUser className="text-primary-600" />
                          <span>
                            {user?.role === 'buyer' ? 'Farmer' : 'Buyer'}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900">
                          {user?.role === 'buyer' ? contract.farmer?.name : contract.buyer?.name}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <FiDollarSign className="text-primary-600" />
                          <span>Amount</span>
                        </div>
                        <p className="font-medium text-gray-900">
                          ₹{contract.totalAmount?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <FiPackage className="text-primary-600" />
                          <span>Quantity</span>
                        </div>
                        <p className="font-medium text-gray-900">
                          {contract.quantity} {contract.unit}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <FiCalendar className="text-primary-600" />
                          <span>Delivery</span>
                        </div>
                        <p className="font-medium text-gray-900 text-xs">
                          {new Date(contract.deliveryDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {contract.terms && (
                      <div className="pt-3 border-t">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {typeof contract.terms === 'object' && contract.terms?.en != null ? String(contract.terms.en) : contract.terms}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-3 border-t">
                      <button
                        onClick={() => handleRequest(contract._id, contract)}
                        disabled={requesting[contract._id]}
                        className="btn-primary flex-1 disabled:opacity-50"
                      >
                        {requesting[contract._id] ? 'Requesting...' : 'Request'}
                      </button>
                      <Link
                        to={`/contracts/${contract._id}`}
                        className="btn-secondary"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <FiFileText className="text-6xl text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No buyer requests available</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default OtherPartyContracts
