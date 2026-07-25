import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api'

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const [filters, setFilters] = useState({
    search: '',
    role: 'All',
    department: 'All',
    module: 'All',
    action: 'All',
    status: 'All'
  })

  const [selectedLog, setSelectedLog] = useState(null)

  const fetchLogs = async (currentPage, currentFilters) => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        size: 20,
        ...currentFilters
      }
      // Remove empty filters
      Object.keys(params).forEach(k => {
        if (params[k] === '' || params[k] === 'All') {
          delete params[k]
        }
      })
      const { data } = await api.get('/audit/logs', { params })
      setLogs(data.items)
      setTotalPages(data.pages)
      setTotalItems(data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(page, filters)
    
    // Auto refresh every 5 seconds for real-time requirement
    const interval = setInterval(() => {
      fetchLogs(page, filters)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [page, filters])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleExportCSV = () => {
    const params = new URLSearchParams()
    Object.keys(filters).forEach(k => {
      if (filters[k] !== '' && filters[k] !== 'All') {
        params.append(k, filters[k])
      }
    })
    window.open(`${api.defaults.baseURL}/audit/export?format=csv&${params.toString()}`, '_blank')
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Audit Logs</h1>
          <p className="text-text-muted">Enterprise event tracking and security monitoring.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-semibold hover:bg-white/10 transition flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-xl mb-6 flex flex-wrap gap-4 items-center border border-white/10">
        <input 
          type="text" 
          placeholder="Search user, document, or action..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-sm w-full md:w-64 focus:outline-none focus:border-cyan/50 text-white"
        />
        
        <select 
          value={filters.module}
          onChange={(e) => handleFilterChange('module', e.target.value)}
          className="px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
        >
          <option value="All">All Modules</option>
          <option value="Authentication">Authentication</option>
          <option value="User Management">User Management</option>
          <option value="Documents">Documents</option>
          <option value="AI Features">AI Features</option>
          <option value="System">System</option>
        </select>

        <select 
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
        >
          <option value="All">All Statuses</option>
          <option value="Success">Success</option>
          <option value="Failed">Failed</option>
        </select>

        <span className="text-xs text-text-muted ml-auto">Total records: {totalItems}</span>
      </div>

      {/* Data Table */}
      <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-text-muted">
                <th className="p-4 font-semibold">Timestamp</th>
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Action</th>
                <th className="p-4 font-semibold">Module</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-text-muted">No logs found matching your criteria.</td>
                </tr>
              )}
              {logs.map((log) => (
                <motion.tr 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={log.id} 
                  onClick={() => setSelectedLog(log)}
                  className="border-b border-white/5 hover:bg-white/5 transition cursor-pointer"
                >
                  <td className="p-4 text-text-muted whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-white">{log.username || 'System/Unknown'}</div>
                    <div className="text-xs text-text-muted">{log.email || '-'}</div>
                  </td>
                  <td className="p-4 text-text-muted">{log.role || '-'}</td>
                  <td className="p-4 font-medium text-cyan-light">{log.action}</td>
                  <td className="p-4 text-text-muted">{log.module || '-'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      log.status === 'Success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 transition"
          >
            Previous
          </button>
          <span className="text-sm text-text-muted">Page {page} of {totalPages}</span>
          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 transition"
          >
            Next
          </button>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#0f1115] border border-white/10 p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedLog(null)}
                className="absolute top-4 right-4 text-text-muted hover:text-white"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
              
              <h2 className="text-2xl font-bold mb-6">Log Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 border-b border-white/10 pb-2">User Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-text-muted inline-block w-24">User:</span> {selectedLog.username || '-'}</p>
                    <p><span className="text-text-muted inline-block w-24">Email:</span> {selectedLog.email || '-'}</p>
                    <p><span className="text-text-muted inline-block w-24">Role:</span> {selectedLog.role || '-'}</p>
                    <p><span className="text-text-muted inline-block w-24">Dept:</span> {selectedLog.department || '-'}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 border-b border-white/10 pb-2">Event Context</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-text-muted inline-block w-24">Timestamp:</span> {new Date(selectedLog.timestamp).toLocaleString()}</p>
                    <p><span className="text-text-muted inline-block w-24">Module:</span> {selectedLog.module || '-'}</p>
                    <p><span className="text-text-muted inline-block w-24">Action:</span> <span className="font-bold text-cyan-light">{selectedLog.action}</span></p>
                    <p><span className="text-text-muted inline-block w-24">Status:</span> 
                      <span className={selectedLog.status === 'Success' ? 'text-green-400' : 'text-red-400'}> {selectedLog.status}</span>
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 border-b border-white/10 pb-2">Device & Network</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-text-muted inline-block w-24">IP Address:</span> {selectedLog.ip_address || 'Unknown'}</p>
                    <p><span className="text-text-muted inline-block w-24">Browser:</span> {selectedLog.browser || 'Unknown'}</p>
                    <p><span className="text-text-muted inline-block w-24">OS:</span> {selectedLog.operating_system || 'Unknown'}</p>
                    <p><span className="text-text-muted inline-block w-24">Device:</span> {selectedLog.device_type || 'Unknown'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 border-b border-white/10 pb-2">System Data</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-text-muted inline-block w-24">Document:</span> {selectedLog.document_name || 'N/A'}</p>
                    <p><span className="text-text-muted inline-block w-24">Endpoint:</span> {selectedLog.request_method} {selectedLog.api_endpoint}</p>
                    <p><span className="text-text-muted inline-block w-24">Details:</span> <span className="text-gray-300">{selectedLog.description || '-'}</span></p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
