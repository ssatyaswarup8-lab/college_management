import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingApi } from '../../api/booking.api.js'
import { useToast } from '../common/ToastProvider.jsx'
import ConfirmDialog from '../common/ConfirmDialog.jsx'
import ErrorState from '../common/ErrorState.jsx'
import AssistantComposer from './AssistantComposer.jsx'
import AssistantMessage from './AssistantMessage.jsx'
import { getFriendlyError } from '../../utils/errorHandler.js'

function unwrap(response) { return response?.data?.data ?? response?.data ?? response }
function serializableDraft(draft, rawText) {
  const { followUp: _followUp, aiAssisted: _aiAssisted, requiresUserReview: _review, ...fields } = draft
  return { ...fields, rawText }
}

export default function AssistantPanel() {
  const client = useQueryClient()
  const { toast } = useToast()
  const [prompt, setPrompt] = useState('')
  const [draft, setDraft] = useState(null)
  const [draftText, setDraftText] = useState('')
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const parse = useMutation({ mutationFn: (text) => bookingApi.parseRequest({ text }) })
  const create = useMutation({ mutationFn: bookingApi.create, onSuccess: () => client.invalidateQueries({ queryKey: ['bookings'] }) })

  async function parseRequest(text) {
    setPrompt(text)
    setDraft(null)
    setError('')
    try {
      const result = unwrap(await parse.mutateAsync(text))
      const parsed = result.draft ?? result
      setDraft(parsed)
      setDraftText(JSON.stringify(serializableDraft(parsed, text), null, 2))
    } catch (err) { setError(getFriendlyError(err, 'Unable to parse the venue request.').message) }
  }

  async function submitDraft() {
    setError('')
    try {
      const payload = JSON.parse(draftText)
      await create.mutateAsync(payload)
      setConfirm(false)
      setDraft(null)
      toast('Booking request submitted for review.', { type: 'success' })
      setDraftText('')
    } catch (err) {
      setError(err instanceof SyntaxError ? 'The draft must be valid JSON. Review your edits and try again.' : getFriendlyError(err, 'The backend could not submit this booking request.').message)
      setConfirm(false)
    }
  }

  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
    <div className="space-y-3" role="log" aria-label="Assistant conversation"><AssistantMessage message={{ role: 'assistant', content: 'Describe a venue booking. I can turn it into an editable booking draft; the backend still checks availability and booking rules after you submit it.' }} />{prompt ? <AssistantMessage message={{ role: 'user', content: prompt }} /> : null}{draft?.followUp ? <AssistantMessage message={{ role: 'assistant', content: draft.followUp }} /> : null}</div>
    {error ? <ErrorState title="Booking assistant needs attention" message={error} className="py-3" /> : null}
    <AssistantComposer onSend={parseRequest} isPending={parse.isPending} disabled={create.isPending} />
    {draft ? <div className="space-y-3 rounded-xl border border-teal-200 bg-white p-4"><div><h3 className="text-sm font-semibold text-slate-900">Review and edit the parsed booking</h3><p className="mt-1 text-xs leading-5 text-slate-600">The assistant may leave fields incomplete. Complete the required fields and submit to let the backend validate the request.</p></div><textarea aria-label="Editable booking request JSON" className="min-h-64 w-full rounded-lg border border-slate-300 p-3 font-mono text-xs leading-5" onChange={(event) => setDraftText(event.target.value)} spellCheck="false" value={draftText} /><div className="flex justify-end"><button className="min-h-10 rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={create.isPending} onClick={() => setConfirm(true)} type="button">Submit booking request</button></div></div> : null}
    <ConfirmDialog open={confirm} title="Submit this booking request?" description="The backend will validate the request and save it for the authorized booking decision workflow." confirmLabel="Submit request" isPending={create.isPending} onCancel={() => setConfirm(false)} onConfirm={submitDraft} tone="neutral" />
  </section>
}
