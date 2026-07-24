import { useEffect, useState } from 'react'
import api from '../api'
import Modal from '../components/Modal.jsx'
import { useAuth } from '../AuthContext.jsx'

export default function Users() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  // Form states
  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', role_id: '', department_id: '' })
  const [createForm, setCreateForm] = useState({ full_name: '', email: '', password: '', role_id: '', department_id: '' })
  const [editForm, setEditForm] = useState({ id: null, full_name: '', email: '', role_id: '', department_id: '' })
  const [passwordForm, setPasswordForm] = useState({ id: null, password: '' })
  
  const [roles, setRoles] = useState([])
  const [departments, setDepartments] = useState([])
  
  // Feedback
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users')
      setUsers(data.users || [])
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRolesAndDepartments = async () => {
    try {
      const [rolesRes, deptsRes] = await Promise.all([
        api.get('/rbac/roles'),
        api.get('/rbac/departments')
      ])
      setRoles(rolesRes.data || [])
      setDepartments(deptsRes.data || [])
      
      if (rolesRes.data?.length > 0) {
        const defaultRole = rolesRes.data.find(r => r.role_name === 'Employee') || rolesRes.data[0];
        setInviteForm(prev => ({ ...prev, role_id: defaultRole.id }))
        setCreateForm(prev => ({ ...prev, role_id: defaultRole.id }))
      }
      if (deptsRes.data?.length > 0) {
        setInviteForm(prev => ({ ...prev, department_id: deptsRes.data[0].id }))
        setCreateForm(prev => ({ ...prev, department_id: deptsRes.data[0].id }))
      }
    } catch (err) {
      console.error('Failed to fetch RBAC data:', err)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchRolesAndDepartments()
  }, [])

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteForm.email || !inviteForm.full_name) return
    setActionLoading(true)
    try {
      await api.post('/users/invite', {
        ...inviteForm,
        role_id: parseInt(inviteForm.role_id),
        department_id: inviteForm.department_id ? parseInt(inviteForm.department_id) : null
      })
      showMessage('success', 'Invitation sent successfully!')
      setInviteForm({ email: '', full_name: '', role_id: roles[0]?.id || '', department_id: departments[0]?.id || '' })
      setShowInviteModal(false)
      fetchUsers()
    } catch (err) {
      showMessage('error', err.response?.data?.detail || 'Failed to send invitation.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await api.post('/users', {
        ...createForm,
        role_id: parseInt(createForm.role_id),
        department_id: createForm.department_id ? parseInt(createForm.department_id) : null
      })
      showMessage('success', 'User created successfully!')
      setCreateForm({ full_name: '', email: '', password: '', role_id: roles[0]?.id || '', department_id: departments[0]?.id || '' })
      setShowCreateModal(false)
      fetchUsers()
    } catch (err) {
      showMessage('error', err.response?.data?.detail || 'Failed to create user.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await api.put(`/users/${editForm.id}`, { full_name: editForm.full_name, email: editForm.email })
      if (editForm.role_id) {
        await api.put(`/users/${editForm.id}/role`, { role_id: parseInt(editForm.role_id) })
      }
      showMessage('success', 'User updated successfully!')
      setShowEditModal(false)
      fetchUsers()
    } catch (err) {
      showMessage('error', err.response?.data?.detail || 'Failed to update user.')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await api.put(`/users/${passwordForm.id}/reset-password`, { password: passwordForm.password })
      showMessage('success', 'Password reset successfully!')
      setShowPasswordModal(false)
    } catch (err) {
      showMessage('error', err.response?.data?.detail || 'Failed to reset password.')
    } finally {
      setActionLoading(false)
    }
  }

  const toggleStatus = async (user) => {
    if (user.id === currentUser.id) return showMessage('error', 'Cannot deactivate yourself')
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await api.put(`/users/${user.id}/status`, { status: newStatus })
      fetchUsers()
    } catch (err) {
      showMessage('error', err.response?.data?.detail || 'Failed to update status.')
    }
  }

  const toggleRole = async (user) => {
    if (user.id === currentUser.id) return showMessage('error', 'Cannot change your own role')
    const newRole = user.role === 'Admin' ? 'User' : 'Admin'
    try {
      await api.put(`/users/${user.id}/role`, { role: newRole })
      fetchUsers()
    } catch (err) {
      showMessage('error', err.response?.data?.detail || 'Failed to update role.')
    }
  }

  const deleteUser = async (user) => {
    if (user.id === currentUser.id) return showMessage('error', 'Cannot delete yourself')
    if (!window.confirm(`Are you sure you want to delete ${user.name}?`)) return
    try {
      await api.delete(`/users/${user.id}`)
      showMessage('success', 'User deleted')
      fetchUsers()
    } catch (err) {
      showMessage('error', err.response?.data?.detail || 'Failed to delete user.')
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Users</h1>
          <p className="text-text-muted">Manage system access and roles</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowInviteModal(true)}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-text-primary hover:bg-white/5 transition"
          >
            Invite User
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet to-cyan text-ink font-semibold hover:opacity-90 transition shadow-glow"
          >
            Create User
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`mb-6 px-4 py-3 rounded-xl border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="glass-panel p-1 rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-text-muted text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Joined Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-text-muted">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-text-muted">No users found.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-text-primary">{u.name}</div>
                    </td>
                    <td className="px-6 py-4 text-text-muted">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ['Admin', 'Super Admin'].includes(u.role) ? 'bg-violet/20 text-violet-light border border-violet/30' :
                        'bg-white/10 text-text-muted border border-white/20'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-muted">{u.department}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${u.status === 'Active' ? 'bg-green-400' : u.status === 'Pending' ? 'bg-yellow-400' : 'bg-red-400'}`}></span>
                        <span className="text-sm">{u.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-muted text-sm">
                      {new Date(u.joined_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3 text-sm">
                        <button onClick={() => { setEditForm({ id: u.id, full_name: u.name, email: u.email, role_id: u.role_id, department_id: u.department_id }); setShowEditModal(true); }} className="text-text-muted hover:text-cyan transition">Edit</button>
                        <button onClick={() => toggleStatus(u)} className="text-text-muted hover:text-violet transition">{u.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
                        <button onClick={() => { setPasswordForm({ id: u.id, password: '' }); setShowPasswordModal(true); }} className="text-text-muted hover:text-cyan transition">Password</button>
                        <button onClick={() => deleteUser(u)} className="text-text-muted hover:text-red-400 transition">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showInviteModal && (
        <Modal title="Invite User" onClose={() => setShowInviteModal(false)}>
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Full Name</label>
              <input
                type="text"
                value={inviteForm.full_name}
                onChange={(e) => setInviteForm({...inviteForm, full_name: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-primary focus:outline-none focus:border-violet focus:ring-1 focus:ring-violet transition"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Email Address</label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-primary focus:outline-none focus:border-violet focus:ring-1 focus:ring-violet transition"
                placeholder="colleague@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Role</label>
              <select 
                value={inviteForm.role_id} 
                onChange={(e) => setInviteForm({...inviteForm, role_id: e.target.value})} 
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-primary focus:outline-none focus:border-violet transition"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id} className="bg-slate-800">{r.role_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Department</label>
              <select 
                value={inviteForm.department_id} 
                onChange={(e) => setInviteForm({...inviteForm, department_id: e.target.value})} 
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-primary focus:outline-none focus:border-violet transition"
              >
                <option value="" className="bg-slate-800">None</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id} className="bg-slate-800">{d.department_name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setShowInviteModal(false)} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary transition">Cancel</button>
              <button type="submit" disabled={actionLoading || !inviteForm.email} className="px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-violet to-cyan text-ink font-medium disabled:opacity-50 transition">
                {actionLoading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showCreateModal && (
        <Modal title="Create User" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Full Name</label>
              <input type="text" value={createForm.full_name} onChange={(e) => setCreateForm({...createForm, full_name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-primary focus:outline-none focus:border-violet transition" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Email Address</label>
              <input type="email" value={createForm.email} onChange={(e) => setCreateForm({...createForm, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-primary focus:outline-none focus:border-violet transition" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Password</label>
              <input type="password" value={createForm.password} onChange={(e) => setCreateForm({...createForm, password: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-primary focus:outline-none focus:border-violet transition" required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Role</label>
              <select value={createForm.role_id} onChange={(e) => setCreateForm({...createForm, role_id: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-primary focus:outline-none focus:border-violet transition">
                {roles.map(r => (
                  <option key={r.id} value={r.id} className="bg-slate-800">{r.role_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Department</label>
              <select value={createForm.department_id} onChange={(e) => setCreateForm({...createForm, department_id: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-primary focus:outline-none focus:border-violet transition">
                <option value="" className="bg-slate-800">None</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id} className="bg-slate-800">{d.department_name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary transition">Cancel</button>
              <button type="submit" disabled={actionLoading} className="px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-violet to-cyan text-ink font-medium disabled:opacity-50 transition">
                {actionLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showEditModal && (
        <Modal title="Edit User" onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Full Name</label>
              <input type="text" value={editForm.full_name} onChange={(e) => setEditForm({...editForm, full_name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-primary focus:outline-none focus:border-violet transition" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Email Address</label>
              <input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-primary focus:outline-none focus:border-violet transition" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Role</label>
              <select value={editForm.role_id || ''} onChange={(e) => setEditForm({...editForm, role_id: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-primary focus:outline-none focus:border-violet transition">
                <option value="" className="bg-slate-800">Select Role</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id} className="bg-slate-800">{r.role_name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary transition">Cancel</button>
              <button type="submit" disabled={actionLoading} className="px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-violet to-cyan text-ink font-medium disabled:opacity-50 transition">
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showPasswordModal && (
        <Modal title="Reset Password" onClose={() => setShowPasswordModal(false)}>
          <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">New Password</label>
              <input type="password" value={passwordForm.password} onChange={(e) => setPasswordForm({...passwordForm, password: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-primary focus:outline-none focus:border-violet transition" required minLength={6} />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary transition">Cancel</button>
              <button type="submit" disabled={actionLoading} className="px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-violet to-cyan text-ink font-medium disabled:opacity-50 transition">
                {actionLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  )
}
