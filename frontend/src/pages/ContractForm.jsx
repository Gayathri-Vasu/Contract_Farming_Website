import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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

const ContractForm = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const cropIdParam = searchParams.get('cropId')
  const requirementIdParam = searchParams.get('requirementId')
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    cropId: cropIdParam || '',
    cropName: '',
    category: '',
    quantity: '',
    pricePerUnit: '',
    deliveryDate: '',
    terms: '',
    advancePayment: '',
    cropGrade: 'A',
    deliveryAddress: ''
  })

  useEffect(() => {
    if (user?.role !== 'buyer') {
      toast.error('Only buyers can create contracts')
      navigate(user?.role === 'farmer' ? '/farmer/dashboard' : '/')
      return
    }
    // If cropId is provided (coming from Farmer Circle), link to that crop
    if (cropIdParam) {
      fetchCropDetails(cropIdParam)
    } else if (requirementIdParam) {
      fetchRequirement(requirementIdParam)
    }
  }, [cropIdParam, requirementIdParam, user])

  const fetchCropDetails = async (cropId) => {
    try {
      const res = await axios.get(`/api/crops/${cropId}`)
      const crop = res.data.data
      setFormData(prev => ({
        ...prev,
        cropId: cropId,
        cropName: toTitleCase(crop.name),
        category: crop.category || '',
        pricePerUnit: crop.expectedPrice || ''
      }))
    } catch (error) {
      toast.error('Failed to load crop details')
    }
  }

  const fetchRequirement = async (id) => {
    try {
      const res = await axios.get(`/api/contracts/${id}`)
      const contract = res.data.data
      setFormData({
        cropId: contract.crop?._id || '',
        cropName: contract.cropName || '',
        category: contract.category || contract.crop?.category || '',
        quantity: contract.quantity?.toString() || '',
        pricePerUnit: contract.pricePerUnit?.toString() || '',
        deliveryDate: contract.deliveryDate
          ? new Date(contract.deliveryDate).toISOString().split('T')[0]
          : '',
        terms: (typeof contract.terms === 'object' && contract.terms?.en != null ? String(contract.terms.en) : (contract.terms || '')),
        advancePayment: contract.advancePayment?.amount?.toString() || '',
        cropGrade: contract.cropGrade || 'A',
        deliveryAddress: (typeof contract.deliveryAddress === 'object' && contract.deliveryAddress?.en != null ? String(contract.deliveryAddress.en) : (contract.deliveryAddress || ''))
      })
    } catch (error) {
      toast.error('Failed to load requirement details')
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const calculateTotal = () => {
    const quantity = parseFloat(formData.quantity) || 0
    const pricePerUnit = parseFloat(formData.pricePerUnit) || 0
    return quantity * pricePerUnit
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
  
    if (!formData.cropName.trim()) {
      toast.error('Please enter required crop name')
      return
    }
    if (!formData.category) {
      toast.error('Please select a category')
      return
    }

    const quantity = parseFloat(formData.quantity)
    if (!quantity || quantity <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    if (!formData.pricePerUnit || parseFloat(formData.pricePerUnit) <= 0) {
      toast.error('Please enter a valid price per unit')
      return
    }

    setLoading(true)

    try {
      const submitData = {
        cropName: toTitleCase(formData.cropName.trim()),
        category: formData.category,
        quantity: quantity,
        unit: 'kg',
        pricePerUnit: parseFloat(formData.pricePerUnit),
        deliveryDate: new Date(formData.deliveryDate).toISOString(),
        terms: formData.terms || undefined,
        advancePayment: formData.advancePayment ? parseFloat(formData.advancePayment) : undefined,
        cropGrade: formData.cropGrade || 'A',
        deliveryAddress: formData.deliveryAddress || undefined
      }

      if (requirementIdParam) {
        await axios.put(`/api/contracts/requirements/${requirementIdParam}`, submitData)
        toast.success('Requirement updated successfully!')
      } else {
        await axios.post('/api/contracts/requirements', submitData)
        toast.success('Requirement posted to Buyer Circle!')
      }
      navigate('/buyer-circle')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create contract')
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== 'buyer') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Add my requirement
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Crop name (free text) + goodness level */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required crop *
                </label>
                <input
                  type="text"
                  name="cropName"
                  value={formData.cropName}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Type the crop you need (e.g. Tomato)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Crop goodness level
                </label>
                <select
                  name="cropGrade"
                  value={formData.cropGrade}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                  <option value="C">Grade C</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="" disabled>Select category</option>
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
                <option value="grains">Grains</option>
                <option value="pulses">Pulses</option>
                <option value="spices">Spices</option>
                <option value="oilseeds">Oilseeds</option>
                <option value="others">Others</option>
                <option value="millets">Millets</option>
                <option value="flower">Flower</option>
              </select>
            </div>

            {/* Quantity and Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity (kg) *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  min="0.01"
                  step="0.01"
                  className="input-field"
                  placeholder="Enter quantity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Unit (₹) *
                </label>
                <input
                  type="number"
                  name="pricePerUnit"
                  value={formData.pricePerUnit}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="input-field"
                  placeholder="Enter price per unit"
                />
              </div>
            </div>

            {/* Total Amount Display */}
            {formData.quantity && formData.pricePerUnit && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ₹{calculateTotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* Delivery Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Date *
              </label>
              <input
                type="date"
                name="deliveryDate"
                value={formData.deliveryDate}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>

            {/* Detailed delivery address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detailed delivery address
              </label>
              <textarea
                name="deliveryAddress"
                value={formData.deliveryAddress}
                onChange={handleChange}
                rows="3"
                className="input-field"
                placeholder="Warehouse / mandi / factory address for delivery..."
              />
            </div>

            {/* Advance Payment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Advance Payment (₹) <span className="text-gray-500">(Optional)</span>
              </label>
              <input
                type="number"
                name="advancePayment"
                value={formData.advancePayment}
                onChange={handleChange}
                min="0"
                step="0.01"
                max={calculateTotal()}
                className="input-field"
                placeholder="Enter advance payment amount"
              />
              {formData.advancePayment && calculateTotal() > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Final Payment: ₹{(calculateTotal() - parseFloat(formData.advancePayment || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms and Conditions <span className="text-gray-500">(Optional)</span>
              </label>
              <textarea
                name="terms"
                value={formData.terms}
                onChange={handleChange}
                rows="4"
                className="input-field"
                placeholder="Enter any additional terms or conditions..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6 border-t">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {loading ? 'Uploading Requirement...' : 'Upload Requirement'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/buyer/dashboard')}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ContractForm
