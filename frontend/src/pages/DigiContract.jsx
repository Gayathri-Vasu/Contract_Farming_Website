import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import html2pdf from 'html2pdf.js'
import NavBar from '../components/NavBar'
import { useAuth } from '../context/AuthContext'
import logo1 from '../../logo/logo1.png'
import logo2 from '../../logo/logo2.svg'

export default function DigiContract() {
  const { id } = useParams()
  const { user } = useAuth()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [payMethod, setPayMethod] = useState('upi')
  const [payProcessing, setPayProcessing] = useState(false)
  const [payResult, setPayResult] = useState(null)

  useEffect(() => {
    axios
      .get(`/api/contracts/${id}`)
      .then((res) => setContract(res.data?.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const totalAmount =
    contract?.totalAmount ??
    (contract?.quantity && contract?.pricePerUnit
      ? contract.quantity * contract.pricePerUnit
      : 0)

  const downloadPDF = () => {
    const element = document.getElementById('contract')
    if (!element || !contract) return
    const rect = element.getBoundingClientRect()
    const width = Math.ceil(rect.width || element.scrollWidth || element.offsetWidth)
    const height = Math.ceil(rect.height || element.scrollHeight || element.offsetHeight)
    const dpr = Math.max(2, Math.floor(window.devicePixelRatio || 2))
    html2pdf()
      .from(element)
      .set({
        filename: `Contract-${contract.contractId || id}.pdf`,
        margin: 0,
        jsPDF: { unit: 'px', format: [width, height] },
        html2canvas: {
          scale: dpr,
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          backgroundColor: null,
          letterRendering: true
        },
        pagebreak: { mode: ['avoid-all'] }
      })
      .save()
  }

  const handleSign = async () => {
    const role =
      user?.role === 'farmer' ? 'farmer' : user?.role === 'buyer' ? 'buyer' : null
    if (!role) return
    if (!window.confirm('Are you sure you want to sign this contract?')) return
    setSigning(true)
    try {
      await axios.post(`/api/contracts/sign/${id}`, { role })
      const res = await axios.get(`/api/contracts/${id}`)
      setContract(res.data?.data || res.data)
    } finally {
      setSigning(false)
    }
  }

  const alreadySigned =
    (user?.role === 'farmer' && !!contract?.farmerSignature?.signed) ||
    (user?.role === 'buyer' && !!contract?.buyerSignature?.signed)

  if (loading) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-gray-700">Contract not found.</p>
            <Link to="/contracts" className="text-green-700 underline">
              Back to Contracts
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const paymentStatus =
    contract.paymentStatus ||
    (contract.finalPayment?.paid
      ? 'Released'
      : contract.advancePayment?.paid
      ? 'Paid'
      : 'Pending')

  const advancePct =
    contract.agreement?.advancePaymentPercentage ??
    (totalAmount > 0 && contract.advancePayment?.amount
      ? Math.round((contract.advancePayment.amount / totalAmount) * 100)
      : 0)

  return (
    <div className="bg-green-100 min-h-screen">
      <NavBar />
      <div className="max-w-6xl mx-auto p-6 sm:p-10">
        <div className="mb-4">
          <Link to={`/contracts/${id}`} className="text-green-700 underline">
            ← Back to details
          </Link>
        </div>
        <div
          id="contract"
          className="relative bg-gradient-to-b from-white to-green-50 p-8 sm:p-12 shadow-2xl border-8 border-green-700 rounded-2xl ring-1 ring-green-200"
        >
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4">
              <img src={logo2} alt="Left Logo" className="w-28 h-28" />
              <div className="text-center flex-1">
                <h1 className="text-3xl font-extrabold tracking-wide text-green-800 leading-tight">
                  <span className="block">ASSURED CONTRACT FARMING</span>
                  <span className="block">AGREEMENT</span>
                </h1>
                <div className="mx-auto w-24 h-1 bg-green-700 my-2"></div>
                <p className="text-gray-600 italic">Secure Contracts • Stable Income • Assured Growth</p>
                <p className="mt-2 text-sm">
                  Contract ID: {contract.contractId || contract._id}
                </p>
              </div>
              <img src={logo1} alt="Right Logo" className="w-32 h-32" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-green-50 p-6 rounded-lg">
              <h2 className="font-semibold text-green-700 mb-3">Farmer Details</h2>
              <p>Name: {contract.farmer?.name || '—'}</p>
              <p>User ID: {contract.farmer?.userId || contract.farmer?._id || '—'}</p>
              <p>Email: {contract.farmer?.email || '—'}</p>
              {contract.farmer?.phone && <p>Phone: {contract.farmer.phone}</p>}
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h2 className="font-semibold text-green-700 mb-3">Buyer Details</h2>
              <p>Name: {contract.buyer?.name || '—'}</p>
              {contract.buyer?.businessName && <p>Company: {contract.buyer.businessName}</p>}
              <p>User ID: {contract.buyer?.userId || contract.buyer?._id || '—'}</p>
              <p>Email: {contract.buyer?.email || '—'}</p>
              {contract.buyer?.phone && <p>Phone: {contract.buyer.phone}</p>}
            </div>
          </div>

          <div className="bg-green-50 p-6 rounded-lg mb-8">
            <h2 className="text-center font-semibold text-green-700 mb-4">Agreement Terms</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p>Crop: {contract.cropName || contract.crop?.name}</p>
                <p>
                  Quantity: {contract.quantity} {contract.unit}
                </p>
                <p>Price per Unit: ₹{contract.pricePerUnit}</p>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-green-800">Total Amount: ₹{totalAmount}</p>
                <p>
                  Delivery Date:{' '}
                  {contract.deliveryDate ? new Date(contract.deliveryDate).toDateString() : '—'}
                </p>
                <p>Advance Payment: {advancePct}%</p>
                {contract.deliveryAddress && (
                  <p>Delivery Address: {typeof contract.deliveryAddress === 'object' && contract.deliveryAddress?.en != null ? String(contract.deliveryAddress.en) : contract.deliveryAddress}</p>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white border-2 border-green-700 rounded-lg p-6 mb-4 shadow">
            {(() => {
              const f = !!contract.farmerSignature?.signed
              const b = !!contract.buyerSignature?.signed
              const paid = (Array.isArray(contract.payments) ? contract.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) : 0) >= (Number(totalAmount) || 0)
              let text = 'Both parties yet to sign'
              if (f && b) {
                text = paid ? 'Signed successfully and payment completed' : 'Both parties signed'
              } else if (f && !b) {
                text = 'Buyer yet to sign'
              } else if (!f && b) {
                text = 'Farmer yet to sign'
              }
              return (
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-green-700">Contract Status</h2>
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                    {text}
                  </span>
                </div>
              )
            })()}
          </div>
          <div className="bg-white border-2 border-green-700 rounded-lg p-6 mb-8 shadow">
            <h2 className="font-semibold text-green-700 mb-3">Payment Protection</h2>
            <div className="flex items-center justify-between">
              <p className="text-gray-700">Payment Status</p>
              {(() => {
                const isPaidNow =
                  ((contract.paymentStatus || '').toLowerCase() === 'paid') ||
                  ((contract.status || '').toLowerCase() === 'paid')
                const label = isPaidNow ? 'Completed' : paymentStatus
                const cls =
                  'px-3 py-1 rounded-full text-sm font-semibold ' +
                  (isPaidNow
                    ? 'bg-green-100 text-green-800'
                    : paymentStatus === 'Released'
                    ? 'bg-green-100 text-green-800'
                    : paymentStatus === 'Paid'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800')
                return <span className={cls}>{label}</span>
              })()}
            </div>
            <div className="mt-2 text-sm text-gray-700">
              {(() => {
                return `Payer: Buyer`
              })()}
            </div>
            {(() => {
              const payerRole = 'buyer'
              const totalPaid = Array.isArray(contract.payments) ? contract.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) : 0
              const remaining = Math.max((Number(totalAmount) || 0) - totalPaid, 0)
              const isPaid = ((contract.paymentStatus || '').toLowerCase() === 'paid') || ((contract.status || '').toLowerCase() === 'paid')
              const canPay = !isPaid && remaining > 0 && user?.role === payerRole
              if (!canPay) return null
              return (
                <div className="mt-4 flex items-center gap-3">
                  <button onClick={() => setPayOpen(true)} className="btn-primary">
                    Pay
                  </button>
                </div>
              )
            })()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
            <div>
              <p className="font-semibold">Farmer Signature</p>
              {contract.farmerSignature?.signed && (
                <>
                  <p className="italic text-xl text-green-800">
                    {contract.farmer?.name || 'Farmer'}
                  </p>
                  {contract.farmerSignature?.signedAt && (
                    <p className="text-sm text-gray-600">
                      {new Date(contract.farmerSignature.signedAt).toLocaleString('en-IN')}
                    </p>
                  )}
                </>
              )}
            </div>

            <div>
              <p className="font-semibold">Buyer Signature</p>
              {contract.buyerSignature?.signed && (
                <>
                  <p className="italic text-xl text-green-800">
                    {contract.buyer?.name || 'Buyer'}
                  </p>
                  {contract.buyerSignature?.signedAt && (
                    <p className="text-sm text-gray-600">
                      {new Date(contract.buyerSignature.signedAt).toLocaleString('en-IN')}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="text-center mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={downloadPDF}
            className="bg-green-700 text-white px-6 py-2 rounded-lg"
          >
            Download PDF
          </button>
          {(user?.role === 'farmer' || user?.role === 'buyer') && (
            <button
              onClick={handleSign}
              disabled={signing || alreadySigned}
              className="bg-green-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {signing ? 'Signing...' : alreadySigned ? 'Already Signed' : 'Sign Contract'}
            </button>
          )}
        </div>
        {payOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Simulated Payment</h3>
              <div className="space-y-2 text-sm text-gray-700 mb-4">
                <p>Contract ID: {contract.contractId}</p>
                <p>Amount: ₹{totalAmount?.toLocaleString?.() || totalAmount}</p>
              </div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Payment Method</label>
              <div className="flex gap-3 mb-4">
                <button
                  className={`px-3 py-2 rounded-lg border ${payMethod === 'upi' ? 'bg-green-600 text-white' : 'bg-white text-gray-700'}`}
                  onClick={() => setPayMethod('upi')}
                  disabled={payProcessing}
                >
                  UPI
                </button>
                <button
                  className={`px-3 py-2 rounded-lg border ${payMethod === 'gpay' ? 'bg-green-600 text-white' : 'bg-white text-gray-700'}`}
                  onClick={() => setPayMethod('gpay')}
                  disabled={payProcessing}
                >
                  GPay
                </button>
                <button
                  className={`px-3 py-2 rounded-lg border ${payMethod === 'card' ? 'bg-green-600 text-white' : 'bg-white text-gray-700'}`}
                  onClick={() => setPayMethod('card')}
                  disabled={payProcessing}
                >
                  Card
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    setPayProcessing(true)
                    setPayResult(null)
                    await new Promise((r) => setTimeout(r, 2000))
                    try {
                      const res = await axios.post('/api/payments/simulate', {
                        contractId: contract._id || id,
                        paymentMethod: payMethod
                      })
                      setPayResult(res.data?.data)
                      // Refresh contract view to hide Pay
                      const r2 = await axios.get(`/api/contracts/${id}`)
                      setContract(r2.data?.data || r2.data)
                      setTimeout(() => {
                        setPayOpen(false)
                        window.location.href = '/payments'
                      }, 1500)
                    } catch (e) {
                      setPayProcessing(false)
                      alert(e.response?.data?.message || 'Payment failed')
                    }
                  }}
                  disabled={payProcessing}
                  className="btn-primary disabled:opacity-50"
                >
                  {payProcessing ? 'Processing…' : 'Pay Now'}
                </button>
                <button onClick={() => setPayOpen(false)} disabled={payProcessing} className="btn-secondary">
                  Cancel
                </button>
              </div>
              {payProcessing && (
                <div className="mt-4 text-sm text-gray-600 flex items-center gap-2">
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-700"></span>
                  Processing Payment...
                </div>
              )}
              {payResult && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                  <div className="font-semibold">Payment Successful</div>
                  <div>Transaction ID: {payResult.transactionId}</div>
                  <div>Paid At: {new Date(payResult.paidAt).toLocaleString('en-IN')}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
