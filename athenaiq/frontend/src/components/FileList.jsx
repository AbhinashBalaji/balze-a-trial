import { useRef, useState, useCallback } from 'react'
import api from '../api'

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md', 'csv']
const MAX_FILE_SIZE_MB = 50

export default function FileList({ files, selectedId, onSelect, onUploaded, onDelete }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState([]) // [{name, status, error}]
  const [dragOver, setDragOver] = useState(false)

  const validateFile = (file) => {
    const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file type ".${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File too large (max ${MAX_FILE_SIZE_MB} MB)`
    }
    return null
  }

  const handleFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList)
    if (!files.length) return

    // Validate all files first
    const validated = files.map((f) => ({ file: f, validationError: validateFile(f) }))
    const initialProgress = validated.map(({ file, validationError }) => ({
      name: file.name,
      status: validationError ? 'error' : 'pending',
      error: validationError || null,
    }))
    setUploadProgress(initialProgress)
    setUploading(true)

    const results = [...initialProgress]

    for (let i = 0; i < validated.length; i++) {
      const { file, validationError } = validated[i]
      if (validationError) continue

      results[i] = { ...results[i], status: 'uploading' }
      setUploadProgress([...results])

      const form = new FormData()
      form.append('upload', file)

      try {
        await api.post('/files/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        results[i] = { ...results[i], status: 'done' }
      } catch (err) {
        const detail = err.response?.data?.detail || `Upload failed for ${file.name}`
        results[i] = { ...results[i], status: 'error', error: detail }
      }
      setUploadProgress([...results])
    }

    setUploading(false)
    onUploaded()

    // Clear progress after 5 seconds if all done/errored
    setTimeout(() => {
      setUploadProgress([])
    }, 5000)
  }, [onUploaded])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const allDone = uploadProgress.length > 0 && uploadProgress.every((p) => p.status === 'done' || p.status === 'error')

  return (
    <div className="glass-panel rounded-2xl p-3 h-full flex flex-col">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,.csv"
        multiple
        className="hidden"
        onChange={(e) => e.target.files.length && handleFiles(e.target.files)}
        onClick={(e) => { e.target.value = '' }} // allow re-uploading same file
      />

      {/* Drop zone + upload button */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-xl border-2 border-dashed transition-all duration-300 mb-3 ${
          dragOver
            ? 'border-violet/70 bg-violet/10 scale-[1.01]'
            : 'border-white/20 hover:border-white/35'
        }`}
      >
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full py-3 px-4 flex flex-col items-center gap-1 text-sm rounded-xl bg-gradient-to-r from-violet/10 to-cyan/10 hover:from-violet/20 hover:to-cyan/20 transition-all disabled:opacity-50 cursor-pointer"
        >
          {dragOver ? (
            <>
              <span className="text-xl">📥</span>
              <span className="font-medium text-cyan">Drop to upload</span>
            </>
          ) : uploading ? (
            <>
              <UploadSpinner />
              <span className="font-medium text-violet-light">Uploading…</span>
            </>
          ) : (
            <>
              <span className="text-lg">☁️</span>
              <span className="font-medium text-text-primary">Upload or drop files</span>
              <span className="text-[11px] text-text-muted">PDF, DOCX, TXT, MD, CSV · Max {MAX_FILE_SIZE_MB} MB</span>
            </>
          )}
        </button>
      </div>

      {/* Upload progress list */}
      {uploadProgress.length > 0 && (
        <div className="mb-2 space-y-1.5">
          {uploadProgress.map((p, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
                p.status === 'error'
                  ? 'border-red-500/30 bg-red-500/10 text-red-400'
                  : p.status === 'done'
                  ? 'border-green-500/30 bg-green-500/10 text-green-400'
                  : p.status === 'uploading'
                  ? 'border-violet/30 bg-violet/10 text-violet-light'
                  : 'border-white/10 bg-white/5 text-text-muted'
              }`}
            >
              <span className="shrink-0">
                {p.status === 'done' ? '✓' : p.status === 'error' ? '✕' : p.status === 'uploading' ? '⟳' : '○'}
              </span>
              <span className="truncate flex-1">{p.name}</span>
              {p.error && <span className="truncate text-red-300 max-w-[120px]" title={p.error}>{p.error}</span>}
            </div>
          ))}
          {allDone && (
            <button
              className="text-[10px] text-text-muted hover:text-text-primary underline px-1"
              onClick={() => setUploadProgress([])}
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {files.length === 0 && !uploading && uploadProgress.length === 0 && (
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
              <div className="text-[11px] text-text-muted flex items-center gap-1">
                {f.status === 'processing' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
                {f.status === 'ready' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />}
                {f.status === 'error' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />}
                {f.status}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm(`Delete "${f.filename}"?`)) onDelete(f.id)
              }}
              className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition text-xs shrink-0"
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
  const colors = {
    pdf: 'text-red-400',
    docx: 'text-blue-400',
    txt: 'text-gray-400',
    md: 'text-purple-400',
    csv: 'text-green-400',
  }
  return (
    <span className={`w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] uppercase shrink-0 ${colors[type] || 'text-cyan'}`}>
      {type}
    </span>
  )
}

function UploadSpinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-violet-light" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}
