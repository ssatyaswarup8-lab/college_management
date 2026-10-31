import { Link } from 'react-router-dom'

const features = [
  { icon: '▦', title: 'Timetable management', text: 'View schedules for groups, faculty, and rooms.', color: 'emerald' },
  { icon: '▤', title: 'Examination scheduling', text: 'Coordinate exams, groups, and room allocations.', color: 'violet' },
  { icon: '⌂', title: 'Smart venue booking', text: 'Find rooms and review campus venue requests.', color: 'orange' },
  { icon: '!', title: 'Conflict detection', text: 'See scheduling conflicts and their affected sessions.', color: 'rose' },
  { icon: '⟳', title: 'Scenario planning', text: 'Explore proposed changes before applying them.', color: 'cyan' },
  { icon: '✳', title: 'AI assistant', text: 'Describe a schedule request and review its proposal.', color: 'blue' },
]

const datasetStats = [
  { icon: '⌂', value: '27', label: 'Rooms', note: 'Classrooms, labs, halls', color: 'text-sky-300' },
  { icon: '●', value: '40', label: 'Faculty members', color: 'text-violet-300' },
  { icon: '◆', value: '14', label: 'Student groups', note: 'Across 3 years', color: 'text-amber-300' },
  { icon: '▣', value: '62', label: 'Courses', color: 'text-blue-300' },
  { icon: '☷', value: '189', label: 'Sessions', color: 'text-cyan-300' },
  { icon: '▤', value: '41', label: 'Midterm exams', color: 'text-sky-300' },
  { icon: '★', value: '25', label: 'Venue requests', color: 'text-indigo-300' },
]

function FeatureCard({ icon, title, text, color }) {
  const accents = {
    emerald: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300',
    violet: 'border-violet-500/60 bg-violet-500/10 text-violet-300',
    orange: 'border-orange-500/60 bg-orange-500/10 text-orange-300',
    rose: 'border-rose-500/60 bg-rose-500/10 text-rose-300',
    cyan: 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300',
    blue: 'border-blue-500/60 bg-blue-500/10 text-blue-300',
  }
  return (
    <article className={`landing-feature-card group min-w-0 rounded-2xl border p-4 transition duration-200 hover:-translate-y-1 sm:p-5 ${accents[color]}`} data-accent={color}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={`landing-feature-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${accents[color]}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-5 text-white sm:text-base">{title}</h2>
          <p className="mt-2 text-xs leading-5 text-slate-300 sm:text-sm">{text}</p>
        </div>
        <span aria-hidden="true" className="mt-1 text-lg text-white/55 transition group-hover:translate-x-1">›</span>
      </div>
    </article>
  )
}

export default function Landing() {
  return (
    <main className="landing-shell min-h-screen overflow-hidden text-white">
      <header className="landing-header relative z-20 border-b border-white/10">
        <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center justify-between gap-5 px-5 sm:min-h-[84px] sm:px-8 xl:px-12">
          <Link aria-label="Chilika Institute of Technology home" className="flex shrink-0 items-center gap-3" to="/">
            <img alt="CIT institute emblem" className="h-12 w-12 object-contain sm:h-14 sm:w-14" height="410" src="/cit-mark.png" width="360" />
            <span>
              <span className="landing-header-brand block text-base font-extrabold tracking-wide sm:text-xl">CIT</span>
              <span className="landing-header-subtitle block text-[10px] sm:text-xs">Chilika Institute of Technology</span>
            </span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-5 text-xs font-medium text-slate-300 lg:flex xl:gap-8 xl:text-sm">
            <a className="border-b-2 border-sky-400 py-2.5 text-sky-300" href="#home">Home</a>
            <a className="py-2.5 transition hover:text-white" href="#features">Timetable</a>
            <a className="py-2.5 transition hover:text-white" href="#features">Examinations</a>
            <a className="py-2.5 transition hover:text-white" href="#features">Venue booking</a>
            <a className="py-2.5 transition hover:text-white" href="#features">AI assistant</a>
          </nav>
          <Link className="landing-signin inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border px-4 text-xs font-semibold transition sm:px-5 sm:text-sm" to="/login">Sign in <span className="ml-2" aria-hidden="true">→</span></Link>
        </div>
      </header>

      <section className="landing-hero relative isolate" id="home">
        <div aria-hidden="true" className="landing-hero-art absolute inset-0" />
        <div className="landing-hero-content relative mx-auto grid min-h-[480px] max-w-[1600px] items-center gap-10 px-5 py-14 sm:px-8 sm:py-16 lg:min-h-[460px] lg:grid-cols-[minmax(0,1fr)_310px] lg:px-12 lg:py-12 xl:min-h-[490px] xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="max-w-[760px]">
            <p className="landing-badge inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium sm:text-sm">
              <span>Integrated</span><span className="text-sky-400">•</span><span>Intelligent</span><span className="text-sky-400">•</span><span>Explainable</span>
            </p>
            <p className="mt-6 text-[2.7rem] font-black leading-none tracking-[-0.045em] sm:text-6xl xl:text-7xl">CIT <span className="landing-brand-accent">CAMPUSFLOW</span></p>
            <h1 className="mt-3 max-w-3xl text-2xl font-bold leading-tight tracking-tight sm:text-4xl xl:text-[2.7rem]">When schedules change, the whole campus feels it.</h1>
            <p className="landing-hero-kicker mt-3 text-sm font-semibold sm:text-base">Campus Scheduling &amp; Venue Management System</p>
            <p className="landing-hero-copy mt-2 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">Coordinate timetables, exams, and venues in one place. Give every campus role a clear view of what is happening and help administrators understand a change before it is applied.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="landing-cta-primary inline-flex min-h-12 items-center gap-3 rounded-xl px-5 text-sm font-bold shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-7" to="/login"><span aria-hidden="true">▦</span> Get started <span aria-hidden="true">›</span></Link>
              <a className="landing-cta-secondary inline-flex min-h-12 items-center gap-3 rounded-xl border px-5 text-sm font-semibold transition sm:px-7" href="#features">Explore features <span aria-hidden="true">↓</span></a>
            </div>
          </div>

          <aside className="landing-operations-panel rounded-2xl border p-5 shadow-2xl backdrop-blur-md sm:p-6 lg:mt-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <span className="landing-operations-icon grid h-11 w-11 place-items-center rounded-xl text-2xl" aria-hidden="true">▦</span>
              <div><h2 className="text-sm font-bold sm:text-base">Smoother campus operations</h2><p className="mt-1 text-xs">One connected workspace</p></div>
            </div>
            <ul className="mt-4 space-y-3.5 text-xs sm:text-sm">
              {['Timetable management', 'Examination scheduling', 'Venue request workflows', 'Conflict and impact review', 'Scenario planning'].map((item) => <li className="flex items-center gap-3" key={item}><span aria-hidden="true" className="landing-check grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold">✓</span>{item}</li>)}
            </ul>
          </aside>
        </div>
      </section>

      <section aria-label="CampusFlow features" className="relative z-10 mx-auto grid max-w-[1600px] gap-3 px-5 pb-7 sm:grid-cols-2 sm:px-8 lg:-mt-1 lg:grid-cols-3 lg:px-10 xl:grid-cols-6" id="features">
        {features.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
      </section>

      <section aria-label="Starter dataset coverage" className="landing-dataset mx-auto mb-8 max-w-[1600px] px-5 sm:px-8 lg:px-10">
        <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-r from-[#071d38] via-[#082345] to-[#071d38] px-3 py-4 shadow-lg shadow-black/15 sm:px-5 sm:py-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-sky-200">Starter dataset coverage</h2>
            <p className="text-[10px] text-slate-400">Counts from the supplied CIT public dataset</p>
          </div>
          <dl className="grid grid-cols-2 divide-x divide-y divide-blue-300/15 sm:grid-cols-4 lg:grid-cols-7 lg:divide-y-0">
            {datasetStats.map((stat) => <div className="landing-stat flex min-h-[76px] items-center gap-3 px-2 py-3 sm:px-4" key={stat.label}>
              <span aria-hidden="true" className={`landing-stat-icon text-2xl ${stat.color}`}>{stat.icon}</span>
              <div><dt className="text-[11px] font-medium text-slate-200 sm:text-xs">{stat.label}</dt><dd className="mt-1 text-xl font-bold leading-none sm:text-2xl">{stat.value}</dd>{stat.note ? <p className="mt-1 text-[9px] text-slate-400 sm:text-[10px]">{stat.note}</p> : null}</div>
            </div>)}
          </dl>
        </div>
      </section>

      <footer className="landing-footer border-t border-white/10">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-5 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <p><span className="font-semibold text-slate-200">CIT CampusFlow</span> · Smarter scheduling. Better campus management.</p>
          <p>Chilika Institute of Technology</p>
        </div>
      </footer>
    </main>
  )
}
