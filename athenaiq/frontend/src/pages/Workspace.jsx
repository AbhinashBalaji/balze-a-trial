import { useEffect, useState, useCallback, useRef } from 'react'
import api from '../api'
import FileList from '../components/FileList.jsx'
import FileViewer from '../components/FileViewer.jsx'
import VoiceButton from '../components/VoiceButton.jsx'

const MODES = [
  { value: 'hybrid',   label: '⚡ Hybrid',   title: 'Semantic + Keyword combined (best results)' },
  { value: 'semantic', label: '🧠 Semantic',  title: 'Meaning-based vector search' },
  { value: 'keyword',  label: '🔤 Keyword',   title: 'Exact term matching' },
]

export default function Workspace() {
  const [files, setFiles] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [mode, setMode] = useState('hybrid')
  const [filterFileId, setFilterFileId] = useState('')

  const loadFiles = useCallback(() => {
    api.get('/files/').then(({ data }) => {
      setFiles(data)
      setSelectedId((prev) => prev ?? data[0]?.id ?? null)
    })
  }, [])

  useEffect(() => {
    loadFiles()
    const interval = setInterval(loadFiles, 4000)
    return () => clearInterval(interval)
  }, [loadFiles])

  async function handleDelete(id) {
    await api.delete(`/files/${id}`)
    if (selectedId === id) setSelectedId(null)
    loadFiles()
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) { setSearchResults(null); return }
    setSearching(true)
    try {
      const params = { q: query, mode }
      if (filterFileId) params.file_id = filterFileId
      const { data } = await api.get('/search/', { params })
      setSearchResults(data)
    } finally {
      setSearching(false)
    }
  }

  function clearSearch() {
    setSearchResults(null)
    setQuery('')
    setFilterFileId('')
  }

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
      {/* ── Search bar ───────────────────────────────────────────────── */}
      <form onSubmit={handleSearch} className="flex flex-col gap-3 mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across all your documents by meaning…"
              className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-12 py-3 text-sm outline-none focus:border-violet-400/60 transition"
            />
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <VoiceButton
              className="absolute right-3.5 top-1/2 -translate-y-1/2"
              onResult={(final, interim) => setQuery(final + interim)}
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
          {searchResults && (
            <button
              type="button"
              onClick={clearSearch}
              className="px-4 py-3 rounded-xl border border-white/10 text-sm text-text-muted hover:text-white transition"
            >
              Clear
            </button>
          )}
        </div>

        {/* ── Mode toggle + file filter ────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-text-muted mr-1">Mode:</span>
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              title={m.title}
              onClick={() => setMode(m.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                mode === m.value
                  ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                  : 'border-white/10 text-text-muted hover:border-white/25'
              }`}
            >
              {m.label}
            </button>
          ))}

          {files.length > 0 && (
            <select
              value={filterFileId}
              onChange={(e) => setFilterFileId(e.target.value)}
              className="ml-auto rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-text-muted outline-none focus:border-violet-500/60 cursor-pointer"
            >
              <option value="">All documents</option>
              {files.map((f) => (
                <option key={f.id} value={f.id}>{f.filename}</option>
              ))}
            </select>
          )}
        </div>
      </form>

      {/* ── Results panel ─────────────────────────────────────────────── */}
      {searchResults ? (
        <div className="glass-panel rounded-2xl p-6 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm">
              {searching
                ? 'Searching…'
                : <><span className="text-violet-300 font-bold">{searchResults.results.length}</span> result{searchResults.results.length !== 1 ? 's' : ''}</>}
            </h3>
            <span className="text-xs text-text-muted">
              {searchResults.total_chunks_scanned > 0 &&
                `Scanned ${searchResults.total_chunks_scanned} chunks · ${searchResults.search_mode} mode`}
            </span>
          </div>

          {/* AI Answer */}
          {searchResults.answer && (
            <div className="mb-5 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm">
              <div className="flex items-center gap-2 text-violet-300 font-semibold mb-2 text-xs uppercase tracking-wider">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2zm0 5v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                AthenaIQ Answer
              </div>
              <p className="text-text-primary whitespace-pre-wrap leading-relaxed">{searchResults.answer}</p>
            </div>
          )}

          {/* Result cards */}
          <div className="space-y-3">
            {searchResults.results.map((r, i) => {
              const pct = Math.min(Math.round(r.score * 100), 100)
              const barColor = pct >= 60 ? 'bg-emerald-500' : pct >= 35 ? 'bg-amber-500' : 'bg-red-500/60'
              return (
                <button
                  key={i}
                  onClick={() => { setSelectedId(r.file_id); clearSearch() }}
                  className="w-full text-left rounded-xl border border-white/10 hover:border-white/25 p-4 transition group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-cyan-400 group-hover:text-cyan-300 transition">
                      {r.filename}
                    </span>
                    <span className="text-xs text-text-muted font-mono">{pct}% match</span>
                  </div>

                  {/* Score bar */}
                  <div className="h-1 rounded-full bg-white/5 mb-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">{r.content}</p>
                </button>
              )
            })}
            {searchResults.results.length === 0 && !searching && (
              <div className="text-center py-12">
                <p className="text-text-muted text-sm">No matches found. Try different words or switch search mode.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-5 flex-1 min-h-0">
          <FileList
            files={files}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUploaded={loadFiles}
            onDelete={handleDelete}
          />
          <FileViewer fileId={selectedId} files={files} />
        </div>
      )}
    </div>
  )
}
