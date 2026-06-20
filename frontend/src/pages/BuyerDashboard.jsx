import { useState, useEffect } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import { api } from '../api/client'

import { toast } from 'react-toastify'

import { FiShoppingCart, FiFileText, FiDollarSign, FiTrendingUp, FiPlus, FiSmile } from 'react-icons/fi'

import NavBar from '../components/NavBar'
import { useAuth } from '../context/AuthContext'
// DigiContracts table intentionally not rendered on dashboard

function asPlainText(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && value.en != null) return String(value.en)
  return String(value)
}

const BuyerDashboard = () => {

  const { user } = useAuth()

  const navigate = useNavigate()

  const [stats, setStats] = useState({

    availableContracts: 0,

    totalSpent: 0,

    pendingOffers: 0,

    totalCrops: 0

  })

  const [recentContracts, setRecentContracts] = useState([])

  const [loading, setLoading] = useState(true)

  const [editingRequirement, setEditingRequirement] = useState(null)

  const [editForm, setEditForm] = useState({

    cropName: '',

    quantity: '',

    pricePerUnit: '',

    deliveryDate: '',

    advancePayment: '',

    cropGrade: 'A',

    deliveryAddress: '',

    terms: ''

  })



  useEffect(() => {

    fetchDashboardData()

  }, [])



  const fetchDashboardData = async () => {

    try {

      const [contractsRes, requirementsRes] = await Promise.all([

        api.get('/contracts'),

        api.get('/contracts/requirements')

      ])



      const contracts = contractsRes.data.data || []

      const requirementsAll = requirementsRes.data.data || []



      // Recent requirements: only this buyer's requirements

      const myId = user?.id || user?._id

      const myRequirements = requirementsAll.filter((c) => {

        const buyerId = c.buyer?._id || c.buyer

        return buyerId && myId && buyerId.toString() === myId.toString()

      })



      setStats({

        availableContracts: contracts.length,

        totalSpent: 0,

        pendingOffers: contracts.filter(c => (c.status || '').toLowerCase() === 'pending').length,

        totalCrops: myRequirements.length

      })

      

      setRecentContracts(myRequirements.slice(0, 5))

      // Reset editor if its item was removed

      if (editingRequirement) {

        const stillExists = myRequirements.find(r => r._id === editingRequirement._id)

        if (!stillExists) {

          setEditingRequirement(null)

        }

      }

    } catch (error) {

      toast.error('Failed to load dashboard data')

    } finally {

      setLoading(false)

    }

  }



  const handleRemoveRequirement = async (contractId) => {

    if (!window.confirm('Are you sure you want to remove this requirement?')) return



    try {

      await api.delete(`/contracts/requirements/${contractId}`)

      toast.success('Requirement removed')

      fetchDashboardData()

    } catch (error) {

      toast.error(error.response?.data?.message || 'Failed to remove requirement')

    }

  }



  const handleEditRequirement = (contract) => {

    setEditingRequirement(contract)

    setEditForm({

      cropName: contract.cropName || '',

      quantity: contract.quantity?.toString() || '',

      pricePerUnit: contract.pricePerUnit?.toString() || '',

      deliveryDate: contract.deliveryDate

        ? new Date(contract.deliveryDate).toISOString().split('T')[0]

        : '',

      advancePayment: contract.advancePayment?.amount?.toString() || '',

      cropGrade: contract.cropGrade || 'A',

      deliveryAddress: asPlainText(contract.deliveryAddress) || '',

      terms: asPlainText(contract.terms) || ''

    })

  }



  const handleEditChange = (e) => {

    const { name, value } = e.target

    setEditForm(prev => ({ ...prev, [name]: value }))

  }



  const handleUpdateRequirement = async (e) => {

    e.preventDefault()

    if (!editingRequirement) return



    const quantity = parseFloat(editForm.quantity)

    const pricePerUnit = parseFloat(editForm.pricePerUnit)



    if (!editForm.cropName.trim()) {

      toast.error('Crop name is required')

      return

    }

    if (!quantity || quantity <= 0) {

      toast.error('Enter valid quantity')

      return

    }

    if (!pricePerUnit || pricePerUnit <= 0) {

      toast.error('Enter valid price per unit')

      return

    }



    try {

      await api.put(`/contracts/requirements/${editingRequirement._id}`, {

        cropName: editForm.cropName.trim(),

        quantity,

        unit: 'kg',

        pricePerUnit,

        deliveryDate: new Date(editForm.deliveryDate).toISOString(),

        terms: editForm.terms || undefined,

        advancePayment: editForm.advancePayment ? parseFloat(editForm.advancePayment) : undefined,

        cropGrade: editForm.cropGrade || 'A',

        deliveryAddress: editForm.deliveryAddress || undefined

      })

      toast.success('Requirement updated')

      setEditingRequirement(null)

      fetchDashboardData()

    } catch (error) {

      toast.error(error.response?.data?.message || 'Failed to update requirement')

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



  return (

    <div className="h-screen bg-green-50 flex flex-col">

      <NavBar />

      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 overflow-auto">

        <div className="mb-8">
        
          <h1 className="text-3xl font-bold text-green-900">Buyer Dashboard</h1>
        
          <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#efe7f3] border border-[#e0d0e7] shadow-sm">
            <FiSmile className="text-[#3b2450] text-xl" />
            <span className="text-[#3b2450] font-semibold">Hi! Welcome back, {user?.name}!</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-800">
            <span className="text-xl">★</span>
            <span className="font-bold text-lg">
              {Number(user?.rating?.average || 0).toFixed(1)} / 5.0
            </span>
            <span className="text-sm text-gray-700 ml-1">({user?.rating?.count || 0})</span>
          </div>
        
        </div>



        {/* Stats Grid */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          <div className="card p-6 min-h-[140px] bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg border-indigo-400 transition-transform duration-300 ease-in-out hover:scale-105 hover:-translate-y-1 hover:shadow-2xl active:scale-95">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-indigo-100 text-sm">Total Crops</p>

                <p className="text-3xl font-bold text-white">{stats.totalCrops}</p>

              </div>

              <FiShoppingCart className="text-4xl text-indigo-200" />

            </div>

          </div>



          <div className="card p-6 min-h-[140px] bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg border-emerald-400 transition-transform duration-300 ease-in-out hover:scale-105 hover:-translate-y-1 hover:shadow-2xl active:scale-95">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-emerald-100 text-sm">Available Contracts</p>

                <p className="text-3xl font-bold text-white">{stats.availableContracts}</p>

              </div>

              <FiFileText className="text-4xl text-emerald-200" />

            </div>

          </div>



          <div className="card p-6 min-h-[140px] bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg border-amber-400 transition-transform duration-300 ease-in-out hover:scale-105 hover:-translate-y-1 hover:shadow-2xl active:scale-95">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-amber-100 text-sm">Total Spent</p>

                <p className="text-3xl font-bold text-white">₹{stats.totalSpent.toLocaleString()}</p>

              </div>

              <FiDollarSign className="text-4xl text-amber-200" />

            </div>

          </div>



          <div className="card p-6 min-h-[140px] bg-gradient-to-br from-rose-500 to-rose-600 shadow-lg border-rose-400 transition-transform duration-300 ease-in-out hover:scale-105 hover:-translate-y-1 hover:shadow-2xl active:scale-95">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-rose-100 text-sm">Pending Offers</p>

                <p className="text-3xl font-bold text-white">{stats.pendingOffers}</p>

              </div>

              <FiTrendingUp className="text-4xl text-rose-200" />

            </div>

          </div>

        </div>



        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-green-900">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              to="/contracts/new"
              className="group block rounded-2xl p-8 min-h-[180px] bg-gradient-to-br from-[#c7a2cd] to-[#b48fc0] hover:from-[#b48fc0] hover:to-[#a37bb5] text-[#3b2450] shadow-md hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1 active:scale-95 transition-transform duration-300 ease-in-out cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <FiPlus className="text-4xl text-[#3b2450]" />
                <div>
                  <div className="text-lg font-bold">Upload Requirements</div>
                  <div className="text-sm opacity-90">Create a new contract need</div>
                </div>
              </div>
            </Link>
            <Link
              to="/contracts/farmers"
              className="group block rounded-2xl p-8 min-h-[180px] bg-gradient-to-br from-[#c7a2cd] to-[#b48fc0] hover:from-[#b48fc0] hover:to-[#a37bb5] text-[#3b2450] shadow-md hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1 active:scale-95 transition-transform duration-300 ease-in-out cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <FiFileText className="text-4xl text-[#3b2450]" />
                <div>
                  <div className="text-lg font-bold">Farmers Requests</div>
                  <div className="text-sm opacity-90">Respond to farmers' offers</div>
                </div>
              </div>
            </Link>
            <Link
              to="/contracts"
              className="group block rounded-2xl p-8 min-h-[180px] bg-gradient-to-br from-[#c7a2cd] to-[#b48fc0] hover:from-[#b48fc0] hover:to-[#a37bb5] text-[#3b2450] shadow-md hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1 active:scale-95 transition-transform duration-300 ease-in-out cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <FiFileText className="text-4xl text-[#3b2450]" />
                <div>
                  <div className="text-lg font-bold">My Contracts</div>
                  <div className="text-sm opacity-90">View and manage contracts</div>
                </div>
              </div>
            </Link>
            <Link
              to="/payments"
              className="group block rounded-2xl p-8 min-h-[180px] bg-gradient-to-br from-[#c7a2cd] to-[#b48fc0] hover:from-[#b48fc0] hover:to-[#a37bb5] text-[#3b2450] shadow-md hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1 active:scale-95 transition-transform duration-300 ease-in-out cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <FiDollarSign className="text-4xl text-[#3b2450]" />
                <div>
                  <div className="text-lg font-bold">Payments</div>
                  <div className="text-sm opacity-90">Make and track payments</div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Digi Contracts accessible via Quick Actions link only */}

        {/* Farmer requests are available under Quick Actions → Farmers request */}



        {/* Recent Requirements / Contracts */}

        <div className="card bg-white shadow-md border border-gray-200">

          <div className="flex justify-between items-center mb-4">

            <h2 className="text-xl font-bold">Recent requirements</h2>

            <Link to="/contracts" className="text-primary-600 hover:underline">

              View All

            </Link>

          </div>

          

          {editingRequirement && (

            <form onSubmit={handleUpdateRequirement} className="mb-6 p-4 border rounded-lg bg-gray-50 space-y-4">

              <h3 className="font-semibold text-gray-900 mb-2">

                Edit requirement – {editingRequirement.cropName}

              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">

                    Crop name

                  </label>

                  <input

                    type="text"

                    name="cropName"

                    value={editForm.cropName}

                    onChange={handleEditChange}

                    className="input-field"

                    required

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">

                    Quantity (kg)

                  </label>

                  <input

                    type="number"

                    name="quantity"

                    value={editForm.quantity}

                    onChange={handleEditChange}

                    className="input-field"

                    min="0.01"

                    step="0.01"

                    required

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">

                    Price / kg (₹)

                  </label>

                  <input

                    type="number"

                    name="pricePerUnit"

                    value={editForm.pricePerUnit}

                    onChange={handleEditChange}

                    className="input-field"

                    min="0.01"

                    step="0.01"

                    required

                  />

                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">

                    Delivery date

                  </label>

                  <input

                    type="date"

                    name="deliveryDate"

                    value={editForm.deliveryDate}

                    onChange={handleEditChange}

                    className="input-field"

                    required

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">

                    Advance payment (₹)

                  </label>

                  <input

                    type="number"

                    name="advancePayment"

                    value={editForm.advancePayment}

                    onChange={handleEditChange}

                    className="input-field"

                    min="0"

                    step="0.01"

                  />

                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">

                    Delivery address

                  </label>

                  <textarea

                    name="deliveryAddress"

                    value={editForm.deliveryAddress}

                    onChange={handleEditChange}

                    className="input-field"

                    rows="2"

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">

                    Terms (optional)

                  </label>

                  <textarea

                    name="terms"

                    value={editForm.terms}

                    onChange={handleEditChange}

                    className="input-field"

                    rows="2"

                  />

                </div>

              </div>

              <div className="flex gap-3 pt-2">

                <button type="submit" className="btn-primary">

                  Save changes

                </button>

                <button

                  type="button"

                  onClick={() => setEditingRequirement(null)}

                  className="btn-secondary"

                >

                  Cancel

                </button>

              </div>

            </form>

          )}

          {recentContracts.length > 0 ? (

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b">

                    <th className="text-left py-3 px-4">Crop Name</th>

                    <th className="text-left py-3 px-4">Quantity</th>

                    <th className="text-left py-3 px-4">Expected Price</th>

                    <th className="text-left py-3 px-4">Status</th>

                    <th className="text-left py-3 px-4">Actions</th>

                  </tr>

                </thead>

                <tbody>

                  {recentContracts.map((contract) => {

                    const status = (contract.status || '').toLowerCase()

                    return (

                      <tr key={contract._id} className="border-b hover:bg-gray-50">

                        <td className="py-3 px-4">{contract.cropName || contract.crop?.name}</td>

                        <td className="py-3 px-4">

                          {contract.quantity ? `${contract.quantity} ${contract.unit || 'kg'}` : '-'}

                        </td>

                        <td className="py-3 px-4">

                          {contract.pricePerUnit != null && contract.pricePerUnit !== ''

                            ? `₹${Number(contract.pricePerUnit).toLocaleString()} / ${contract.unit || 'kg'}`

                            : '-'}

                        </td>

                        <td className="py-3 px-4">

                          <span

                            className={`px-2 py-1 rounded text-sm ${

                              status === 'active'

                                ? 'bg-green-100 text-green-800'

                                : status === 'pending'

                                ? 'bg-yellow-100 text-yellow-800'

                                : 'bg-gray-100 text-gray-800'

                            }`}

                          >

                            {contract.status}

                          </span>

                        </td>

                        <td className="py-3 px-4 space-x-3">

                          <button

                            type="button"

                            onClick={() => handleEditRequirement(contract)}

                            className="text-primary-600 hover:underline"

                          >

                            Edit

                          </button>

                          <button

                            type="button"

                            onClick={() => handleRemoveRequirement(contract._id)}

                            className="text-red-600 hover:underline"

                          >

                            Remove

                          </button>

                        </td>

                      </tr>

                    )

                  })}

                </tbody>

              </table>

            </div>

          ) : (

            <div className="text-center py-8 text-gray-500">

              <p>No crops added yet. Upload your requirement to get started.</p>

              <Link to="/contracts/new" className="btn-primary mt-4 inline-block">

                Upload Requirement

              </Link>

            </div>

          )}

        </div>

      </div>

    </div>

  )

}



export default BuyerDashboard
