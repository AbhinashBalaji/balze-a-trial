import { useState } from 'react'
import Modal from './Modal.jsx'
import api from '../api'

const TYPE_COLORS = {
  person: '#4FD8EA',
  org: '#7C6FFF',
  concept: '#F2C744',
  place: '#67D68B',
  date: '#EF8FA0',
  other: '#9AA3C9',
}

export default function KnowledgeGraphModal({ fileId, onClose }) {
  const [graph, setGraph] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post(`/files/${fileId}/knowledge-graph/`)
      setGraph(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not build the knowledge graph.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Knowledge graph" onClose={onClose} wide>
      {!graph && !loading && (
        <div className="text-center py-10">
          <p className="text-text-muted text-sm mb-5">
            Map the people, concepts, and relationships inside this document.
          </p>
          <button
            onClick={run}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet to-cyan text-ink text-sm font-medium"
          >
            Generate graph
          </button>
        </div>
      )}
      {loading && <p className="text-text-muted text-sm text-center py-10">Mapping entities and relationships…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {graph && <GraphView graph={graph} />}
    </Modal>
  )
}

function GraphView({ graph }) {
  const size = 480
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 60
  const positions = {}
  graph.nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / graph.nodes.length - Math.PI / 2
    positions[n.id] = [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  })

  return (
    <div>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-h-[480px]">
        {graph.edges.map((e, i) => {
          const a = positions[e.source]
          const b = positions[e.target]
          if (!a || !b) return null
          const mx = (a[0] + b[0]) / 2
          const my = (a[1] + b[1]) / 2
          return (
            <g key={i}>
              <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
              <text x={mx} y={my} fontSize="8" fill="#8B90A8" textAnchor="middle">{e.relation}</text>
            </g>
          )
        })}
        {graph.nodes.map((n) => {
          const [x, y] = positions[n.id]
          const color = TYPE_COLORS[n.type] || TYPE_COLORS.other
          return (
            <g key={n.id}>
              <circle cx={x} cy={y} r="6" fill={color} />
              <text x={x} y={y - 12} fontSize="10" fill="#EDEFF7" textAnchor="middle">{n.label}</text>
            </g>
          )
        })}
      </svg>
      <div className="flex flex-wrap gap-3 mt-4 text-xs text-text-muted">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {type}
          </span>
        ))}
      </div>
    </div>
  )
}
