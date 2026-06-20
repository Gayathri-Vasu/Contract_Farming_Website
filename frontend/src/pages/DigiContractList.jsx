import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import NavBar from '../components/NavBar'
import { useAuth } from '../context/AuthContext'

const statusLabel = (raw) => {
  const s = (raw || '').toString().toLowerCase()
  if (s === 'active') return { text: 'Active', cls: 'bg-green-100 text-green-800' }
  if (s === 'completed') return { text: 'Completed', cls: 'bg-blue-100 text-blue-800' }
  if (s === 'signed') return { text: 'Partially Signed', cls: 'bg-yellow-100 text-yellow-800' }
  return { text: 'Pending', cls: 'bg-gray-100 text-gray-800' }
}

export default function DigiContractList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    let mounted = true
    const fetchContracts = async () => {
      setLoading(true)
      try {
        const userId = user?._id || user?.id
        const res = await axios.get(`/api/digicontracts/user/${userId}`)
        if (!mounted) return
        const items = res.data?.data || []
        setContracts(items)
      } catch {
        setContracts([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    if (user) fetchContracts()
    return () => {
      mounted = false
    }
  }, [user])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return contracts.filter((c) => {
      const s = (c.status || '').toString().toLowerCase()
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && (s === 'pending' || s === '')) ||
        (statusFilter === 'partial' && s === 'signed') ||
        (statusFilter === 'active' && s === 'active') ||
        (statusFilter === 'completed' && s === 'completed')
      if (!matchesStatus) return false
      if (!term) return true
      const id = (c.contractId || c._id || '').toString().toLowerCase()
      const crop = (c.product?.cropName || c.cropName || c.crop || '').toString().toLowerCase()
      return id.includes(term) || crop.includes(term)
    })
  }, [contracts, search, statusFilter])

  const toAmount = (c) => {
    if (typeof c.totalAmount === 'number') return c.totalAmount
    const q = Number(c.quantity) || 0
    const p = Number(c.pricePerUnit) || 0
    return q * p
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Digi Contracts</h1>
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Contract ID or Crop"
              className="input-field w-64"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
              title="Filter by status"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="partial">Partially Signed</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="bg-white shadow-md border border-gray-200 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    DigiContract ID
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Crop
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    View
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Download
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                      No contracts found
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const label = statusLabel(c.status)
                    return (
                      <tr key={c._id} className="border-t">
                        <td className="px-6 py-4 font-mono text-sm">
                          {c.digiContractId || c._id}
                        </td>
                        <td className="px-6 py-4">
                          {c.product?.cropName || c.crop || '—'}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          ₹{(c.product?.totalAmount ?? toAmount(c)).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                            {c.paymentStatus || 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            to={`/digi-contracts/${c._id}`}
                            className="btn-primary"
                            title="View contract"
                          >
                            View
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={`/api/digicontracts/${c._id}/pdf`}
                            className="btn-secondary"
                            title="Download PDF"
                          >
                            Download
                          </a>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
