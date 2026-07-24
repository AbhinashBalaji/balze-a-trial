import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import api from '../api'
import VoiceButton from './VoiceButton.jsx'

export default function ChatWidget({ fileId, onHighlight }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    setMessages([])
    setOpen(false)
  }, [fileId])

  useEffect(() => {
    if (open) {
      api.get(`/files/${fileId}/chat/`).then(({ data }) => setMessages(data)).catch(() => {})
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, fileId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function parseMessage(content) {
    try { return JSON.parse(content) } catch { return { text: content, citations: [] } }
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
      const msg = err.response?.data?.detail || 'Something went wrong.'
      setMessages((m) => [...m, { id: `err-${Date.now()}`, role: 'assistant', content: JSON.stringify({ text: msg, citations: [] }) }])
    } finally {
      setLoading(false)
    }
  }

  if (!fileId) return null

  const widgetContent = (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none">
      {open && (
        <div className="pointer-events-auto mb-4 w-[380px] max-w-[92vw] h-[500px] glass-panel rounded-2xl flex flex-col shadow-2xl border border-white/10">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0 bg-blue-600/20 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-semibold">Ask this document</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-white text-lg leading-none transition"
            >✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center mt-8">
                <div className="text-3xl mb-2">💬</div>
                <p className="text-text-muted text-xs leading-relaxed">
                  Ask anything about this document.<br />AthenaIQ answers using only its content.
                </p>
              </div>
            )}
            {messages.map((m) => {
              const parsed = parseMessage(m.content)
              const isUser = m.role === 'user'
              return (
                <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                    isUser
                      ? 'bg-gradient-to-br from-violet-500 to-cyan-500 text-white rounded-br-sm'
                      : 'bg-white/8 border border-white/10 text-text-primary rounded-bl-sm'
                  }`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{parsed.text}</p>
                    {parsed.citations?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10 flex gap-1.5 flex-wrap">
                        {parsed.citations.map((cite, i) => (
                          <button
                            key={i}
                            onClick={() => onHighlight?.(cite)}
                            className="text-[10px] uppercase font-bold tracking-wider bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full transition"
                            title={cite}
                          >
                            Source {i + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={send} className="p-3 border-t border-white/10 flex gap-2 shrink-0 relative items-center bg-black/20 rounded-b-2xl">
            <input
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question…"
              className="flex-1 rounded-xl bg-white/5 border border-white/10 pl-3 pr-10 py-2 text-sm outline-none focus:border-blue-500/60 transition"
            />
            <VoiceButton
              className="absolute right-[60px] top-1/2 -translate-y-1/2"
              onResult={(final, interim) => setQuestion(final + interim)}
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 transition hover:bg-blue-500"
            >
              ↑
            </button>
          </form>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="pointer-events-auto w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        title="Chat with this document"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 4h16v12H8l-4 4V4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
          </svg>
        )}
      </button>
    </div>
  )

  return createPortal(widgetContent, document.body)
}
