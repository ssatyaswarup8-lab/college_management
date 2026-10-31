import { Link } from 'react-router-dom'

export default function AuthFrame({ eyebrow, title, description, children, footer }) {
  return (
    <main className="auth-page min-h-screen text-white">
      <header className="auth-header w-full">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-12">
          <Link aria-label="CIT home" className="flex items-center gap-3" to="/">
            <img alt="CIT emblem" className="h-12 w-12 object-contain sm:h-14 sm:w-14" height="410" src="/cit-mark.png" width="360" />
            <span><span className="block text-base font-bold tracking-wide sm:text-xl">CIT</span><span className="block text-[10px] text-slate-300 sm:text-xs">Chilika Institute of Technology</span></span>
          </Link>
          <Link className="auth-home-link rounded-lg px-3 py-2 text-sm font-semibold" to="/">Back to home</Link>
        </div>
      </header>

      <div className="auth-content relative z-10 mx-auto grid min-h-[calc(100vh-150px)] w-full max-w-7xl items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_minmax(380px,0.78fr)] lg:gap-16 lg:px-12 lg:py-14">
        <section className="hidden max-w-xl lg:block">
          <p className="auth-eyebrow text-xs font-bold uppercase tracking-[0.18em]">{eyebrow}</p>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">{title}</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">{description}</p>
          <div className="auth-highlights mt-9 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ['▦', 'Timetables', 'Find the schedule for your CIT role.'],
              ['⌂', 'Campus spaces', 'See room and venue information.'],
              ['↗', 'Schedule updates', 'Keep up with relevant changes.'],
            ].map(([icon, label, copy]) => <div className="auth-highlight flex items-center gap-3 rounded-xl border px-3 py-3" key={label}>
              <span aria-hidden="true" className="auth-highlight-icon grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg">{icon}</span>
              <span><span className="block text-sm font-semibold text-white">{label}</span><span className="auth-highlight-copy mt-0.5 block text-xs leading-5">{copy}</span></span>
            </div>)}
          </div>
        </section>

        <section aria-label={eyebrow} className="auth-panel mx-auto w-full max-w-md rounded-2xl border p-6 shadow-2xl sm:p-8">
          {children}
          {footer ? <div className="auth-panel-footer mt-6 border-t pt-5 text-center text-sm">{footer}</div> : null}
        </section>
      </div>
      <footer className="auth-footer mx-auto max-w-7xl px-5 pb-5 text-xs text-slate-400 sm:px-8 lg:px-12">CIT · Smarter scheduling. Better campus management.</footer>
    </main>
  )
}
