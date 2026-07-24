import { useState, useEffect } from 'react'
import Modal from './Modal.jsx'
import api from '../api'

export default function ShareModal({ fileId, onClose }) {
  const [shares, setShares] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [selectedUserId, setSelectedUserId] = useState('')
  const [permission, setPermission] = useState('View')
  const [sharing, setSharing] = useState(false)
  const [message, setMessage] = useState('')

  const loadData = async () => {
    try {
      const [sharesRes, usersRes] = await Promise.all([
        api.get(`/files/${fileId}/shares`),
        api.get('/users')
      ])
      setShares(sharesRes.data)
      setUsers(usersRes.data.users || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [fileId])

  const handleShare = async (e) => {
    e.preventDefault()
    if (!selectedUserId) return
    setSharing(true)
    setMessage('')
    try {
      await api.post(`/files/${fileId}/shares`, {
        user_id: parseInt(selectedUserId),
        permission
      })
      setMessage('Shared successfully!')
      setSelectedUserId('')
      setPermission('View')
      loadData()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to share')
    } finally {
      setSharing(false)
    }
  }

  const handleUpdate = async (shareId, newPerm) => {
    try {
      await api.put(`/files/${fileId}/shares/${shareId}`, { permission: newPerm })
      loadData()
    } catch (err) {
      alert('Failed to update permission')
    }
  }

  const handleRevoke = async (shareId) => {
    if (!window.confirm('Revoke this user\'s access?')) return
    try {
      await api.delete(`/files/${fileId}/shares/${shareId}`)
      loadData()
    } catch (err) {
      alert('Failed to revoke access')
    }
  }

  // Filter out users who already have access
  const availableUsers = users.filter(u => !shares.some(s => s.user_id === u.id))

  return (
    <Modal title="Share Document" onClose={onClose} wide>
      <div className="flex flex-col gap-6">
        
        <form onSubmit={handleShare} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-muted mb-1">Select User</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-primary focus:outline-none focus:border-violet transition"
              required
            >
              <option value="" disabled className="bg-slate-800">Select a user...</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id} className="bg-slate-800">{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Permission</label>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-primary focus:outline-none focus:border-violet transition"
            >
              <option value="View" className="bg-slate-800">View</option>
              <option value="Comment" className="bg-slate-800">Comment</option>
              <option value="Edit" className="bg-slate-800">Edit</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={sharing || !selectedUserId}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet to-cyan text-ink font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {sharing ? 'Sharing...' : 'Share'}
          </button>
        </form>

        {message && (
          <p className={`text-sm ${message.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}

        <div className="mt-2">
          <h4 className="text-sm font-medium text-text-muted mb-3 border-b border-white/10 pb-2">People with Access</h4>
          {loading ? (
            <p className="text-sm text-text-muted">Loading...</p>
          ) : shares.length === 0 ? (
            <p className="text-sm text-text-muted italic">This document is private.</p>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {shares.map(share => (
                <div key={share.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{share.user?.full_name || 'Unknown User'}</p>
                    <p className="text-xs text-text-muted">{share.user?.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={share.permission}
                      onChange={(e) => handleUpdate(share.id, e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-black/20 border border-white/10 text-xs text-text-primary focus:outline-none focus:border-violet transition"
                    >
                      <option value="View" className="bg-slate-800">View</option>
                      <option value="Comment" className="bg-slate-800">Comment</option>
                      <option value="Edit" className="bg-slate-800">Edit</option>
                    </select>
                    <button
                      onClick={() => handleRevoke(share.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition px-2 py-1"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
