import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthFrame from '../components/auth/AuthFrame.jsx'

export default function Register() {
  const [notice, setNotice] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setNotice(true)
  }

  return (
    <AuthFrame
      description="CampusFlow accounts are connected to CIT roles, so access is set up by your campus administrator."
      eyebrow="CIT CampusFlow access"
      footer={<><span className="text-slate-300">Already have an account?</span> <Link className="font-semibold text-sky-300 hover:text-sky-200" to="/login">Sign in</Link></>}
      title="Get access to your campus workspace."
    >
      <p className="auth-eyebrow text-xs font-bold uppercase tracking-[0.16em]">New to CampusFlow?</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Register</h2>
      <p className="auth-muted mt-2 text-sm leading-6">Request a CIT account to access your campus workspace.</p>

      <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="auth-label mb-1.5 block text-sm font-medium" htmlFor="register-name">Full name</label>
          <input autoComplete="name" className="auth-input min-h-11 w-full rounded-lg border px-3.5 text-sm" id="register-name" name="name" placeholder="Your full name" required />
        </div>
        <div>
          <label className="auth-label mb-1.5 block text-sm font-medium" htmlFor="register-email">CIT email address</label>
          <input autoComplete="email" className="auth-input min-h-11 w-full rounded-lg border px-3.5 text-sm" id="register-email" name="email" placeholder="you@cit.edu" required type="email" />
        </div>
        <div>
          <label className="auth-label mb-1.5 block text-sm font-medium" htmlFor="register-role">Campus role</label>
          <select className="auth-input min-h-11 w-full rounded-lg border px-3.5 text-sm" defaultValue="" id="register-role" name="role" required>
            <option disabled value="">Select your role</option>
            <option value="STUDENT">Student</option>
            <option value="FACULTY">Faculty</option>
            <option value="CLUB_REPRESENTATIVE">Club representative</option>
            <option value="DEPARTMENT_COORDINATOR">Department coordinator</option>
          </select>
        </div>
        {notice ? <p className="auth-notice rounded-lg border px-3 py-2.5 text-sm leading-5" role="status">Self-registration is not available through the current service. Please contact your CIT administrator to request an account.</p> : null}
        <button className="auth-submit flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-bold transition" type="submit">Request an account</button>
      </form>
      <p className="auth-muted mt-4 text-xs leading-5">Account creation is managed by CIT. This page does not submit or store your information.</p>
    </AuthFrame>
  )
}
