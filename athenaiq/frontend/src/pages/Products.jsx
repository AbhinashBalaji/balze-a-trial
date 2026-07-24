const PLANS = [
  {
    name: 'Starter',
    price: '$0',
    period: 'forever',
    tagline: 'For trying AthenaIQ on your own files.',
    features: ['5 documents / month', 'Semantic search', 'Brief summaries', 'Chat with a document'],
    cta: 'Start free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: 'per month',
    tagline: 'For individuals working across many documents.',
    features: [
      'Unlimited documents',
      'Brief & detailed summaries',
      'Translation to any language',
      'Knowledge graph generation',
      'Compare documents',
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  {
    name: 'Team',
    price: '$49',
    period: 'per user / month',
    tagline: 'For teams that share a workspace.',
    features: ['Everything in Pro', 'Shared workspaces', 'Priority processing', 'Admin controls'],
    cta: 'Talk to us',
    highlight: false,
  },
]

export default function Products() {
  return (
    <div className="px-6 py-16 max-w-6xl mx-auto">
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs tracking-widest uppercase text-cyan/80 border border-cyan/20 rounded-full px-3 py-1">
          Plans
        </span>
        <h1 className="font-display text-3xl md:text-4xl font-semibold mt-5">
          Simple pricing, built to grow with you
        </h1>
        <p className="text-text-muted mt-3">Start free. Upgrade when your library outgrows it.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-14">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`rounded-2xl p-8 flex flex-col ${
              p.highlight
                ? 'glass-panel border-violet/40 shadow-glow relative'
                : 'glass-panel'
            }`}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-8 text-xs bg-gradient-to-r from-violet to-cyan text-ink font-medium px-3 py-1 rounded-full">
                Most popular
              </span>
            )}
            <h3 className="font-display text-lg font-medium">{p.name}</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-semibold">{p.price}</span>
              <span className="text-text-muted text-sm">/ {p.period}</span>
            </div>
            <p className="text-text-muted text-sm mt-3">{p.tagline}</p>

            <ul className="mt-6 space-y-3 flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-cyan shrink-0" />
                  <span className="text-text-primary/90">{f}</span>
                </li>
              ))}
            </ul>

            <button
              className={`mt-8 w-full py-2.5 rounded-xl text-sm font-medium transition ${
                p.highlight
                  ? 'bg-gradient-to-r from-violet to-cyan text-ink hover:opacity-90'
                  : 'border border-white/15 text-text-primary hover:border-white/30'
              }`}
            >
              {p.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
