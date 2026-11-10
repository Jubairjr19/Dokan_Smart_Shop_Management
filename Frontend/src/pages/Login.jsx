import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, MailCheck } from 'lucide-react'
import AmbientBackground from '../components/layout/AmbientBackground.jsx'
import Button from '../components/ui/Button.jsx'
import { Field } from '../components/ui/Form.jsx'
import { LogoMark, Wordmark } from '../components/ui/Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { DEMO_ACCOUNT } from '../data/mockData.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M22.560 12.250c0-.780-.070-1.530-.200-2.250H12v4.260h5.920a5.060 5.060 0 0 1-2.200 3.320v2.770h3.570c2.080-1.920 3.270-4.740 3.270-8.100Z" />
      <path fill="#34A853" d="M12 23c2.970 0 5.460-.980 7.290-2.660l-3.570-2.770c-.980.660-2.230 1.060-3.720 1.060-2.860 0-5.290-1.930-6.160-4.530H2.180v2.840A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.840 14.090a6.600 6.600 0 0 1 0-4.180V7.070H2.180a11 11 0 0 0 0 9.860l3.660-2.840Z" />
      <path fill="#EA4335" d="M12 5.380c1.620 0 3.060.560 4.210 1.640l3.150-3.150C17.450 2.090 14.970 1 12 1A11 11 0 0 0 2.180 7.070l3.660 2.840C6.710 7.310 9.140 5.380 12 5.380Z" />
    </svg>
  )
}

/** Soft glowing rings behind the card. */
function AmbientRings() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-[5] flex items-center justify-center overflow-hidden" aria-hidden="true">
      <div className="absolute h-[620px] w-[620px] rounded-full border border-brand-cyan/[0.15] shadow-[0_0_70px_-14px_rgba(34,211,238,.28),inset_0_0_70px_-14px_rgba(34,211,238,.18)]" />
      <div className="absolute h-[860px] w-[860px] rounded-full border border-indigo-300/10 shadow-[0_0_90px_-34px_rgba(129,140,248,.32),inset_0_0_90px_-34px_rgba(129,140,248,.2)]" />
      <div className="absolute h-[1120px] w-[1120px] rounded-full border border-brand-orange/[0.08] shadow-[inset_0_0_100px_-44px_rgba(251,146,60,.26)]" />
    </div>
  )
}

function PasswordField({ label = 'Password', error, value, onChange, placeholder = 'Enter your password', autoComplete = 'current-password' }) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye
  return (
    <Field label={label} error={error} type={visible ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} inputClassName="pr-11 !h-12">
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-frost-muted transition hover:bg-white/10 hover:text-frost"
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>
    </Field>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-frost-muted">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/20" />
      Or
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/20" />
    </div>
  )
}

function SignInForm({ onForgot, onRegister, onSuccess }) {
  const { login, loginWithGoogle } = useAuth()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(null)

  const submit = (event) => {
    event.preventDefault()
    const next = {}
    if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy('password')
    setTimeout(() => {
      if (login(email, password, remember)) {
        onSuccess()
      } else {
        setBusy(null)
        setErrors({ password: 'That email and password do not match. Please try again.' })
      }
    }, 500)
  }

  const google = () => {
    setBusy('google')
    setTimeout(() => {
      loginWithGoogle()
      toast('Signed in with Google (simulated).', 'info')
      onSuccess()
    }, 600)
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-frost">Welcome back</h2>
        <p className="mt-1 text-sm text-frost-muted">Sign in to manage your shop smarter.</p>
      </div>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Email address" type="email" autoComplete="email" placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} inputClassName="!h-12" />
        <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-frost-soft">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 cursor-pointer rounded accent-[#22D3EE]" />
            Remember me
          </label>
          <button type="button" onClick={onForgot} className="text-[13px] font-semibold text-brand-cyan transition hover:text-[#67E8F9] hover:underline">
            Forgot password?
          </button>
        </div>
        <Button type="submit" variant="primary" size="lg" className="w-full" trailing={ArrowRight} loading={busy === 'password'} disabled={busy === 'google'}>
          Sign In
        </Button>
        <Divider />
        <Button size="lg" className="w-full" onClick={google} loading={busy === 'google'} disabled={busy === 'password'} icon={GoogleMark}>
          Continue with Google
        </Button>
      </form>
      <p className="mt-5 text-center text-[13px] text-frost-muted">
        Don't have an account?{' '}
        <button type="button" onClick={onRegister} className="font-semibold text-brand-cyan transition hover:text-[#67E8F9] hover:underline">
          Create account
        </button>
      </p>
      <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-xs text-frost-muted">
        Demo login:{' '}
        <button
          type="button"
          onClick={() => {
            setEmail(DEMO_ACCOUNT.email)
            setPassword(DEMO_ACCOUNT.password)
            setErrors({})
          }}
          className="font-semibold text-frost-soft underline decoration-white/30 underline-offset-2 transition hover:text-brand-cyan"
        >
          {DEMO_ACCOUNT.email} / {DEMO_ACCOUNT.password}
        </button>
      </p>
    </>
  )
}

function ForgotForm({ onBack }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  if (sent) {
    return (
      <div className="py-2 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-emerald/30 bg-brand-emerald/10 text-brand-emerald">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold text-frost">Check your email</h2>
        <p className="mt-2 text-sm leading-relaxed text-frost-muted">
          If an account exists for <strong className="text-frost-soft">{email}</strong>, a reset link is on its way. This is a simulation, so no email is actually sent.
        </p>
        <Button className="mt-5 w-full" size="lg" icon={ArrowLeft} onClick={onBack}>
          Back to sign in
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-frost">Reset your password</h2>
        <p className="mt-1 text-sm text-frost-muted">Enter your email and we'll send you a reset link.</p>
      </div>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!EMAIL_PATTERN.test(email.trim())) return setError('Enter a valid email address.')
          setSent(true)
        }}
      >
        <Field label="Email address" type="email" autoComplete="email" placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} error={error} inputClassName="!h-12" />
        <Button type="submit" variant="primary" size="lg" className="w-full" trailing={ArrowRight}>
          Send reset link
        </Button>
        <Button variant="ghost" className="w-full" icon={ArrowLeft} onClick={onBack}>
          Back to sign in
        </Button>
      </form>
    </>
  )
}

function RegisterForm({ onBack, onSuccess }) {
  const { register } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  const submit = (event) => {
    event.preventDefault()
    const next = {}
    if (!form.name.trim()) next.name = 'Enter your name.'
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Enter a valid email address.'
    if (form.password.length < 8) next.password = 'Use at least 8 characters.'
    setErrors(next)
    if (Object.keys(next).length) return
    if (register(form)) onSuccess()
    else setErrors({ email: 'An account with this email already exists.' })
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-frost">Create your account</h2>
        <p className="mt-1 text-sm text-frost-muted">Start managing your shop in minutes.</p>
      </div>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Your name" autoComplete="name" placeholder="Enter your name" value={form.name} onChange={set('name')} error={errors.name} inputClassName="!h-12" />
        <Field label="Email address" type="email" autoComplete="email" placeholder="Enter your email address" value={form.email} onChange={set('email')} error={errors.email} inputClassName="!h-12" />
        <PasswordField value={form.password} onChange={set('password')} error={errors.password} placeholder="At least 8 characters" autoComplete="new-password" />
        <Button type="submit" variant="primary" size="lg" className="w-full" trailing={ArrowRight}>
          Create account
        </Button>
      </form>
      <p className="mt-5 text-center text-[13px] text-frost-muted">
        Already have an account?{' '}
        <button type="button" onClick={onBack} className="font-semibold text-brand-cyan transition hover:text-[#67E8F9] hover:underline">
          Sign in
        </button>
      </p>
    </>
  )
}

export default function Login() {
  const [mode, setMode] = useState('login')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    document.title = 'Sign in - Dokan'
    return () => {
      document.title = 'Dokan - Smart Shop Management'
    }
  }, [])

  const onSuccess = () => navigate(location.state?.from || '/dashboard', { replace: true })

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-8">
      <AmbientBackground />
      <AmbientRings />
      <div className="glass w-full max-w-[440px] animate-modal-in !rounded-[28px] !bg-slate-900/50 px-6 py-8 shadow-2xl sm:px-9">
        <header className="mb-7 flex flex-col items-center text-center">
          <LogoMark className="h-14 w-14" />
          <h1 className="mt-4 leading-none">
            <Wordmark className="text-[34px]" />
          </h1>
          <p className="mt-2 text-[13px] text-frost-muted">Smart business. Simply managed.</p>
        </header>

        <div key={mode} className="animate-page-in">
          {mode === 'login' && <SignInForm onForgot={() => setMode('forgot')} onRegister={() => setMode('register')} onSuccess={onSuccess} />}
          {mode === 'forgot' && <ForgotForm onBack={() => setMode('login')} />}
          {mode === 'register' && <RegisterForm onBack={() => setMode('login')} onSuccess={onSuccess} />}
        </div>
      </div>
    </main>
  )
}
