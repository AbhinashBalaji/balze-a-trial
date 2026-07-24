import { createPortal } from 'react-dom'

export default function Modal({ title, onClose, children, wide }) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
      <div className={`glass-panel rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[85vh] flex flex-col`}>
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <h3 className="font-display font-medium">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-sm">✕</button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  )
}
