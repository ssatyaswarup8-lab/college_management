export default function ErrorState({
  title = 'Unable to load this information',
  message = 'Something went wrong. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  className = '',
}) {
  return (
    <section
      className={`rounded-xl border border-rose-200 bg-rose-50/70 px-6 py-8 text-center ${className}`.trim()}
      role="alert"
    >
      <div aria-hidden="true" className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-rose-100 text-rose-700">
        <span className="text-lg font-bold">!</span>
      </div>
      <h2 className="mt-3 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-700">{message}</p>
      {onRetry ? (
        <button
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          onClick={onRetry}
          type="button"
        >
          {retryLabel}
        </button>
      ) : null}
    </section>
  )
}
