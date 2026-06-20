import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api/client'
import { toast } from 'react-toastify'
import { FiFileText, FiCheck, FiX, FiMessageSquare, FiBell, FiCalendar } from 'react-icons/fi'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'

const ACCEPTED_STATUSES = ['accepted', 'signed', 'active', 'paid', 'completed']

const getAcceptedAt = (contract) => {
  if (!contract) return null
  if (contract.acceptedAt) return contract.acceptedAt
  if (contract.contractDocument?.generatedAt) return contract.contractDocument.generatedAt
  const status = (contract.status || '').toString().toLowerCase()
  if (ACCEPTED_STATUSES.includes(status)) return contract.updatedAt || contract.createdAt
  return null
}

const formatAcceptedLabel = (dateStr) => {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((startOfToday - startOfDate) / (86400000))

  const datePart = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  if (diffDays === 0) return `Today, ${datePart}`
  if (diffDays === 1) return `Yesterday, ${datePart}`

  const dayPart = d.toLocaleDateString('en-IN', { weekday: 'long' })
  return `${dayPart}, ${datePart}`
}

const Contracts = () => {
  const { user, token } = useAuth()
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const location = useLocation()
  const [polling, setPolling] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [unread, setUnread] = useState({})
  const [visitedOrder, setVisitedOrder] = useState([])
  const [reviewed, setReviewed] = useState([])
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  useEffect(() => {
    fetchContracts()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const type = (params.get('type') || '').toLowerCase()
    if (['pending', 'accepted', 'signed', 'active', 'completed', 'cancelled'].includes(type)) {
      setStatusFilter(type)
    }
    const refresh = params.get('refresh')
    if (refresh) {
      if (polling) clearInterval(polling)
      const id = setInterval(fetchContracts, 2000)
      setPolling(id)
      setTimeout(() => {
        clearInterval(id)
        setPolling(null)
      }, 20000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  useEffect(() => {
    // Refetch when filter changes to capture server-side updates too
    fetchContracts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  // Live notifications via SSE to update unread counts without refresh
  useEffect(() => {
    // Live notifications via SSE to update unread counts without refresh.
    // Re-create stream when the token changes (per tab auth).
    if (!token) return

    let es
    try {
      es = new EventSource(`/api/notifications/stream-token?token=${token}`)
      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data)
          if (!data || !data.type) return
          if (data.type === 'contract_message' && data.relatedId) {
            setUnread((prev) => {
              const next = { ...prev }
              next[data.relatedId] = (next[data.relatedId] || 0) + 1
              return next
            })
          }
          if (data.type === 'contract_accepted' && data.relatedId) {
            // Optional: refresh list when a contract is accepted
            fetchContracts()
          }
        } catch {}
      }
      es.onerror = () => {}
    } catch {}
    return () => {
      if (es && es.close) es.close()
    }
  }, [token])

  useEffect(() => {
    const loadReviewed = async () => {
      try {
        const res = await api.get('/reviews/my')
        const ids = Array.isArray(res?.data?.data) ? res.data.data : []
        setReviewed(ids)
      } catch {}
    }
    loadReviewed()
  }, [])

  const fetchContracts = async () => {
    try {
      setRefreshing(true)
      const url = '/contracts'
      const res = await api.get(url)
      const list = res?.data?.data || res?.data || []
      const normalized = Array.isArray(list) ? list : []
      setContracts(normalized)
      // Fetch unread counts per contract
      try {
        const myId = String(user?._id || user?.id || '')
        const counts = await Promise.all(
          normalized.map(async (c) => {
            const buyerId = String(c.buyer?._id || c.buyer || '')
            const farmerId = String(c.farmer?._id || c.farmer || '')
            if (!myId || (myId !== buyerId && myId !== farmerId)) {
              return [c._id, 0]
            }
            try {
              const r = await api.get(`/messages/unread/${c._id}`)
              return [c._id, r?.data?.unreadCount || 0]
            } catch {
              return [c._id, 0]
            }
          })
        )
        const map = {}
        counts.forEach(([id, cnt]) => { map[id] = cnt })
        setUnread(map)
      } catch {}
    } catch (error) {
      toast.error('Failed to load contracts')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const roleKey = (user?.role === 'farmer' || user?.role === 'buyer') ? user.role : 'guest'
    try {
      const raw = localStorage.getItem(`visitedContracts_${roleKey}`)
      const hist = raw ? JSON.parse(raw) : []
      setVisitedOrder(Array.isArray(hist) ? hist : [])
    } catch {
      setVisitedOrder([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role])

  const markVisited = (id) => {
    try {
      localStorage.setItem('lastVisitedContract', id)
      const roleKey = (user?.role === 'farmer' || user?.role === 'buyer') ? user.role : 'guest'
      const raw = localStorage.getItem(`visitedContracts_${roleKey}`)
      const prev = raw ? JSON.parse(raw) : []
      const next = [id, ...prev.filter(x => x !== id)]
      localStorage.setItem(`visitedContracts_${roleKey}`, JSON.stringify(next))
      setVisitedOrder(next)
    } catch {}
    updateLastInteracted(id)
  }

  const updateLastInteracted = async (id) => {
    try {
      await api.put(`/contracts/${id}/last-interacted`)
      setContracts((prev) =>
        prev.map((c) => (c._id === id ? { ...c, lastInteractedAt: new Date().toISOString() } : c))
      )
    } catch {}
  }

  const handleAccept = async (contractId) => {
    try {
      await api.put(`/contracts/${contractId}/accept`)
      toast.success('Contract accepted!')
      fetchContracts()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept contract')
    }
  }

  const handleReject = async (contractId) => {
    if (!window.confirm('Are you sure you want to reject this contract?')) return
    
    try {
      await api.put(`/contracts/${contractId}/reject`)
      toast.success('Contract rejected')
      fetchContracts()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject contract')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      signed: 'bg-green-100 text-green-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      disputed: 'bg-orange-100 text-orange-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const isPaid = (c) => {
    const tag = (c.paymentStatus || c.status || '').toString().toLowerCase()
    if (tag === 'paid') return true
    const totalPaid = Array.isArray(c.payments)
      ? c.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
      : 0
    const totalAmount = Number(
      c.totalAmount ||
        (Number(c.quantity || 0) * Number(c.pricePerUnit || 0))
    )
    return totalAmount > 0 && totalPaid >= totalAmount
  }

  const getComputedStatus = (c) => {
    const fSigned = !!c.farmerSignature?.signed
    const bSigned = !!c.buyerSignature?.signed
    const paid = isPaid(c)
    if (fSigned && bSigned && paid) return 'completed'
    if (fSigned && bSigned && !paid) return 'signed'
    if ((fSigned || bSigned) && !paid) return 'active'
    const s = (c.status || '').toString().toLowerCase()
    if (s === 'accepted' && !fSigned && !bSigned) return 'accepted'
    return s
  }

  const matchesFilter = (c) => {
    if (!statusFilter) return true
    const cs = getComputedStatus(c)
    if (statusFilter === 'accepted') {
      // "Accepted" filter should include paid/completed contracts too.
      return ['accepted', 'active', 'paid', 'completed'].includes(cs)
    }
    return cs === statusFilter
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Contracts</h1>
            <p className="text-gray-600 mt-2">Manage your farming contracts</p>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-auto"
            >
              <option value="">All Status</option>
              <option value="accepted">Accepted</option>
              <option value="signed">Signed</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
            <button
              className="btn-secondary"
              onClick={() => fetchContracts()}
              disabled={refreshing}
              title="Refresh contracts"
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (contracts.filter((c) => matchesFilter(c)).length > 0) ? (
          <div className="space-y-4">
            {(() => {
              const filtered = contracts.filter((c) => matchesFilter(c))
              const orderedContracts = [...filtered].sort((a, b) => {
                const la = a.lastInteractedAt ? new Date(a.lastInteractedAt).getTime() : 0
                const lb = b.lastInteractedAt ? new Date(b.lastInteractedAt).getTime() : 0
                if (la !== lb) return lb - la
                const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0
                const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0
                return cb - ca
              })
              return orderedContracts.map((contract) => {
                const sLocal = (contract.status || '').toLowerCase()
                const label = getComputedStatus(contract)
                const acceptedLabel = formatAcceptedLabel(getAcceptedAt(contract))
                return (
              <div key={contract._id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {contract.crop?.name || contract.cropName || 'Crop'}
                    </h3>
                    <p className="text-gray-600">
                      {user?.role === 'farmer' 
                        ? `Buyer: ${contract.buyer?.name || 'N/A'}`
                        : `Farmer: ${contract.farmer?.name || 'N/A'}`
                      }
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(label)}`}>
                    {label}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Quantity</p>
                    <p className="font-semibold">{contract.quantity} {contract.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Price/Unit</p>
                    <p className="font-semibold">₹{contract.pricePerUnit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="font-semibold">₹{contract.totalAmount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Delivery Date</p>
                    <p className="font-semibold">{new Date(contract.deliveryDate).toLocaleDateString()}</p>
                  </div>
                </div>

                {contract.status === 'pending' && user?.role === 'farmer' && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleAccept(contract._id)}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <FiCheck />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleReject(contract._id)}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <FiX />
                      <span>Reject</span>
                    </button>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      to={`/contracts/${contract._id}`}
                      className="btn-secondary"
                      onClick={() => markVisited(contract._id)}
                    >
                      View
                    </Link>
                    {(
                      <Link
                        to={`/contracts/${contract._id}/messages`}
                        className="btn-primary flex items-center gap-2"
                        onClick={() => {
                          markVisited(contract._id)
                          updateLastInteracted(contract._id)
                        }}
                      >
                        <FiMessageSquare /> Message
                      </Link>
                    )}
                    {isPaid(contract) && (
                      reviewed.includes(String(contract._id)) ? (
                        <span className="px-3 py-2 rounded-lg bg-green-100 text-green-800 text-sm">
                          Review Submitted
                        </span>
                      ) : (
                        <button
                          className="btn-primary"
                          onClick={() => {
                            setReviewTarget(contract)
                            setReviewRating(0)
                            setReviewComment('')
                            setReviewOpen(true)
                          }}
                        >
                          Give Review
                        </button>
                      )
                    )}
                    {acceptedLabel && (
                      <span
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-800 text-sm border border-blue-100"
                        title="Contract acceptance date"
                      >
                        <FiCalendar className="shrink-0" />
                        <span>
                          <span className="font-medium">Accepted:</span> {acceptedLabel}
                        </span>
                      </span>
                    )}
                    {(unread[contract._id] > 0) && (
                      <div className="relative inline-flex items-center">
                        <FiBell className="text-gray-500" />
                        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
                          {unread[contract._id]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )})
            })()}
          </div>
        ) : (
          <div className="text-center py-12">
            <FiFileText className="text-6xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No contracts found</p>
          </div>
        )}
      </div>
      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        target={reviewTarget}
        rating={reviewRating}
        setRating={setReviewRating}
        comment={reviewComment}
        setComment={setReviewComment}
        submitting={reviewSubmitting}
        onSubmit={async () => {
          if (!reviewTarget) return
          setReviewSubmitting(true)
          try {
            await api.post('/reviews', {
              contractId: reviewTarget._id,
              rating: reviewRating,
              comment: reviewComment.trim()
            })
            toast.success('Review submitted')
            const id = String(reviewTarget._id)
            setReviewed((prev) => (prev.includes(id) ? prev : [...prev, id]))
            setReviewOpen(false)
            setReviewTarget(null)
          } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to submit review')
          } finally {
            setReviewSubmitting(false)
          }
        }}
      />
    </div>
  )
}

export default Contracts
 
export const ReviewModal = ({ open, onClose, target, rating, setRating, comment, setComment, onSubmit, submitting }) => {
  if (!open || !target) return null
  const filled = (i) => i <= rating
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-3">Give Review</h3>
        <p className="text-sm text-gray-600 mb-4">
          {target.crop?.name || target.cropName} • {new Date(target.deliveryDate).toLocaleDateString()}
        </p>
        <div className="flex gap-2 mb-4">
          {[1,2,3,4,5].map((i) => (
            <button
              key={i}
              type="button"
              className={`text-2xl ${filled(i) ? 'text-yellow-500' : 'text-gray-300'}`}
              onClick={() => setRating(i)}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write your review"
          className="input-field w-full h-28"
        />
        <div className="mt-4 flex gap-3">
          <button
            className="btn-primary disabled:opacity-50"
            disabled={submitting || rating < 1 || comment.trim().length < 1}
            onClick={onSubmit}
          >
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
