import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../api'
import { useAuth } from '../AuthContext.jsx'

export default function Dashboard() {
  const [files, setFiles] = useState([])
  const [selected, setSelected] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const [adminStats, setAdminStats] = useState(null)
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    api.get('/files/').then(({ data }) => {
      setFiles(data)
      setLoading(false)
      if (data.length) selectFile(data[0].id)
    })
    
    if (user?.role === 'Admin' || user?.role === 'Super Admin') {
      api.get('/audit/stats').then(({ data }) => setAdminStats(data)).catch(console.error)
      api.get('/audit/alerts').then(({ data }) => setAlerts(data)).catch(console.error)
    }
  }, [user])

  async function selectFile(id) {
    setSelected(id)
    setStats(null)
    const { data } = await api.get(`/files/${id}/dashboard`)
    setStats(data)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="px-6 py-12 max-w-6xl mx-auto"
    >
      <motion.div variants={itemVariants} className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">A quick read on what's in your workspace.</p>
        </div>
        <Link to="/workspace" className="text-sm px-5 py-2.5 rounded-xl border border-white/10 text-white bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all duration-300 backdrop-blur-sm">
          Go to workspace →
        </Link>
      </motion.div>

      {/* Top summary cards */}
      <motion.div variants={itemVariants} className="grid sm:grid-cols-3 gap-5 mt-8">
        <StatCard label="Documents" value={files.length} />
        <StatCard label="Ready" value={files.filter((f) => f.status === 'ready').length} />
        <StatCard label="Processing" value={files.filter((f) => f.status === 'processing').length} />
      </motion.div>

      {/* Admin Audit Stats */}
      {adminStats && (
        <motion.div variants={itemVariants} className="mt-10">
          <h2 className="text-xl font-display font-semibold text-white mb-4">Enterprise Activity (Today)</h2>
          <div className="grid sm:grid-cols-4 gap-5">
            <StatCard label="Logins" value={adminStats.logins_today} />
            <StatCard label="Failed Logins" value={adminStats.failed_logins} highlight={adminStats.failed_logins > 0} />
            <StatCard label="Uploads" value={adminStats.uploads_today} />
            <StatCard label="AI Searches" value={adminStats.searches_today} />
          </div>
        </motion.div>
      )}

      {/* Security Alerts */}
      {alerts.length > 0 && (
        <motion.div variants={itemVariants} className="mt-10 glass-panel border border-red-500/30 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>
            <h2 className="text-xl font-display font-bold text-red-400">Security Alerts</h2>
          </div>
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-white font-bold">{alert.alert_type}</h3>
                  <p className="text-sm text-gray-400">{alert.description}</p>
                </div>
                <span className="text-xs text-text-muted">{new Date(alert.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid md:grid-cols-[300px_1fr] gap-6 mt-10">
        {/* File list */}
        <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-4 h-fit border border-[#7C6FFF]/20">
          {loading && <p className="text-gray-400 text-sm p-3">Loading…</p>}
          {!loading && files.length === 0 && (
            <p className="text-gray-400 text-sm p-3">
              No documents yet.{' '}
              <Link to="/workspace" className="text-[#4FD8EA] hover:underline">Upload one</Link>.
            </p>
          )}
          <div className="space-y-2">
            {files.map((f) => (
              <button
                key={f.id}
                onClick={() => selectFile(f.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-300 ${
                  selected === f.id 
                    ? 'bg-gradient-to-r from-[#7C6FFF]/20 to-[#4FD8EA]/20 border border-[#7C6FFF]/40 text-white shadow-lg' 
                    : 'bg-white/5 border border-transparent text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="truncate font-medium">{f.filename}</div>
                <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{f.status}</div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Selected file stats */}
        <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-8 min-h-[300px] border border-white/10">
          {!selected && <p className="text-gray-400 text-sm">Select a document to see its analysis.</p>}
          {selected && !stats && (
             <div className="animate-pulse space-y-4">
               <div className="h-6 bg-white/10 rounded w-1/3"></div>
               <div className="h-24 bg-white/10 rounded w-full mt-6"></div>
             </div>
          )}
          {stats && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
              <h2 className="font-display text-2xl font-semibold text-white mb-8">
                {files.find((f) => f.id === selected)?.filename}
              </h2>
              <div className="grid sm:grid-cols-3 gap-5 mt-6">
                <MiniStat label="Words" value={stats.word_count.toLocaleString()} highlight />
                <MiniStat label="Characters" value={stats.character_count.toLocaleString()} />
                <MiniStat label="Search chunks" value={stats.chunk_count} />
              </div>
              <div className="grid sm:grid-cols-3 gap-5 mt-5">
                <MiniStat label="Status" value={stats.status} />
                <MiniStat label="Type" value={stats.filetype.toUpperCase()} />
                <MiniStat label="Size" value={`${(stats.filesize / 1024).toFixed(1)} KB`} />
              </div>
              <Link
                to="/workspace"
                className="glow-button inline-block mt-10 text-sm px-6 py-3 rounded-xl bg-gradient-to-r from-[#7C6FFF] to-[#4FD8EA] text-gray-950 font-bold transition-all duration-300"
              >
                Open in workspace
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}

function StatCard({ label, value, highlight }) {
  return (
    <div className={`glass-panel rounded-2xl p-6 border transition-colors ${highlight ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 hover:border-[#7C6FFF]/40'}`}>
      <div className={`text-4xl font-display font-bold mb-2 ${highlight ? 'text-red-400' : 'text-white'}`}>{value}</div>
      <div className="text-gray-400 text-sm tracking-wide uppercase">{label}</div>
    </div>
  )
}

function MiniStat({ label, value, highlight }) {
  return (
    <div className={`rounded-xl border p-5 transition-colors ${highlight ? 'border-[#7C6FFF]/40 bg-[#7C6FFF]/5' : 'border-white/10 bg-white/5'}`}>
      <div className="text-xl font-semibold text-white">{value}</div>
      <div className="text-gray-400 text-xs mt-2 uppercase tracking-wider">{label}</div>
    </div>
  )
}
