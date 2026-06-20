import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { api } from '../api/client'
import { toast } from 'react-toastify'
import { FiCheck, FiFileText, FiDollarSign } from 'react-icons/fi'
import NavBar from '../components/NavBar'
import { useAuth } from '../context/AuthContext'

const ContractDetails = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [revOpen, setRevOpen] = useState(false)
  const [revRating, setRevRating] = useState(0)
  const [revComment, setRevComment] = useState('')
  const [revSubmitting, setRevSubmitting] = useState(false)

  const backTarget =
    user?.role === 'farmer'
      ? '/farmer/dashboard'
      : user?.role === 'buyer'
      ? '/buyer/dashboard'
      : user?.role === 'admin'
      ? '/admin/dashboard'
      : '/contracts'

  useEffect(() => {
    fetchContract()
  }, [id])

  const fetchContract = async () => {
    try {
      const res = await axios.get(`/api/contracts/${id}`)
      setContract(res.data.data)
      try {
        const chk = await axios.get(`/api/reviews/contract/${id}`)
        setReviewed(!!chk?.data?.data?.reviewed)
      } catch {}
    } catch (error) {
      toast.error('Failed to load contract')
      navigate(backTarget)
    } finally {
      setLoading(false)
    }
  }

  const handleSign = async () => {
    if (!window.confirm('Are you sure you want to sign this contract? This action cannot be undone.')) return
    
    setSigning(true)
    try {
      await axios.put(`/api/contracts/${id}/sign`)
      toast.success('Contract signed successfully!')
      fetchContract()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to sign contract')
    } finally {
      setSigning(false)
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

  if (!contract) return null

  const canSign = contract.status === 'accepted' && 
    ((user?.role === 'farmer' && !contract.farmerSignature?.signed) ||
     (user?.role === 'buyer' && !contract.buyerSignature?.signed))
  const totalAmount =
    Number(contract?.totalAmount ??
      ((Number(contract?.quantity) || 0) * (Number(contract?.pricePerUnit) || 0)))
  const advanceAmount = Number(contract?.advancePayment?.amount || 0)
  const finalAmount = Number(
    contract?.finalPayment?.amount ?? Math.max(totalAmount - advanceAmount, 0)
  )
  const advancePaid = !!contract?.advancePayment?.paid
  const finalPaid =
    !!contract?.finalPayment?.paid ||
    (String(contract?.paymentStatus || contract?.status || '').toLowerCase() === 'paid')

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to={backTarget} className="text-primary-600 hover:underline mb-4 inline-block">
          ← Back to Dashboard
        </Link>

        <div className="card mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Contract Details
              </h1>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                contract.status === 'active' ? 'bg-green-100 text-green-800' :
                contract.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                contract.status === 'signed' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {contract.status}
              </span>
            </div>
            <Link
              to={`/contracts/${id}/digi`}
              className="btn-secondary flex items-center space-x-2"
              title="Open printable Digi Contract"
            >
              <FiFileText />
              <span>Digi Contract</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600">Crop</p>
              <p className="font-semibold text-lg">{contract.crop?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Category</p>
              <p className="font-semibold">{contract.crop?.category}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Quantity</p>
              <p className="font-semibold">{contract.quantity} {contract.unit}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Price per Unit</p>
              <p className="font-semibold">₹{contract.pricePerUnit}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="font-semibold text-xl text-primary-600">₹{contract.totalAmount?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Delivery Date</p>
              <p className="font-semibold">{new Date(contract.deliveryDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="border-t pt-6 mb-6">
            <h3 className="font-semibold mb-2">Parties</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Farmer</p>
                <p className="font-semibold">{contract.farmer?.name}</p>
                {contract.farmer?.userId && (
                  <p className="text-xs text-gray-500 font-mono">ID: {contract.farmer.userId}</p>
                )}
                <p className="text-sm text-gray-600">{contract.farmer?.email}</p>
                {contract.farmer?.phone && (
                  <p className="text-sm text-gray-600">📞 {contract.farmer.phone}</p>
                )}
                {contract.farmerSignature?.signed && (
                  <p className="text-sm text-green-600 mt-1">✓ Signed</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Buyer</p>
                <p className="font-semibold">{contract.buyer?.name}</p>
                {contract.buyer?.userId && (
                  <p className="text-xs text-gray-500 font-mono">ID: {contract.buyer.userId}</p>
                )}
                <p className="text-sm text-gray-600">{contract.buyer?.email}</p>
                {contract.buyer?.phone && (
                  <p className="text-sm text-gray-600">📞 {contract.buyer.phone}</p>
                )}
                {contract.buyerSignature?.signed && (
                  <p className="text-sm text-green-600 mt-1">✓ Signed</p>
                )}
              </div>
            </div>
          </div>

          {contract.terms && (
            <div className="border-t pt-6 mb-6">
              <h3 className="font-semibold mb-2">Terms & Conditions</h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {typeof contract.terms === 'object' && contract.terms?.en != null ? String(contract.terms.en) : contract.terms}
              </p>
            </div>
          )}

          {contract.crop && (
            <div className="border-t pt-6 mb-6">
              <h3 className="font-semibold mb-4">Product Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contract.crop.goodnessGrade && (
                  <div>
                    <p className="text-sm text-gray-600">Quality Grade</p>
                    <p className="font-semibold">{contract.crop.goodnessGrade}</p>
                  </div>
                )}
                {contract.crop.quality && (
                  <div>
                    <p className="text-sm text-gray-600">Quality</p>
                    <p className="font-semibold">{contract.crop.quality}</p>
                  </div>
                )}
                {contract.crop.harvestDate && (
                  <div>
                    <p className="text-sm text-gray-600">Harvest Date</p>
                    <p className="font-semibold">{new Date(contract.crop.harvestDate).toLocaleDateString()}</p>
                  </div>
                )}
                {contract.crop.expectedPrice && (
                  <div>
                    <p className="text-sm text-gray-600">Expected Price</p>
                    <p className="font-semibold">₹{contract.crop.expectedPrice}</p>
                  </div>
                )}
                {contract.crop.location?.fullAddress && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-semibold">{contract.crop.location.fullAddress}</p>
                    <p className="text-sm text-gray-600">
                      {[contract.crop.location.city, contract.crop.location.state, contract.crop.location.pincode].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
                {contract.crop.description && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Product Description</p>
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {typeof contract.crop.description === 'object' && contract.crop.description?.en != null ? String(contract.crop.description.en) : contract.crop.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Payment Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Advance Payment:</span>
                <span className="font-semibold">
                  ₹{advanceAmount?.toLocaleString('en-IN')}
                  {advancePaid && <span className="text-green-600 ml-2">✓ Paid</span>}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Final Payment:</span>
                <span className="font-semibold">
                  ₹{finalAmount?.toLocaleString('en-IN')}
                  {finalPaid && <span className="text-green-600 ml-2">✓ Paid</span>}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-semibold mb-3 text-gray-900">Payment History</h4>
              {Array.isArray(contract.payments) && contract.payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold">Date</th>
                        <th className="text-left py-3 px-4 font-semibold">Time</th>
                        <th className="text-left py-3 px-4 font-semibold">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold">Method</th>
                        <th className="text-left py-3 px-4 font-semibold">From</th>
                        <th className="text-left py-3 px-4 font-semibold">To</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contract.payments
                        .slice()
                        .sort((a, b) => {
                          const da = a?.date ? new Date(a.date).getTime() : 0
                          const db = b?.date ? new Date(b.date).getTime() : 0
                          return db - da
                        })
                        .map((p, idx) => {
                          const date = p?.date ? new Date(p.date) : null
                          const dateStr = date
                            ? date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                            : '-'

                          const timeStr = p?.time || '-'
                          const amountVal = p?.amount ?? 0

                          return (
                            <tr key={`${p?.date || 'd'}_${p?.time || 't'}_${idx}`} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">{dateStr}</td>
                              <td className="py-3 px-4">{timeStr}</td>
                              <td className="py-3 px-4 font-semibold text-green-600">
                                ₹{Number(amountVal).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4">{(p?.paymentMethod || '').toString().toUpperCase() || '-'}</td>
                              <td className="py-3 px-4">{p?.payerName || '-'}</td>
                              <td className="py-3 px-4">{p?.receiverName || '-'}</td>
                              <td className="py-3 px-4">{(p?.status || '').toString() || 'Paid'}</td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No payments yet.</p>
              )}
            </div>
          </div>

          {canSign && (
            <div className="mt-6 pt-6 border-t">
              <button
                onClick={handleSign}
                disabled={signing}
                className="btn-primary flex items-center space-x-2"
              >
                <FiCheck />
                <span>{signing ? 'Signing...' : 'Sign Contract'}</span>
              </button>
            </div>
          )}

          {user?.role === 'buyer' && contract.status === 'signed' && (
            <div className="mt-6 pt-6 border-t">
              <Link
                to={`/payments?contractId=${contract._id}`}
                className="btn-primary flex items-center space-x-2 w-full justify-center"
              >
                <FiDollarSign />
                <span>Make Payment</span>
              </Link>
            </div>
          )}
          
          {finalPaid && (
            <div className="mt-6 pt-6 border-t">
              {reviewed ? (
                <div className="px-3 py-2 rounded-lg bg-green-100 text-green-800 text-sm w-fit">
                  Review Submitted
                </div>
              ) : (
                <button
                  className="btn-primary"
                  onClick={() => {
                    setRevRating(0)
                    setRevComment('')
                    setRevOpen(true)
                  }}
                >
                  Give Review
                </button>
              )}
            </div>
          )}
          
          {revOpen && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Give Review</h3>
                <div className="flex gap-2 mb-4">
                  {[1,2,3,4,5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      className={`text-2xl ${i <= revRating ? 'text-yellow-500' : 'text-gray-300'}`}
                      onClick={() => setRevRating(i)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={revComment}
                  onChange={(e) => setRevComment(e.target.value)}
                  placeholder="Write your review"
                  className="input-field w-full h-28"
                />
                <div className="mt-4 flex gap-3">
                  <button
                    className="btn-primary disabled:opacity-50"
                    disabled={revSubmitting || revRating < 1 || revComment.trim().length < 1}
                    onClick={async () => {
                      setRevSubmitting(true)
                      try {
                        await api.post('/reviews', {
                          contractId: id,
                          rating: revRating,
                          comment: revComment.trim()
                        })
                        toast.success('Review submitted')
                        try { await fetchUser() } catch {}
                        setReviewed(true)
                        setRevOpen(false)
                      } catch (e) {
                        toast.error(e.response?.data?.message || e.message || 'Failed to submit review')
                      } finally {
                        setRevSubmitting(false)
                      }
                    }}
                  >
                    {revSubmitting ? 'Submitting…' : 'Submit Review'}
                  </button>
                  <button className="btn-secondary" onClick={() => setRevOpen(false)} disabled={revSubmitting}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ContractDetails
