import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import NavBar from '../components/NavBar'
import { useAuth } from '../context/AuthContext'

const toTitleCase = (str = '') =>
  str
    .toString()
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const normalizeText = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const getBuyerPlace = (contract = {}) => {
  const buyerAddress = contract?.buyer?.address
  const buyerAddressParts =
    buyerAddress && typeof buyerAddress === 'object'
      ? [buyerAddress.fullAddress, buyerAddress.city, buyerAddress.state, buyerAddress.pincode]
      : [buyerAddress]

  const delivery =
    typeof contract.deliveryAddress === 'object' && contract.deliveryAddress?.en != null
      ? String(contract.deliveryAddress.en)
      : contract.deliveryAddress
  return [delivery, ...buyerAddressParts].filter(Boolean).join(', ')
}

const BuyerCircle = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requirements, setRequirements] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [query, setQuery] = useState('')
  const [revOpen, setRevOpen] = useState(false)
  const [revTarget, setRevTarget] = useState(null)
  const [revList, setRevList] = useState([])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchRequirements = async () => {
      try {
        // Common board: all buyer-created requirements (show all statuses to keep persistent)
        const res = await axios.get('/api/contracts/requirements')
        setRequirements(res.data.data || [])
      } catch (error) {
        toast.error('Failed to load buyer requirements')
      } finally {
        setLoading(false)
      }
    }

    fetchRequirements()
  }, [user])

  const matchesFilter = (contract) => {
    const term = normalizeText(query || '')
    if (!filterType || !term) return true
    if (filterType === 'name') {
      return (contract.buyer?.name || '').toString().toLowerCase().includes(term)
    }
    if (filterType === 'products') {
      const name = (contract.cropName || contract.crop?.name || '').toString().toLowerCase()
      const category = (contract.category || contract.crop?.category || '').toString().toLowerCase()
      return name.includes(term) || category.includes(term)
    }
    if (filterType === 'place') {
      const placeText = normalizeText(getBuyerPlace(contract))
      return placeText.includes(term)
    }
    if (filterType === 'all-products') {
      const category = (contract.category || contract.crop?.category || '').toString().toLowerCase()
      return category.includes(term)
    }
    return true
  }
  const handleRequest = (contract) => {
    if (!user) {
      toast.error('Please log in as a farmer to request a requirement')
      navigate('/login')
      return
    }

    if (user.role !== 'farmer') {
      toast.error('Only farmers can request buyer requirements')
      return
    }

    // Send a contract request notification to the buyer
    axios.post('/api/notifications', {
      user: contract.buyer?._id || contract.buyer,
      type: 'contract_request',
      title: 'Farmer Request',
      message: `${user.name} has requested to fulfill your requirement for ${contract.cropName || contract.crop?.name}`,
      relatedId: contract._id,
      relatedModel: 'Contract',
      requestedBy: user.id || user._id
    })
      .then(() => {
        toast.success('Request sent to buyer!')
      })
      .catch(() => {
        toast.error('Failed to send request')
      })
  }

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Buyer Circle</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Browse crop requirements uploaded by buyers and respond with your crops.
          </p>
        </header>
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex gap-3 items-center">
              <label className="text-sm text-gray-700">Filter by</label>
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setQuery('') }}
                className="input-field w-52"
              >
                <option value="">None</option>
                <option value="name">Name</option>
                <option value="products">Products</option>
                <option value="place">Place</option>
                <option value="all-products">All Products</option>
              </select>
            </div>
            {filterType && (
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to filter..."
                className="input-field w-64"
              />
            )}
          </div>
        </div>

        {!user ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg mb-4">
              Please log in as a buyer or farmer to view circle requests.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
            >
              Go to login
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          </div>
        ) : requirements.filter(matchesFilter).length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">
              No results found.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requirements.filter(matchesFilter).map((contract) => (
              <article key={contract._id} className="card flex flex-col justify-between">
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Place:{' '}
                    <span className="font-medium">
                      {getBuyerPlace(contract) || 'N/A'}
                    </span>
                  </p>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {toTitleCase(contract.cropName || contract.crop?.name || '')}
                    </h3>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      Grade {contract.cropGrade || 'A'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600">
                    Buyer:{' '}
                    <span className="font-medium">
                      {contract.buyer?.name || 'Unknown'}
                    </span>
                  </p>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500 text-lg">★</span>
                      <span className="font-semibold">
                        {(contract.buyer?.rating?.average || 0).toFixed?.(1) || (contract.buyer?.rating?.average ?? 0)}
                      </span>
                      <span className="text-gray-500">/ 5</span>
                      <span className="text-gray-600 ml-2">({contract.buyer?.rating?.count || 0})</span>
                    </div>
                    {contract.buyer?._id && (
                      <button
                        className="btn-secondary text-xs"
                        onClick={async () => {
                          setRevTarget({ id: contract.buyer._id, name: contract.buyer.name })
                          try {
                            const res = await axios.get(`/api/reviews/user/${contract.buyer._id}`)
                            setRevList(res.data?.data || [])
                          } catch {
                            setRevList([])
                          } finally {
                            setRevOpen(true)
                          }
                        }}
                      >
                        View Reviews
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Delivery / harvest date</p>
                      <p className="font-medium">
                        {formatDate(contract.deliveryDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Quantity</p>
                      <p className="font-medium">
                        {contract.quantity} {contract.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Expected price</p>
                      <p className="font-medium">
                        ₹{contract.pricePerUnit}/{contract.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total amount</p>
                      <p className="font-semibold text-primary-700">
                        {formatCurrency(contract.totalAmount || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex justify-end">
                  {user.role === 'farmer' && (
                    <button
                      onClick={() => handleRequest(contract)}
                      className="btn-primary text-sm"
                    >
                      Request this requirement
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      {revOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-gray-900">Reviews</h3>
              <button className="btn-secondary" onClick={() => setRevOpen(false)}>Close</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {revTarget?.name}
            </p>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {revList.length === 0 ? (
                <p className="text-gray-500">No reviews yet</p>
              ) : (
                revList.map((r) => (
                  <div key={r._id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{r.reviewerId?.name || 'User'}</div>
                      <div className="text-yellow-500">{'★'.repeat(r.rating)}</div>
                    </div>
                    <div className="text-sm text-gray-700 mt-2">{r.comment}</div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(r.createdAt).toLocaleString('en-IN')}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BuyerCircle

