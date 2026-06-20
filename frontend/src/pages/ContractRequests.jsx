import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { toast } from 'react-toastify'
import { FiCheck, FiX, FiFileText, FiUser, FiPackage, FiCalendar, FiDollarSign } from 'react-icons/fi'
import NavBar from '../components/NavBar'
import { useAuth } from '../context/AuthContext'

const ContractRequests = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [contracts, setContracts] = useState({})
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState({})

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications?type=contract_request')
      // Filter to show only pending requests
      const pendingRequests = (res.data.data || []).filter(r => r.requestStatus === 'pending' || !r.requestStatus)
      setRequests(pendingRequests)
      
      // Fetch contract details for all requests
      const contractPromises = pendingRequests
        .filter(r => r.relatedId)
        .map(async (notification) => {
          try {
            const contractRes = await api.get(`/contracts/${notification.relatedId}`)
            return { notificationId: notification._id, contract: contractRes.data.data }
          } catch (error) {
            return { notificationId: notification._id, contract: null }
          }
        })
      
      const contractResults = await Promise.all(contractPromises)
      const contractsMap = {}
      contractResults.forEach(({ notificationId, contract }) => {
        if (contract) {
          contractsMap[notificationId] = contract
        }
      })
      setContracts(contractsMap)
    } catch (error) {
      toast.error('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (notification) => {
    if (!window.confirm('Accept this contract request?')) return

    setProcessing({ ...processing, [notification._id]: 'accepting' })

    try {
      await api.put(`/notifications/${notification._id}/accept-request`)
      await api.put(`/notifications/${notification._id}/read`)
      toast.success('Request accepted!')
      setRequests(requests.filter(r => r._id !== notification._id))
      await fetchRequests()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept request')
    } finally {
      setProcessing({ ...processing, [notification._id]: false })
    }
  }

  const handleReject = async (notification) => {
    if (!window.confirm('Reject this contract request?')) return

    setProcessing({ ...processing, [notification._id]: 'rejecting' })

    try {
      // Update notification status to rejected
      await api.put(`/notifications/${notification._id}/reject-request`)
      
      toast.success('Request rejected')
      
      // Remove from list
      setRequests(requests.filter(r => r._id !== notification._id))
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request')
    } finally {
      setProcessing({ ...processing, [notification._id]: false })
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
            {user?.role === 'buyer' ? "Farmers' Requests" : "Requests from Buyers"}
          </h1>
          <p className="text-gray-600 mt-2">
            Manage contract requests from {user?.role === 'buyer' ? 'farmers' : 'buyers'}
          </p>
        </div>

        {requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((notification) => {
              const contract = contracts[notification._id]
              
              return (
                <div key={notification._id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <FiFileText className="text-yellow-600 text-xl" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{notification.title}</h3>
                          <p className="text-gray-600 text-sm">{notification.message}</p>
                        </div>
                      </div>

                      {contract && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-3">Contract Details</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="flex items-center gap-2 text-gray-600 mb-1">
                                <FiPackage className="text-primary-600" />
                                <span>Crop</span>
                              </div>
                              <p className="font-medium text-gray-900">{contract.crop?.name}</p>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 text-gray-600 mb-1">
                                <FiUser className="text-primary-600" />
                                <span>{user?.role === 'buyer' ? 'Farmer' : 'Buyer'}</span>
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
                                <FiCalendar className="text-primary-600" />
                                <span>Delivery</span>
                              </div>
                              <p className="font-medium text-gray-900 text-xs">
                                {new Date(contract.deliveryDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {contract.terms && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm text-gray-600">
                                {typeof contract.terms === 'object' && contract.terms?.en != null ? String(contract.terms.en) : contract.terms}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => handleAccept(notification)}
                          disabled={processing[notification._id]}
                          className="btn-primary flex items-center gap-2 disabled:opacity-50"
                        >
                          <FiCheck />
                          {processing[notification._id] === 'accepting' ? 'Accepting...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleReject(notification)}
                          disabled={processing[notification._id]}
                          className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                        >
                          <FiX />
                          {processing[notification._id] === 'rejecting' ? 'Rejecting...' : 'Reject'}
                        </button>
                        {notification.relatedId && (
                          <Link
                            to={`/contracts/${notification.relatedId}`}
                            className="btn-secondary flex items-center gap-2"
                          >
                            <FiFileText />
                            View Contract
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card text-center py-12">
            <FiFileText className="text-6xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No contract requests at the moment</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ContractRequests
