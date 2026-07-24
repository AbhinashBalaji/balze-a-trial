import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { Pill } from '../components/Pill.jsx'
import { useState } from 'react'

// ORIGINAL FEATURES RESTORED
const FEATURES = [
  { title: 'Semantic search', desc: 'Find the right passage by meaning, not just keywords, across every file you upload.' },
  { title: 'Ask your document', desc: 'Open any file and chat with it directly. Answers stay grounded in the source text.' },
  { title: 'Brief or detailed summaries', desc: 'Get the gist in three sentences, or a full structured breakdown — your call.' },
  { title: 'Translate on demand', desc: 'Turn any document into another language while keeping its structure intact.' },
  { title: 'Knowledge graphs', desc: 'See the people, concepts, and relationships inside a document, mapped visually.' },
  { title: 'Compare documents', desc: 'Put two files side by side and get their similarities, differences, and a verdict.' },
]

export default function Home() {
  const { user } = useAuth()
  const [hovering, setHovering] = useState(false)

  return (
    <div className="relative w-full min-h-screen bg-transparent overflow-hidden flex flex-col">

      {/* Hero */}
      <section className="relative z-10 text-center px-4 flex flex-col items-center justify-center min-h-[90vh]">
        
        {/* ORIGINAL TEXT, Skal Styling */}
        <Pill className="mb-6">DOCUMENT INTELLIGENCE</Pill>

        <h1 className="font-serif-elegant text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-white mb-8 leading-tight tracking-tight mt-4">
          Every document has a <br/>
          <span className="italic text-gray-300">mind of its own.</span>
        </h1>

        <p className="font-mono-strict text-xs sm:text-sm text-gray-400 max-w-2xl mx-auto mb-14 leading-relaxed tracking-wide">
          AthenaIQ reads, searches, summarizes, translates, and maps the ideas inside <br className="hidden md:block"/>
          your files — so you can ask a question instead of skimming a hundred pages.
        </p>

        {/* ORIGINAL BUTTONS, Skal Styling */}
        <div className="flex flex-col sm:flex-row items-center gap-6 mt-14">
          <Link
            to={user ? '/workspace' : '/login'}
            className="angled-button text-sm"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            [{user ? 'GO TO WORKSPACE' : 'GET STARTED FREE'}]
          </Link>
          <Link
            to="/about"
            className="font-mono-strict text-sm font-bold tracking-widest text-white border border-white/20 hover:border-white/50 px-8 py-3 bg-white/5 transition-all"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            SEE WHAT IT CAN DO
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-28">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white/5 border border-white/10 rounded-none p-8 hover:border-[#FACC15]/50 transition-colors group"
              >
                <div className="w-3 h-3 bg-[#FACC15] mb-6 group-hover:shadow-[0_0_10px_#FACC15] transition-shadow" />
                <h3 className="font-serif-elegant text-xl text-white mb-3">{f.title}</h3>
                <p className="font-mono-strict text-xs text-gray-400 leading-relaxed tracking-wide">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 pb-32">
        <div className="max-w-4xl mx-auto border border-white/10 bg-black/50 backdrop-blur-sm p-12 md:p-20 text-center relative overflow-hidden">
          <h2 className="font-serif-elegant text-3xl md:text-5xl text-white mb-6">
            Upload a file. <span className="italic text-gray-300">Start asking questions.</span>
          </h2>
          <p className="font-mono-strict text-xs md:text-sm text-gray-400 mt-4 mb-10 tracking-wide">
            No setup, no learning curve — just your documents, understood.
          </p>
          <Link
            to={user ? '/workspace' : '/login'}
            className="angled-button text-sm"
          >
            [{user ? 'OPEN WORKSPACE' : 'CREATE FREE ACCOUNT'}]
          </Link>
        </div>
      </section>
    </div>
  )
}
