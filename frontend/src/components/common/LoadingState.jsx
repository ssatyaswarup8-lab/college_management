export default function LoadingState({ label = 'Loading', className = '' }) {
  return (
    <div
      className={`flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-6 text-center ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-teal-700"
      />
      <span className="text-sm font-medium text-slate-600">{label}…</span>
    </div>
  )
}
