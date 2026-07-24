import { useRef, useState } from 'react'
import api from '../api'

export default function FileList({ files, selectedId, onSelect, onUploaded, onDelete }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(fileList) {
    setError('')
    for (const file of fileList) {
      const form = new FormData()
      form.append('upload', file)
      setUploading(true)
      try {
        await api.post('/files/upload', form)
      } catch (err) {
        setError(err.response?.data?.detail || `Could not upload ${file.name}`)
      }
    }
    setUploading(false)
    onUploaded()
  }

  return (
    <div className="glass-panel rounded-2xl p-3 h-full flex flex-col">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,.csv"
        multiple
        className="hidden"
        onChange={(e) => e.target.files.length && handleFiles(e.target.files)}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet to-cyan text-ink text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : '+ Upload file'}
      </button>

      {error && <p className="text-xs text-red-400 mt-2 px-1">{error}</p>}

      <div className="mt-3 flex-1 overflow-y-auto space-y-1">
        {files.length === 0 && (
          <p className="text-text-muted text-xs px-2 py-4 text-center">
            No documents yet. Upload a PDF, Word doc, or text file to get started.
          </p>
        )}
        {files.map((f) => (
          <div
            key={f.id}
            className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-sm transition ${
              selectedId === f.id ? 'bg-white/10 text-text-primary' : 'text-text-muted hover:bg-white/5'
            }`}
            onClick={() => onSelect(f.id)}
          >
            <FileIcon type={f.filetype} />
            <div className="flex-1 min-w-0">
              <div className="truncate">{f.filename}</div>
              <div className="text-[11px] text-text-muted">{f.status}</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(f.id)
              }}
              className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition text-xs"
              title="Delete"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function FileIcon({ type }) {
  return (
    <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] uppercase text-cyan shrink-0">
      {type}
    </span>
  )
}
