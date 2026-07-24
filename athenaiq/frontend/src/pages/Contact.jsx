import { useState } from 'react'

export default function Contact() {
  const [sent, setSent] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="px-6 py-16 max-w-2xl mx-auto">
      <div className="text-center">
        <span className="text-xs tracking-widest uppercase text-cyan/80 border border-cyan/20 rounded-full px-3 py-1">
          Contact
        </span>
        <h1 className="font-display text-3xl md:text-4xl font-semibold mt-5">Talk to the team</h1>
        <p className="text-text-muted mt-3">
          Questions, feedback, or a team plan you'd like to discuss — send it over.
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-8 mt-10">
        {sent ? (
          <p className="text-center text-text-primary py-8">
            Thanks — your message is in. We'll get back to you soon.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-muted">Name</label>
                <input required className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-violet/60" />
              </div>
              <div>
                <label className="text-xs text-text-muted">Email</label>
                <input type="email" required className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-violet/60" />
              </div>
            </div>
            <div>
              <label className="text-xs text-text-muted">Message</label>
              <textarea required rows={5} className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-violet/60" />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet to-cyan text-ink font-medium hover:opacity-90 transition"
            >
              Send message
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
