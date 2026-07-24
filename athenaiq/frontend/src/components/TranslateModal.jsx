import { useState } from 'react'
import Modal from './Modal.jsx'
import api from '../api'

const LANGUAGES = [
  'Spanish', 'French', 'German', 'Hindi', 'Tamil', 'Mandarin Chinese',
  'Japanese', 'Arabic', 'Portuguese', 'Russian', 'Korean', 'Italian',
]

export default function TranslateModal({ fileId, onClose }) {
  const [lang, setLang] = useState('')
  const [custom, setCustom] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    const target = custom.trim() || lang
    if (!target) return
    setLoading(true)
    setError('')
    setResult('')
    try {
      const { data } = await api.post(`/files/${fileId}/translate/`, { target_language: target })
      setResult(data.translated_text)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not translate this document.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Translate document" onClose={onClose} wide>
      <div className="flex flex-wrap gap-2 mb-3">
        {LANGUAGES.map((l) => (
          <button
            key={l}
            onClick={() => { setLang(l); setCustom('') }}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${
              lang === l ? 'bg-gradient-to-r from-violet to-cyan text-ink font-medium' : 'border border-white/10 text-text-muted'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={(e) => { setCustom(e.target.value); setLang('') }}
          placeholder="Or type any language…"
          className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-violet/60"
        />
        <button
          onClick={run}
          disabled={loading || (!lang && !custom.trim())}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet to-cyan text-ink text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Translating…' : 'Translate'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      {result && (
        <div className="text-sm text-text-primary/90 whitespace-pre-wrap leading-relaxed mt-5 border-t border-white/10 pt-4">
          {result}
        </div>
      )}
    </Modal>
  )
}
