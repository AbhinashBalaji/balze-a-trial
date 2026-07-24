const CAPABILITIES = [
  { title: 'Read anything', desc: 'PDFs, Word docs, and text files are parsed the moment you upload them.' },
  { title: 'Search by meaning', desc: 'Semantic search finds the right passage even when the wording differs.' },
  { title: 'Answer questions', desc: 'A chat grounded in the document itself — no wandering off-topic.' },
  { title: 'Summarize', desc: 'Brief, three-sentence takeaways or fully structured detailed breakdowns.' },
  { title: 'Translate', desc: 'Full documents, translated into any language, structure intact.' },
  { title: 'Map relationships', desc: 'A knowledge graph of the people, concepts, and links inside a document.' },
  { title: 'Compare', desc: 'Two documents, side by side — similarities, differences, and a verdict.' },
]

export default function About() {
  return (
    <div className="px-6 py-16 max-w-4xl mx-auto">
      <div className="text-center">
        <span className="text-xs tracking-widest uppercase text-cyan/80 border border-cyan/20 rounded-full px-3 py-1">
          About AthenaIQ
        </span>
        <h1 className="font-display text-3xl md:text-4xl font-semibold mt-5">
          A reading partner for your documents
        </h1>
        <p className="text-text-muted mt-4 leading-relaxed">
          AthenaIQ is built for anyone who spends more time searching through documents
          than actually reading them — researchers, analysts, students, teams drowning
          in PDFs. Upload a file, and AthenaIQ turns it into something you can search,
          question, summarize, translate, and understand at a glance.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mt-14">
        {CAPABILITIES.map((c) => (
          <div key={c.title} className="glass-panel rounded-2xl p-6">
            <h3 className="font-display font-medium">{c.title}</h3>
            <p className="text-text-muted text-sm mt-2 leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
