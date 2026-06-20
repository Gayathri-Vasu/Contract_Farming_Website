import { useState, useEffect } from 'react'

import axios from 'axios'

import { toast } from 'react-toastify'

import { FiEdit2, FiCheck } from 'react-icons/fi'

import NavBar from '../components/NavBar'

import { useAuth } from '../context/AuthContext'



const Profile = () => {

  const { user, fetchUser } = useAuth()

  const [profile, setProfile] = useState(null)

  const [editing, setEditing] = useState(false)

  const [formData, setFormData] = useState({})

  const [loading, setLoading] = useState(true)

  const [avatarPreview, setAvatarPreview] = useState('')

  const [uploadingAvatar, setUploadingAvatar] = useState(false)



  useEffect(() => {

    fetchProfile()

  }, [])



  const fetchProfile = async () => {

    try {

      const res = await axios.get('/api/users/profile')

      setProfile(res.data.data)

      setFormData(res.data.data)

      setAvatarPreview(res.data.data.avatarUrl || '')

    } catch (error) {

      toast.error('Failed to load profile')

    } finally {

      setLoading(false)

    }

  }



  const handleAvatarChange = async (e) => {

    const file = e.target.files?.[0]

    if (!file) return



    setUploadingAvatar(true)

    try {

      const data = new FormData()

      data.append('avatar', file)



      const res = await axios.post('/api/users/avatar', data, {

        headers: { 'Content-Type': 'multipart/form-data' }

      })



      const newUrl = res.data?.avatarUrl || res.data?.user?.avatarUrl

      if (newUrl) {

        setAvatarPreview(newUrl)

        setProfile((prev) => ({ ...prev, avatarUrl: newUrl }))

        setFormData((prev) => ({ ...prev, avatarUrl: newUrl }))

        await fetchUser()

      }



      toast.success('Profile photo updated!')

    } catch (error) {

      console.error('Avatar upload error:', error)

      toast.error(error.response?.data?.message || 'Failed to update photo')

    } finally {

      setUploadingAvatar(false)

    }

  }



  const handleChange = (e) => {

    const { name, value } = e.target

    if (name.startsWith('address.')) {

      const addressField = name.split('.')[1]

      setFormData({

        ...formData,

        address: { ...formData.address, [addressField]: value }

      })

    } else {

      setFormData({ ...formData, [name]: value })

    }

  }



  const handleSubmit = async (e) => {

    e.preventDefault()

    try {

      await axios.put('/api/users/profile', formData)

      toast.success('Profile updated successfully!')

      setEditing(false)

      fetchProfile()

      fetchUser()

    } catch (error) {

      toast.error(error.response?.data?.message || 'Failed to update profile')

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

    <div className="min-h-screen bg-gray-50">

      <NavBar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="card">

          <div className="flex justify-between items-center mb-6">

            <div className="flex items-center gap-4">

              <div className="h-20 w-20 rounded-full bg-primary-600 text-white flex items-center justify-center text-2xl font-semibold overflow-hidden">

                {avatarPreview ? (

                  // eslint-disable-next-line jsx-a11y/alt-text

                  <img

                    src={avatarPreview}

                    className="h-20 w-20 rounded-full object-cover"

                  />

                ) : (

                  (profile?.name?.charAt(0) || '?').toUpperCase()

                )}

              </div>

              <div>

                <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>

                <p className="text-sm text-gray-500 capitalize">{profile?.role}</p>
                <p className="text-xs text-gray-500 mt-1">User ID: <span className="font-mono">{profile?.userId}</span></p>
                <div className="mt-2">
                  <label className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                      disabled={uploadingAvatar}
                    />
                    {uploadingAvatar ? 'Uploading…' : 'Change photo'}
                  </label>
                </div>

              </div>

            </div>

            <button

              onClick={() => editing ? setEditing(false) : setEditing(true)}

              className="btn-secondary flex items-center space-x-2"

            >

              {editing ? <FiCheck /> : <FiEdit2 />}

              <span>{editing ? 'Cancel' : 'Edit'}</span>

            </button>

          </div>



          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">

                  Full Name

                </label>

                <input

                  type="text"

                  name="name"

                  value={formData.name || ''}

                  onChange={handleChange}

                  disabled={!editing}

                  className="input-field disabled:bg-gray-100"

                />

              </div>



              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">

                  Email

                </label>

                <input

                  type="email"

                  value={formData.email || ''}

                  disabled

                  className="input-field disabled:bg-gray-100"

                />

              </div>



              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">

                  User ID

                </label>

                <input

                  type="text"

                  value={formData.userId || '—'}

                  disabled

                  className="input-field disabled:bg-gray-100 font-mono"

                />

              </div>



              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">

                  Phone

                </label>

                <input

                  type="tel"

                  name="phone"

                  value={formData.phone || ''}

                  onChange={handleChange}

                  disabled={!editing}

                  className="input-field disabled:bg-gray-100"

                />

              </div>



              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">

                  Role

                </label>

                <input

                  type="text"

                  value={formData.role || ''}

                  disabled

                  className="input-field disabled:bg-gray-100 capitalize"

                />

              </div>



              {formData.role === 'farmer' && (

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">

                    Farm Size (acres)

                  </label>

                  <input

                    type="number"

                    name="farmSize"

                    value={formData.farmSize || ''}

                    onChange={handleChange}

                    disabled={!editing}

                    step="0.01"

                    className="input-field disabled:bg-gray-100"

                  />

                </div>

              )}



              {formData.role === 'buyer' && (

                <>

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-2">

                      Business Name

                    </label>

                    <input

                      type="text"

                      name="businessName"

                      value={formData.businessName || ''}

                      onChange={handleChange}

                      disabled={!editing}

                      className="input-field disabled:bg-gray-100"

                    />

                  </div>

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-2">

                      Business Type

                    </label>

                    <input

                      type="text"

                      value={formData.businessType || ''}

                      disabled

                      className="input-field disabled:bg-gray-100 capitalize"

                    />

                  </div>

                </>

              )}

            </div>



            <div className="border-t pt-6">

              <h3 className="font-semibold mb-4">Address</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="md:col-span-2">

                  <label className="block text-sm font-medium text-gray-700 mb-2">

                    Street Address

                  </label>

                  <input

                    type="text"

                    name="address.street"

                    value={formData.address?.street || ''}

                    onChange={handleChange}

                    disabled={!editing}

                    className="input-field disabled:bg-gray-100"

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">

                    City

                  </label>

                  <input

                    type="text"

                    name="address.city"

                    value={formData.address?.city || ''}

                    onChange={handleChange}

                    disabled={!editing}

                    className="input-field disabled:bg-gray-100"

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">

                    State

                  </label>

                  <input

                    type="text"

                    name="address.state"

                    value={formData.address?.state || ''}

                    onChange={handleChange}

                    disabled={!editing}

                    className="input-field disabled:bg-gray-100"

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">

                    Pincode

                  </label>

                  <input

                    type="text"

                    name="address.pincode"

                    value={formData.address?.pincode || ''}

                    onChange={handleChange}

                    disabled={!editing}

                    className="input-field disabled:bg-gray-100"

                  />

                </div>

              </div>

            </div>



            <div className="border-t pt-6">

              <div className="flex items-center space-x-2">

                <span className="font-semibold">Verification Status:</span>

                {formData.isVerified ? (

                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">

                    ✓ Verified

                  </span>

                ) : (

                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">

                    Pending Verification

                  </span>

                )}

              </div>

            </div>



            {editing && (

              <div className="pt-6 border-t">

                <button type="submit" className="btn-primary">

                  Save Changes

                </button>

              </div>

            )}

          </form>

        </div>

      </div>

    </div>

  )

}



export default Profile















