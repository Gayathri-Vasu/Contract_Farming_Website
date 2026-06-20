import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { FiSearch, FiPackage } from 'react-icons/fi'
import NavBar from '../components/NavBar'
import { useAuth } from '../context/AuthContext'
import { MARKET_CROPS } from '../constants/marketCrops'

const Marketplace = () => {
  const { user } = useAuth()
  const [crops, setCrops] = useState([])
  const [loading, setLoading] = useState(true)
  const [marketPrices, setMarketPrices] = useState([])
  const [marketLoading, setMarketLoading] = useState(true)
  const [marketUnavailable, setMarketUnavailable] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    state: ''
  })

  useEffect(() => {
    fetchCrops()
  }, [filters])

  useEffect(() => {
    let intervalId

    const loadMarketPrices = async () => {
      try {
        setMarketLoading(true)
        const res = await axios.get('/api/market-prices')
        const list = Array.isArray(res?.data?.data) ? res.data.data : []
        setMarketPrices(list)
        setMarketUnavailable(false)
      } catch (error) {
        setMarketPrices([])
        setMarketUnavailable(true)
      } finally {
        setMarketLoading(false)
      }
    }

    loadMarketPrices()
    intervalId = setInterval(loadMarketPrices, 30000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  const fetchCrops = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.category) params.append('category', filters.category)
      if (filters.minPrice) params.append('minPrice', filters.minPrice)
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice)
      params.append('status', 'available')

      // Fetch real crop listings from backend
      const res = await axios.get(`/api/crops?${params.toString()}`)
      const filteredCrops = res.data.data ? res.data.data.filter(crop => crop.name.toLowerCase() !== 'mango') : []
      setCrops(filteredCrops)
    } catch (error) {
      console.error('Error fetching crops:', error)
      toast.error(error.response?.data?.message || 'Failed to load crops')
      setCrops([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value })
  }

  const categories = ['cereals', 'pulses', 'vegetables', 'fruits', 'spices', 'oilseeds', 'others']

  // Helper to read a numeric value from a price string like "₹120–150/kg"
  const extractPriceNumber = (priceStr) => {
    if (!priceStr) return null
    const match = String(priceStr).match(/\d+(\.\d+)?/)
    return match ? parseFloat(match[0]) : null
  }

  // Front-end filtering for the static MARKET_CROPS board using the same filters
  const filteredMarketCrops = MARKET_CROPS.filter((item) => {
    const search = filters.search.trim().toLowerCase()
    if (search) {
      const haystack = `${item.name} ${item.segment} ${item.details}`.toLowerCase()
      if (!haystack.includes(search)) return false
    }

    if (filters.category && item.category !== filters.category) {
      return false
    }

    const priceNumber = extractPriceNumber(item.price)
    if (filters.minPrice) {
      const min = parseFloat(filters.minPrice)
      if (!Number.isNaN(min) && priceNumber !== null && priceNumber < min) {
        return false
      }
    }
    if (filters.maxPrice) {
      const max = parseFloat(filters.maxPrice)
      if (!Number.isNaN(max) && priceNumber !== null && priceNumber > max) {
        return false
      }
    }

    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Crop Marketplace</h1>
          <p className="text-gray-600">Browse available crops from verified farmers</p>
        </div>

        {/* Filters */}
        <div className="card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="search"
                  placeholder="Search crops..."
                  value={filters.search}
                  onChange={handleFilterChange}
                  className="input-field pl-10"
                />
              </div>
            </div>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="input-field"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
            <input
              type="number"
              name="minPrice"
              placeholder="Min Price"
              value={filters.minPrice}
              onChange={handleFilterChange}
              className="input-field"
            />
            <input
              type="number"
              name="maxPrice"
              placeholder="Max Price"
              value={filters.maxPrice}
              onChange={handleFilterChange}
              className="input-field"
            />
          </div>
        </div>

        {/* Crops Grid from farmer listings */}
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : crops.length > 0 && (
          <div className="mb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {crops.map((product) => (
                <div key={product._id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2 py-1 bg-primary-100 text-primary-800 rounded text-sm capitalize">
                      {product.category}
                    </span>
                    {product.location?.city && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm capitalize">
                        {product.location.city}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                  <div className="space-y-2 mb-4 text-gray-600">
                    <p className="text-lg font-semibold text-primary-600">
                      <strong>Price:</strong> ₹{product.expectedPrice}/{product.unit}
                    </p>
                    <p className="text-sm"><strong>Quantity:</strong> {product.quantity} {product.unit}</p>
                    {product.harvestDate && (
                      <p className="text-sm"><strong>Harvest:</strong> {new Date(product.harvestDate).toLocaleDateString()}</p>
                    )}
                    {product.description && (
                      <p className="text-sm text-gray-500">
                        {typeof product.description === 'object' && product.description?.en != null ? String(product.description.en) : product.description}
                      </p>
                    )}
                  </div>
                  {user && user.role === 'buyer' ? (
                    <Link
                      to={`/contracts/new?cropId=${product._id}`}
                      className="btn-primary w-full text-center block"
                    >
                      View Details
                    </Link>
                  ) : !user ? (
                    <Link
                      to="/login"
                      className="btn-primary w-full text-center block"
                    >
                      Login to View Details
                    </Link>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-2">
                      Browse marketplace products
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Static daily market board as cards */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Live Market Prices (Tamil Nadu)</h2>
          <p className="text-gray-600 mb-4 text-sm">
            Real-time agricultural market rates from data.gov.in. Auto-refreshes every 30 seconds.
          </p>

          {marketLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : marketUnavailable ? (
            <div className="card text-center py-6 text-gray-600">Data unavailable</div>
          ) : marketPrices.length > 0 ? (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold">Crop Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Market</th>
                    <th className="text-left py-3 px-4 font-semibold">Price (₹ / kg)</th>
                    <th className="text-left py-3 px-4 font-semibold">Min/Max Price (₹ / kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {marketPrices.map((item) => (
                    <tr key={`${item.cropName}-${item.market}-${item.date}`} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{item.cropName || '-'}</td>
                      <td className="py-3 px-4">{item.market || '-'}</td>
                      <td className="py-3 px-4 font-semibold text-primary-700">₹{Number(item.modalPrice || 0).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4">
                        ₹{Number(item.minPrice || 0).toLocaleString('en-IN')} / ₹{Number(item.maxPrice || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card text-center py-6 text-gray-600">Data unavailable</div>
          )}
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Today&apos;s open market board
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            Sample real-time style prices for key fruits, vegetables and cereals across Indian markets.
            Prices are indicative for UX demo only.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMarketCrops.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl shadow-sm border border-emerald-200 p-4 flex flex-col justify-between hover:shadow-md transition-shadow bg-emerald-50"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.segment} • {item.season}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs capitalize">
                    {item.category}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{item.details}</p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-xs text-gray-500">Today&apos;s market price</span>
                  <span className="text-base font-semibold text-primary-700">
                    {item.price}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Marketplace



