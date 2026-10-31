import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthFrame from '../components/auth/AuthFrame.jsx'
import useAuth from '../hooks/useAuth.js'
import { getFriendlyError } from '../utils/errorHandler.js'

export default function Login() {
  const { login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await login({ email: email.trim(), password })
      const destination = location.state?.from?.pathname
      if (destination) navigate(destination, { replace: true })
    } catch (requestError) {
      setError(getFriendlyError(requestError, 'Unable to sign in. Check your details and try again.').message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFrame
      description="Sign in to see the timetable, rooms, and schedule information relevant to your CIT role."
      eyebrow="CIT CampusFlow access"
      footer={<><span className="text-slate-300">Need an account?</span> <Link className="font-semibold text-sky-300 hover:text-sky-200" to="/register">Register</Link></>}
      title="The right campus information, in one place."
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="auth-eyebrow text-xs font-bold uppercase tracking-[0.16em]">Welcome back</p>
        <span className="auth-secure-label inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide"><span aria-hidden="true">✓</span> CIT account</span>
      </div>
      <h2 className="text-3xl font-bold tracking-tight text-white">Sign in</h2>
      <p className="auth-muted mt-2 text-sm leading-6">Use the CIT account provided to you.</p>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="auth-label mb-1.5 block text-sm font-medium" htmlFor="email">Email address</label>
          <input autoComplete="username" className="auth-input min-h-12 w-full rounded-lg border px-3.5 text-sm" id="email" name="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@cit.edu" required type="email" value={email} />
        </div>
        <div>
          <label className="auth-label mb-1.5 block text-sm font-medium" htmlFor="password">Password</label>
          <input autoComplete="current-password" className="auth-input min-h-12 w-full rounded-lg border px-3.5 text-sm" id="password" name="password" onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required type="password" value={password} />
        </div>
        {error ? <p className="auth-error rounded-lg border px-3 py-2.5 text-sm" role="alert">{error}</p> : null}
        <button className="auth-submit flex min-h-12 w-full items-center justify-center rounded-lg px-4 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? 'Signing in…' : 'Sign in to CampusFlow'}</button>
      </form>
      <p className="auth-muted mt-5 text-center text-xs leading-5">Your available workspace depends on your CIT role.</p>
    </AuthFrame>
  )
}
