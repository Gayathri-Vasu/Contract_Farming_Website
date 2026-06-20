import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { FiDollarSign, FiUser, FiCalendar, FiClock } from 'react-icons/fi'
import NavBar from '../components/NavBar'
import { useAuth } from '../context/AuthContext'

/**
 * Payments Page - Shows payments from accepted contracts only
 * For buyers: Shows payments made (paid to farmer)
 * For farmers: Shows payments received (received from buyer)
 */
const Payments = () => {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/payments')
      const list = res.data?.data || []
      // Format for display
      const mapped = list.map(p => ({
        id: p._id,
        contractNumber: p.contract?.contractId || p.contract?.contractId || '-',
        amount: p.amount,
        method: (p.paymentMethod || '').toUpperCase(),
        txn: p.transactionId,
        status: (p.status || '').toString(),
        date: p.paidAt || p.createdAt,
        buyerName: p.buyer?.name || '',
        farmerName: p.farmer?.name || ''
      }))
      mapped.sort((a, b) => new Date(b.date) - new Date(a.date))
      setPayments(mapped)
    } catch (error) {
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
          <p className="text-gray-600 mt-2">
            {user?.role === 'buyer' 
              ? 'Payments made for accepted contracts'
              : 'Payments received from accepted contracts'}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : payments.length > 0 ? (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Time</th>
                    <th className="text-left py-3 px-4 font-semibold">Contract Number</th>
                    <th className="text-left py-3 px-4 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Method</th>
                    <th className="text-left py-3 px-4 font-semibold">Transaction ID</th>
                    <th className="text-left py-3 px-4 font-semibold">Receiver</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const d = new Date(p.date)
                    const dateStr = d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    const receiver = 'Farmer'
                    return (
                      <tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{dateStr}</td>
                        <td className="py-3 px-4">{timeStr}</td>
                        <td className="py-3 px-4">{p.contractNumber || '-'}</td>
                        <td className="py-3 px-4 font-semibold text-green-600">₹{p.amount?.toLocaleString?.() || p.amount}</td>
                        <td className="py-3 px-4">{p.method}</td>
                        <td className="py-3 px-4 font-mono">{p.txn}</td>
                        <td className="py-3 px-4">{receiver}</td>
                        <td className="py-3 px-4">{p.status}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card text-center py-12">
            <FiDollarSign className="text-6xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No payments found</p>
            <p className="text-gray-500 text-sm mt-2">
              Payments will appear here once you make/receive payments for accepted contracts.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Payments
