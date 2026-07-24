import { useState } from 'react'
import Modal from './Modal.jsx'
import api from '../api'

export default function CompareDocsModal({ fileId, files, onClose }) {
  const [otherId, setOtherId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const otherOptions = files.filter((f) => f.id !== fileId)

  async function run() {
    if (!otherId) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const { data } = await api.post('/compare/', { file_id_a: fileId, file_id_b: Number(otherId) })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not compare these documents.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Compare documents" onClose={onClose} wide>
      <div className="flex gap-2">
        <select
          value={otherId}
          onChange={(e) => setOtherId(e.target.value)}
          className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-violet/60"
        >
          <option value="">Compare against…</option>
          {otherOptions.map((f) => (
            <option key={f.id} value={f.id}>{f.filename}</option>
          ))}
        </select>
        <button
          onClick={run}
          disabled={loading || !otherId}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet to-cyan text-ink text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Comparing…' : 'Compare'}
        </button>
      </div>

      {otherOptions.length === 0 && (
        <p className="text-text-muted text-xs mt-3">Upload a second document to compare against this one.</p>
      )}
      {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

      {result && (
        <div className="mt-5 space-y-4">
          <Section title="Similarities" content={result.similarities} />
          <Section title="Differences" content={result.differences} />
          <Section title="Verdict" content={result.verdict} accent />
        </div>
      )}
    </Modal>
  )
}

function Section({ title, content, accent }) {
  return (
    <div className={`rounded-xl p-4 border ${accent ? 'border-cyan/30 bg-cyan/5' : 'border-white/10'}`}>
      <h4 className="text-sm font-medium mb-1.5">{title}</h4>
      <p className="text-sm text-text-primary/90 whitespace-pre-wrap leading-relaxed">{content}</p>
    </div>
  )
}
