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

const getFarmerPlace = (crop = {}) => {
  const address = crop?.farmer?.address
  const addressParts =
    address && typeof address === 'object'
      ? [address.fullAddress, address.city, address.state, address.pincode]
      : [address]

  const location = crop?.location || {}
  const locationParts = [location.fullAddress, location.city, location.state, location.pincode]

  return [...locationParts, ...addressParts].filter(Boolean).join(', ')
}

const FarmerCircle = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [crops, setCrops] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [query, setQuery] = useState('')
  const [revOpen, setRevOpen] = useState(false)
  const [revTarget, setRevTarget] = useState(null)
  const [revList, setRevList] = useState([])

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const res = await axios.get('/api/crops?status=all')
        const all = res.data.data || []
        const filtered = all.filter((c) => {
          const name = (c?.name || '').toString().toLowerCase()
          return name !== 'mango' && name !== 'apple'
        })
        setCrops(filtered)
      } catch (error) {
        toast.error('Failed to load farmer crops')
      } finally {
        setLoading(false)
      }
    }

    fetchCrops()
  }, [])

  const matchesFilter = (crop) => {
    const term = normalizeText(query || '')
    if (!filterType || !term) return true
    if (filterType === 'name') {
      return (crop.farmer?.name || '').toString().toLowerCase().includes(term)
    }
    if (filterType === 'products') {
      const name = (crop.name || '').toString().toLowerCase()
      const category = (crop.category || '').toString().toLowerCase()
      return name.includes(term) || category.includes(term)
    }
    if (filterType === 'place') {
      const placeText = normalizeText(getFarmerPlace(crop))
      return placeText.includes(term)
    }
    if (filterType === 'all-products') {
      const category = (crop.category || '').toString().toLowerCase()
      return category.includes(term)
    }
    return true
  }
  const handleRequest = async (crop) => {
    if (!user) {
      toast.error('Please log in as a buyer to request a crop')
      navigate('/login')
      return
    }

    if (user.role !== 'buyer') {
      toast.error('Only buyers can request farmer crops')
      return
    }

    try {
      await axios.post('/api/notifications', {
        user: crop.farmer?._id,
        type: 'contract_request',
        title: 'Buyer request',
        message: `${user.name} is interested in your crop ${crop.name}`,
        relatedId: crop._id,
        relatedModel: 'Crop',
      })
      toast.success('Request sent to farmer')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request')
    }
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Farmer Circle</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Browse crops uploaded by farmers and send contract requests directly.
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

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          </div>
        ) : crops.filter(matchesFilter).length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">
              No results found.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {crops.filter(matchesFilter).map((crop) => (
              <article key={crop._id} className="card flex flex-col justify-between">
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Place:{' '}
                    <span className="font-medium">
                      {getFarmerPlace(crop) || 'N/A'}
                    </span>
                  </p>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {toTitleCase(crop.name)}
                    </h3>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 capitalize">
                      {crop.quality || 'standard'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600">
                    Farmer:{' '}
                    <span className="font-medium">
                      {crop.farmer?.name || 'Unknown'}
                    </span>
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500 text-lg">★</span>
                      <span className="font-semibold">
                        {(crop.farmer?.rating?.average || 0).toFixed?.(1) || (crop.farmer?.rating?.average ?? 0)}
                      </span>
                      <span className="text-gray-500">/ 5</span>
                      <span className="text-gray-600 ml-2">({crop.farmer?.rating?.count || 0})</span>
                    </div>
                    <button
                      className="btn-secondary text-xs"
                      onClick={async () => {
                        if (!crop.farmer?._id) return
                        setRevTarget({ id: crop.farmer._id, name: crop.farmer.name })
                        try {
                          const res = await axios.get(`/api/reviews/user/${crop.farmer._id}`)
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
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Harvest date</p>
                      <p className="font-medium">{formatDate(crop.harvestDate)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Quantity</p>
                      <p className="font-medium">
                        {crop.quantity} {crop.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Expected price</p>
                      <p className="font-medium">
                        ₹{crop.expectedPrice}/{crop.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total value (approx.)</p>
                      <p className="font-semibold text-primary-700">
                        {formatCurrency((crop.expectedPrice || 0) * (crop.quantity || 0))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex justify-end">
                  {user?.role === 'buyer' && (
                    <button
                      onClick={() => handleRequest(crop)}
                      className="btn-primary text-sm"
                    >
                      Request this crop
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

export default FarmerCircle

