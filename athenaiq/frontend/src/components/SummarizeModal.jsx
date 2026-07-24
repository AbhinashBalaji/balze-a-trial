import { useState } from 'react'
import Modal from './Modal.jsx'
import api from '../api'

export default function SummarizeModal({ fileId, onClose }) {
  const [mode, setMode] = useState('brief')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function run(selectedMode) {
    setMode(selectedMode)
    setLoading(true)
    setError('')
    setResult('')
    try {
      const { data } = await api.post(`/files/${fileId}/summarize/`, { mode: selectedMode })
      setResult(selectedMode === 'detailed' ? data.summary_detailed : data.summary_brief)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not summarize this document.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Summarize document" onClose={onClose} wide>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => run('brief')}
          className={`px-4 py-2 rounded-xl text-sm transition ${
            mode === 'brief' ? 'bg-gradient-to-r from-violet to-cyan text-ink font-medium' : 'border border-white/10 text-text-muted'
          }`}
        >
          Brief
        </button>
        <button
          onClick={() => run('detailed')}
          className={`px-4 py-2 rounded-xl text-sm transition ${
            mode === 'detailed' ? 'bg-gradient-to-r from-violet to-cyan text-ink font-medium' : 'border border-white/10 text-text-muted'
          }`}
        >
          Detailed
        </button>
      </div>

      {loading && <p className="text-text-muted text-sm">Reading the document…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && result && (
        <div className="text-sm text-text-primary/90 whitespace-pre-wrap leading-relaxed">{result}</div>
      )}
      {!loading && !result && !error && (
        <p className="text-text-muted text-sm">Choose Brief or Detailed to generate a summary.</p>
      )}
    </Modal>
  )
}
