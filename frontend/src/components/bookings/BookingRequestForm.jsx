export default function BookingRequestForm({ onSubmit, isPending = false, error }) {
  return (
    <form className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); onSubmit?.(new FormData(event.currentTarget).get('requestText')) }}>
      <label className="block text-sm font-semibold text-slate-900" htmlFor="booking-request-text">Describe the venue request</label>
      <p className="mt-1 text-sm leading-6 text-slate-600">Include a date or day, time, attendance, venue needs, and purpose. You can review and edit the interpreted details before submitting.</p>
      <textarea className="mt-4 min-h-32 w-full resize-y rounded-lg border border-slate-300 px-3.5 py-3 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15" id="booking-request-text" name="requestText" placeholder="For example: Need a seminar hall Thursday from 6 to 8 pm for 100 people, with a microphone." required />
      {error ? <p className="mt-3 text-sm font-medium text-rose-700" role="alert">{error}</p> : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">The assistant prepares a draft; it does not approve or reserve a room.</p>
        <button className="min-h-10 rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white hover:bg-teal-950 disabled:cursor-wait disabled:opacity-60" disabled={isPending} type="submit">{isPending ? 'Understanding request…' : 'Understand request'}</button>
      </div>
    </form>
  )
}
