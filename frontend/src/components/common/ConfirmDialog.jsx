import { useEffect, useRef } from 'react'

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isPending = false,
  tone = 'danger',
}) {
  const cancelButtonRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    cancelButtonRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isPending) onCancel?.()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, isPending, onCancel])

  if (!open) return null

  const confirmStyle = tone === 'neutral'
    ? 'bg-teal-800 text-white hover:bg-teal-900 focus-visible:outline-teal-700'
    : 'bg-rose-700 text-white hover:bg-rose-800 focus-visible:outline-rose-700'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onCancel?.()
      }}
    >
      <section
        aria-describedby={description ? 'confirm-dialog-description' : undefined}
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900">{title}</h2>
        {description ? <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:opacity-60"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`min-h-10 rounded-lg px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60 ${confirmStyle}`}
            disabled={isPending}
            onClick={onConfirm}
            type="button"
          >
            {isPending ? 'Working…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
