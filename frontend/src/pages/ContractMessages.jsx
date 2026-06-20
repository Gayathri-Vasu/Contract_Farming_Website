import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import NavBar from '../components/NavBar'
import { useAuth } from '../context/AuthContext'
import { FiMoreHorizontal, FiPaperclip, FiMic, FiSend } from 'react-icons/fi'

const ContractMessages = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [messageText, setMessageText] = useState('')
  const [messageLoading, setMessageLoading] = useState(false)
  const [poller, setPoller] = useState(null)
  const threadRef = useRef(null)

  const fallbackBackTarget =
    user?.role === 'farmer'
      ? '/contracts'
      : user?.role === 'buyer'
      ? '/contracts'
      : user?.role === 'admin'
      ? '/admin/dashboard#contracts'
      : '/'

  const backTarget = location.state?.returnTo || fallbackBackTarget

  const fetchContract = async () => {
    try {
      const res = await axios.get(`/api/contracts/${id}`)
      setContract(res.data?.data || null)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load contract')
      navigate(backTarget)
    } finally {
      setLoading(false)
    }
  }

  const refreshMessages = async () => {
    try {
      const res = await axios.get(`/api/contracts/${id}`)
      setContract(res.data?.data || null)
      // Mark messages as read for current user
      try {
        await axios.put(`/api/messages/mark-read/${id}`)
      } catch (_) {}
    } catch (_) {}
  }

  useEffect(() => {
    fetchContract()
    return () => {
      if (poller) clearInterval(poller)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!contract) return
    if (poller) clearInterval(poller)
    const intervalId = setInterval(refreshMessages, 3000)
    setPoller(intervalId)
    return () => clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract?._id])

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [contract?.messages?.length])

  const sendMessage = async () => {
    if (!messageText.trim()) return
    setMessageLoading(true)
    try {
      await axios.post(`/api/contracts/${id}/messages`, { message: messageText.trim() })
      setMessageText('')
      await refreshMessages()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send message')
    } finally {
      setMessageLoading(false)
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

  const otherParty =
    user?.role === 'farmer' ? contract.buyer : contract.farmer

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center ring-2 ring-white text-sm font-semibold">
                  {(user?.name || 'Me').charAt(0).toUpperCase()}
                </div>
                <div className="h-9 w-9 rounded-full bg-gray-300 flex items-center justify-center ring-2 ring-white text-sm font-semibold">
                  {(otherParty?.name || 'User').charAt(0).toUpperCase()}
                </div>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Contract Chat</h1>
                <p className="text-gray-600 text-sm">
                  {otherParty?.name} • {otherParty?.email}{otherParty?.phone ? ` • ${otherParty.phone}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to={backTarget} className="btn-secondary">Back</Link>
              <Link to={`/contracts/${contract._id}`} className="btn-secondary">View</Link>
              <button className="icon-button"><FiMoreHorizontal /></button>
            </div>
          </div>
        </div>

        <div className="card">
          <div
            ref={threadRef}
            className="h-96 overflow-y-auto p-4 rounded border bg-white"
          >
            {messageLoading ? (
              <div className="text-center text-gray-500 py-6">Loading...</div>
            ) : (contract.messages || []).length > 0 ? (
              contract.messages.map((m, idx) => {
                const buyerId = contract.buyer?._id || contract.buyer
                const farmerId = contract.farmer?._id || contract.farmer
                const currentUserId = user?.id || user?._id
                const senderId = m.senderId?._id || m.senderId || m.sender?._id || m.sender
                const buyerView = user?.role === 'buyer'
                const isBuyerMsg = buyerId && senderId && String(buyerId) === String(senderId)
                const isFarmerMsg = farmerId && senderId && String(farmerId) === String(senderId)
                const isMine = currentUserId && senderId && String(currentUserId) === String(senderId)
                // Buyer view: buyer messages right; Farmer view: farmer messages right
                const rightSide = buyerView ? isBuyerMsg : isFarmerMsg || isMine

                // For buyer dashboard: buyer messages right, green; others left, gray
                const bubbleCls = rightSide
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-900'
                const rowCls = rightSide ? 'justify-end' : 'justify-start'
                const metaAlign = rightSide ? 'text-right' : 'text-left'
                return (
                  <div key={idx} className={`mb-4 flex items-end gap-2 w-full ${rowCls}`}>
                    {!rightSide && (
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">
                        {(m.senderName || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="max-w-[75%]">
                      <div className={`px-4 py-2 rounded-2xl shadow-sm ${bubbleCls}`}>
                        <div className="whitespace-pre-wrap">{typeof m.message === 'object' && m.message?.en != null ? String(m.message.en) : m.message}</div>
                      </div>
                      <div className={`mt-1 text-[11px] text-gray-500 ${metaAlign}`}>
                        {new Date(m.timestamp || m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{rightSide ? '  ✓✓' : ''}
                      </div>
                    </div>
                    {rightSide && (
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">
                        {(buyerView ? (user?.name || 'B') : (contract.farmer?.name || 'F')).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="text-center text-gray-500 py-6">No messages yet</div>
            )}
          </div>
          {/* Hide message input for admin users - read-only view */}
          {user?.role !== 'admin' && (
            <div className="mt-3">
              <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2">
                <button className="text-gray-500 hover:text-gray-700"><FiPaperclip /></button>
                <button className="text-gray-500 hover:text-gray-700"><FiMic /></button>
                <input
                  type="text"
                  className="bg-transparent outline-none flex-1 px-2"
                  placeholder="Type a message"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                />
                <button className="btn-primary rounded-full px-4" onClick={sendMessage}>
                  <span className="hidden sm:inline">Send</span>
                  <span className="sm:hidden"><FiSend /></span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ContractMessages
