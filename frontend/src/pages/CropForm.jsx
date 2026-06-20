import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import NavBar from '../components/NavBar'

const CropForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: 'cereals',
    quantity: '',
    unit: 'kg',
    quality: 'standard',
    goodnessGrade: 'A',
    expectedPrice: '',
    harvestDate: '',
    description: '',
    location: {
      city: '',
      state: '',
      pincode: '',
      fullAddress: ''
    }
  })

  useEffect(() => {
    if (isEdit) {
      fetchCrop()
    }
  }, [id])

  const fetchCrop = async () => {
    try {
      const res = await axios.get(`/api/crops/${id}`)
      const crop = res.data.data
      setFormData({
        name: crop.name || '',
        category: crop.category || 'cereals',
        quantity: crop.quantity || '',
        unit: crop.unit || 'kg',
        quality: crop.quality || 'standard',
        goodnessGrade: crop.goodnessGrade || 'A',
        expectedPrice: crop.expectedPrice || '',
        harvestDate: crop.harvestDate ? new Date(crop.harvestDate).toISOString().split('T')[0] : '',
        description: (typeof crop.description === 'object' && crop.description?.en != null ? String(crop.description.en) : (crop.description || '')),
        location: {
          city: crop.location?.city || '',
          state: crop.location?.state || '',
          pincode: crop.location?.pincode || '',
          fullAddress: crop.location?.fullAddress || ''
        }
      })
    } catch (error) {
      toast.error('Failed to load crop')
      navigate('/farmer/dashboard')
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('location.')) {
      const locationField = name.split('.')[1]
      setFormData({
        ...formData,
        location: { ...formData.location, [locationField]: value }
      })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const submitData = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        expectedPrice: parseFloat(formData.expectedPrice),
        harvestDate: new Date(formData.harvestDate).toISOString()
      }

      if (isEdit) {
        await axios.put(`/api/crops/${id}`, submitData)
        toast.success('Crop updated successfully!')
      } else {
        await axios.post('/api/crops', submitData)
        toast.success('Product uploaded successfully!')
      }
      navigate('/farmer-circle')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save crop')
    } finally {
      setLoading(false)
    }
  }

  const categories = ['cereals', 'pulses', 'vegetables', 'fruits', 'spices', 'oilseeds', 'others', 'millets', 'flower']
  const units = ['kg', 'quintal', 'ton', 'acre']
  const gradeOptions = ['A', 'B', 'C']
  const qualities = ['organic', 'premium', 'standard', 'grade-a', 'grade-b']

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            {isEdit ? 'Edit crop' : 'Upload my crop'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Crop Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="e.g., Wheat, Rice, Tomato"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Crop goodness level
                </label>
                <select
                  name="goodnessGrade"
                  value={formData.goodnessGrade}
                  onChange={handleChange}
                  className="input-field"
                >
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="input-field"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit *
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  required
                  className="input-field"
                >
                  {units.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality *
                </label>
                <select
                  name="quality"
                  value={formData.quality}
                  onChange={handleChange}
                  required
                  className="input-field"
                >
                  {qualities.map(quality => (
                    <option key={quality} value={quality}>
                      {quality.charAt(0).toUpperCase() + quality.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Price per Unit (₹) *
                </label>
                <input
                  type="number"
                  name="expectedPrice"
                  value={formData.expectedPrice}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="input-field"
                />
              </div>

              {formData.quantity && formData.expectedPrice && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Amount (₹)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={
                      new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 2
                      }).format(
                        (parseFloat(formData.quantity) || 0) *
                        (parseFloat(formData.expectedPrice) || 0)
                      )
                    }
                    className="input-field bg-gray-50"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Harvest Date *
                </label>
                <input
                  type="date"
                  name="harvestDate"
                  value={formData.harvestDate}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                className="input-field"
                placeholder="Additional details about the crop..."
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Location Details</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed address
                </label>
                <textarea
                  name="location.fullAddress"
                  value={formData.location.fullAddress}
                  onChange={handleChange}
                  rows="2"
                  className="input-field"
                  placeholder="House / village, taluk, district, landmark..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="location.city"
                    value={formData.location.city}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="location.state"
                    value={formData.location.state}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    name="location.pincode"
                    value={formData.location.pincode}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {loading ? 'Saving...' : isEdit ? 'Update Crop' : 'Upload Product'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/farmer/dashboard')}
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

export default CropForm






