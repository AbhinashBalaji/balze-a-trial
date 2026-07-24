import { useEffect, useRef, useState } from 'react'
import api from '../api'

export default function ChatWidget({ fileId, onHighlight }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    setMessages([])
    setOpen(false)
  }, [fileId])

  useEffect(() => {
    if (open) {
      api.get(`/files/${fileId}/chat/`).then(({ data }) => setMessages(data))
    }
  }, [open, fileId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function parseMessage(content) {
    try {
      return JSON.parse(content)
    } catch {
      return { text: content, citations: [] }
    }
  }

  async function send(e) {
    e.preventDefault()
    if (!question.trim() || loading) return
    const q = question
    setQuestion('')
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: 'user', content: JSON.stringify({ text: q, citations: [] }) }])
    setLoading(true)
    try {
      const { data } = await api.post(`/files/${fileId}/chat/`, { question: q })
      setMessages((m) => [...m, data])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { id: `err-${Date.now()}`, role: 'assistant', content: JSON.stringify({ text: err.response?.data?.detail || 'Something went wrong.', citations: [] }) },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 w-[360px] max-w-[90vw] h-[480px] glass-panel rounded-2xl flex flex-col shadow-glow z-40">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium">Ask this document</span>
            <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary text-sm">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-text-muted text-xs">
                Ask anything about this document — AthenaIQ answers using only its content.
              </p>
            )}
            {messages.map((m) => {
              const parsed = parseMessage(m.content)
              return (
              <div key={m.id} className={`text-sm max-w-[85%] px-3 py-2 rounded-xl ${
                m.role === 'user'
                  ? 'bg-gradient-to-r from-violet to-cyan text-ink ml-auto'
                  : 'bg-white/5 border border-white/10 text-text-primary'
              }`}>
                <div>{parsed.text}</div>
                {parsed.citations?.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {parsed.citations.map((cite, i) => (
                      <button 
                        key={i}
                        onClick={() => onHighlight && onHighlight(cite)}
                        className="text-[10px] uppercase font-bold tracking-wider bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition"
                      >
                        [Source {i + 1}]
                      </button>
                    ))}
                  </div>
                )}
              </div>
              )
            })}
            {loading && <div className="text-xs text-text-muted">AthenaIQ is thinking…</div>}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="p-3 border-t border-white/10 flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question…"
              className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-violet/60"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-violet to-cyan text-ink text-sm font-medium disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-violet to-cyan text-ink shadow-glow flex items-center justify-center z-40 hover:scale-105 transition"
        title="Chat with this document"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 4h16v12H8l-4 4V4z"
            stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none"
          />
        </svg>
      </button>
    </>
  )
}
