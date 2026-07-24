import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import FileList from '../components/FileList.jsx'
import FileViewer from '../components/FileViewer.jsx'

export default function Workspace() {
  const [files, setFiles] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

  const loadFiles = useCallback(() => {
    api.get('/files/').then(({ data }) => {
      setFiles(data)
      setSelectedId((prev) => prev ?? data[0]?.id ?? null)
    })
  }, [])

  useEffect(() => {
    loadFiles()
    const interval = setInterval(loadFiles, 4000) // pick up "processing" -> "ready" transitions
    return () => clearInterval(interval)
  }, [loadFiles])

  async function handleDelete(id) {
    await api.delete(`/files/${id}`)
    if (selectedId === id) setSelectedId(null)
    loadFiles()
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    try {
      const { data } = await api.get('/search/', { params: { q: query } })
      setSearchResults(data)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all your documents by meaning…"
            className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-4 py-3 text-sm outline-none focus:border-violet/60"
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <button
          type="submit"
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet to-cyan text-ink text-sm font-medium hover:opacity-90 transition"
        >
          Search
        </button>
        {searchResults && (
          <button
            type="button"
            onClick={() => { setSearchResults(null); setQuery('') }}
            className="px-4 py-3 rounded-xl border border-white/10 text-sm text-text-muted hover:text-text-primary transition"
          >
            Clear
          </button>
        )}
      </form>

      {searchResults ? (
        <div className="glass-panel rounded-2xl p-6 flex-1 overflow-y-auto">
          <h3 className="font-display font-medium mb-4">
            {searching ? 'Searching…' : `${searchResults.results.length} result${searchResults.results.length === 1 ? '' : 's'}`}
          </h3>
          {searchResults.answer && (
             <div className="mb-6 p-4 rounded-xl bg-violet/10 border border-violet/20 text-text-primary text-sm whitespace-pre-wrap">
               <div className="font-bold text-violet-light mb-2 flex items-center gap-2">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 AthenaIQ Answer
               </div>
               {searchResults.answer}
             </div>
          )}
          <div className="space-y-3">
            {searchResults.results.map((r, i) => (
              <button
                key={i}
                onClick={() => { setSelectedId(r.file_id); setSearchResults(null); setQuery('') }}
                className="w-full text-left rounded-xl border border-white/10 hover:border-white/25 p-4 transition"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-cyan">{r.filename}</span>
                  <span className="text-xs text-text-muted">match {(r.score * 100).toFixed(0)}%</span>
                </div>
                <p className="text-sm text-text-muted line-clamp-2">{r.content}</p>
              </button>
            ))}
            {searchResults.results.length === 0 && !searching && (
              <p className="text-text-muted text-sm">No matches yet. Try different words, or upload more documents.</p>
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
