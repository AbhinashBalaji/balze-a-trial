import { useEffect, useState, useRef } from 'react'
import api from '../api'
import SummarizeModal from './SummarizeModal.jsx'
import TranslateModal from './TranslateModal.jsx'
import KnowledgeGraphModal from './KnowledgeGraph.jsx'
import CompareDocsModal from './CompareDocs.jsx'
import ChatWidget from './ChatWidget.jsx'
import ShareModal from './ShareModal.jsx'
import { useAuth } from '../AuthContext.jsx'

const TOOLS = [
  { key: 'summarize', label: 'Summarize' },
  { key: 'translate', label: 'Translate' },
  { key: 'graph', label: 'Knowledge graph' },
  { key: 'compare', label: 'Compare' },
]

function Highlighter({ text, highlight }) {
  const markRef = useRef(null)

  useEffect(() => {
    if (highlight && markRef.current) {
      markRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlight])

  if (!highlight) return <>{text}</>
  const parts = text.split(highlight)
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i !== parts.length - 1 && (
            <mark ref={i === 0 ? markRef : null} className="bg-cyan/40 text-white rounded px-1">{highlight}</mark>
          )}
        </span>
      ))}
    </>
  )
}

export default function FileViewer({ fileId, files }) {
  const { user } = useAuth()
  const [file, setFile] = useState(null)
  const [activeTool, setActiveTool] = useState(null)
  const [highlightText, setHighlightText] = useState(null)
  
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)

  const canEdit = user?.role === 'Admin' || user?.roles?.some(ur => ur.role?.permissions?.some(p => p.permission?.permission_name === 'edit_documents'))

  const handleEdit = () => {
    setEditContent(file.text_content || '')
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const { data } = await api.put(`/files/${file.id}/content`, { text_content: editContent })
      setFile(data)
      setIsEditing(false)
    } catch (err) {
      alert("Failed to save: " + (err.response?.data?.detail || err.message))
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent('')
  }

  useEffect(() => {
    setFile(null)
    setActiveTool(null)
    setHighlightText(null)
    setIsEditing(false)
    if (fileId) {
      api.get(`/files/${fileId}`).then(({ data }) => setFile(data))
    }
  }, [fileId])

  if (!fileId) {
    return (
      <div className="glass-panel rounded-2xl h-full flex items-center justify-center text-text-muted text-sm">
        Select or upload a document to get started.
      </div>
    )
  }

  if (!file) {
    return (
      <div className="glass-panel rounded-2xl h-full flex items-center justify-center text-text-muted text-sm">
        Loading document…
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-2xl h-full flex flex-col relative">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-medium truncate max-w-md">{file.filename}</h2>
          <span className="text-xs text-text-muted">{file.status}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {TOOLS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTool(t.key)}
              disabled={file.status !== 'ready'}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-text-muted hover:text-text-primary hover:border-white/25 transition disabled:opacity-40"
            >
              {t.label}
            </button>
          ))}
          {canEdit && file.status === 'ready' && !isEditing && (
            <button
              onClick={handleEdit}
              className="text-xs px-3 py-1.5 rounded-lg border border-cyan/30 text-cyan bg-cyan/10 hover:bg-cyan/20 hover:border-cyan/50 transition"
            >
              Edit Document
            </button>
          )}
          {user?.role === 'Admin' && (
            <button
              onClick={() => setActiveTool('share')}
              className="text-xs px-3 py-1.5 rounded-lg border border-violet/30 text-violet-light bg-violet/10 hover:bg-violet/20 hover:border-violet/50 transition"
            >
              Share
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col">
        {file.status === 'processing' && (
          <p className="text-text-muted text-sm">Reading and indexing this document…</p>
        )}
        {file.status === 'error' && (
          <p className="text-red-400 text-sm">{file.text_content}</p>
        )}
        {file.status === 'ready' && (
          isEditing ? (
            <div className="flex-1 flex flex-col min-h-0 min-h-[300px]">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 w-full p-4 rounded-xl bg-black/20 border border-white/10 text-text-primary text-sm focus:outline-none focus:border-cyan/50 transition resize-none mb-4 font-mono"
                placeholder="Edit document content here..."
              />
              <div className="flex gap-2 justify-end shrink-0">
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-cyan to-blue-400 text-black font-semibold hover:opacity-90 transition disabled:opacity-50 shadow-lg shadow-cyan/20"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-text-primary/85 whitespace-pre-wrap leading-relaxed">
              {file.text_content ? (
                <Highlighter text={file.text_content} highlight={highlightText} />
              ) : (
                'No readable text was found in this file.'
              )}
            </div>
          )
        )}
      </div>

      {file.status === 'ready' && !isEditing && <ChatWidget fileId={file.id} onHighlight={setHighlightText} />}

      {activeTool === 'summarize' && <SummarizeModal fileId={file.id} onClose={() => setActiveTool(null)} />}
      {activeTool === 'translate' && <TranslateModal fileId={file.id} onClose={() => setActiveTool(null)} />}
      {activeTool === 'graph' && <KnowledgeGraphModal fileId={file.id} onClose={() => setActiveTool(null)} />}
      {activeTool === 'compare' && (
        <CompareDocsModal fileId={file.id} files={files} onClose={() => setActiveTool(null)} />
      )}
      {activeTool === 'share' && <ShareModal fileId={file.id} onClose={() => setActiveTool(null)} />}
    </div>
  )
}
