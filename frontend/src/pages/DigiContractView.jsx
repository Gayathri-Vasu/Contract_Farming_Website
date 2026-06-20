import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import html2pdf from 'html2pdf.js'
import NavBar from '../components/NavBar'

export default function DigiContractView() {
  const { id } = useParams()
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios
      .get(`/api/digicontracts/${id}`)
      .then((res) => setDoc(res.data?.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const downloadPDF = () => {
    if (doc?._id) {
      window.open(`/api/digicontracts/${doc._id}/pdf`, '_blank')
      return
    }
    const element = document.getElementById('digi-contract')
    if (!element) return
    html2pdf()
      .from(element)
      .set({
        filename: `DigiContract-${doc?.digiContractId || id}.pdf`,
        margin: 10,
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        html2canvas: { scale: 2 }
      })
      .save()
  }

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

  if (!doc) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-gray-700">DigiContract not found.</p>
            <Link to="/digi-contracts" className="text-green-700 underline">
              Back to Digi Contracts
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const totalAmount =
    (doc?.product?.totalAmount ??
      (typeof doc?.totalAmount === 'number'
        ? doc.totalAmount
        : (Number(doc?.product?.quantity ?? doc?.quantity) || 0) *
          (Number(doc?.product?.pricePerUnit ?? doc?.pricePerUnit) || 0)))

  const status = (doc.status || '').toString().toLowerCase()
  const badge =
    status === 'active'
      ? 'bg-green-100 text-green-800'
      : status === 'completed'
      ? 'bg-blue-100 text-blue-800'
      : status.includes('partial')
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-gray-100 text-gray-800'

  return (
    <div className="bg-green-100 min-h-screen">
      <NavBar />
      <div className="max-w-4xl mx-auto p-6 sm:p-10">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/digi-contracts" className="text-green-700 underline">
            ← Back to list
          </Link>
          <button onClick={downloadPDF} className="bg-green-700 text-white px-6 py-2 rounded-lg">
            Download PDF
          </button>
        </div>
        <div
          id="digi-contract"
          className="relative bg-gradient-to-b from-white to-green-50 p-8 sm:p-12 shadow-2xl border-8 border-green-700 rounded-2xl ring-1 ring-green-200"
        >
          <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-semibold ${badge}`}>
            {doc.status}
          </span>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-wide text-green-800">
              ASSURED CONTRACT FARMING AGREEMENT
            </h1>
            <div className="mx-auto w-24 h-1 bg-green-700 my-3"></div>
            <p className="text-gray-600 italic">Secure Contracts • Stable Income • Assured Growth</p>
            <p className="mt-2 text-sm">DigiContract ID: {doc.digiContractId || doc._id}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-green-50 p-6 rounded-lg">
              <h2 className="font-semibold text-green-700 mb-3">Farmer Details</h2>
              <p>ID: {doc.farmer || doc.farmer?.farmerId || '—'}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h2 className="font-semibold text-green-700 mb-3">Buyer Details</h2>
              <p>ID: {doc.buyer || doc.buyer?.buyerId || '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 bg-green-50 p-6 rounded-lg mb-8">
              <h2 className="font-semibold text-green-700 mb-3">Agreement Terms</h2>
              <p>Crop: {doc.product?.cropName ?? doc.crop}</p>
              <p>
                Quantity: {(doc.product?.quantity ?? doc.quantity) || 0} {(doc.product?.unit || 'kg')}
              </p>
              <p>Price per Unit: ₹{doc.product?.pricePerUnit ?? doc.pricePerUnit}</p>
              <p className="font-bold text-green-800">Total Amount: ₹{totalAmount}</p>
              <p>
                Delivery Date{' '}
                {(doc.product?.deliveryDate || doc.deliveryDate)
                  ? new Date(doc.product?.deliveryDate || doc.deliveryDate).toDateString()
                  : '—'}
              </p>
            </div>
            <div className="bg-white border-2 border-green-700 rounded-lg p-6 mb-8 shadow">
              <h2 className="font-semibold text-green-700 mb-3">Payment Protection</h2>
              <div className="flex items-center justify-between">
                <p className="text-gray-700">Payment Status</p>
                <span
                  className={
                    'px-3 py-1 rounded-full text-sm font-semibold ' +
                    (doc.paymentStatus === 'Released'
                      ? 'bg-green-100 text-green-800'
                      : doc.paymentStatus === 'Paid'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800')
                  }
                >
                  {doc.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            <div>
              <p className="font-semibold">Farmer Signature</p>
              {doc.signatures?.farmerSigned && (
                <p className="italic text-xl text-green-800">Signed on {new Date(doc.signatures.farmerSignedDate).toDateString()}</p>
              )}
            </div>
            <div>
              <p className="font-semibold">Buyer Signature</p>
              {doc.signatures?.buyerSigned && (
                <p className="italic text-xl text-green-800">Signed on {new Date(doc.signatures.buyerSignedDate).toDateString()}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
