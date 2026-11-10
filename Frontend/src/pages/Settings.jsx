import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, CreditCard, KeyRound, Landmark, LogOut, QrCode, RotateCcw, ShieldCheck, Smartphone, Store } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import GlassCard, { CardHeader } from '../components/ui/GlassCard.jsx'
import Badge from '../components/ui/Badge.jsx'
import { ConfirmDialog } from '../components/ui/Modal.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { Field, Toggle } from '../components/ui/Form.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { stockStatus, useStore } from '../context/StoreContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { initials } from '../lib/format.js'

function ProfileCard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <GlassCard className="flex flex-wrap items-center gap-4 p-5">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan/50 to-indigo-500/50 text-lg font-bold text-frost ring-1 ring-white/25">{initials(user?.name)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-bold text-frost">{user?.name}</p>
        <p className="truncate text-[13px] text-frost-muted">{user?.email}</p>
        <Badge tone="cyan" className="mt-1.5">
          {user?.role}
        </Badge>
      </div>
      <Button
        variant="danger"
        icon={LogOut}
        onClick={() => {
          logout()
          navigate('/login')
        }}
      >
        Logout
      </Button>
    </GlassCard>
  )
}

function ShopInformation() {
  const { settings, dispatch } = useStore()
  const { toast } = useToast()
  const [form, setForm] = useState(settings.shop)
  const [error, setError] = useState('')
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  const submit = (event) => {
    event.preventDefault()
    if (!form.name.trim()) return setError('Enter your shop name.')
    setError('')
    dispatch({ type: 'settings/update', changes: { shop: form } })
    toast('Shop information saved.')
  }

  return (
    <GlassCard className="p-5">
      <CardHeader title="Shop Information" subtitle="Printed on your invoices and SMS reminders" action={<Store className="h-[18px] w-[18px] text-frost-muted" aria-hidden="true" />} />
      <form onSubmit={submit} noValidate className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Shop name" value={form.name} onChange={set('name')} error={error} />
        <Field label="Phone" type="tel" value={form.phone} onChange={set('phone')} />
        <Field label="Email" type="email" value={form.email} onChange={set('email')} />
        <Field className="sm:col-span-2" label="Address" value={form.address} onChange={set('address')} />
        <div className="sm:col-span-2">
          <Button type="submit" variant="primary">
            Save Shop Information
          </Button>
        </div>
      </form>
    </GlassCard>
  )
}

function SmsReminders() {
  const { settings, dispatch } = useStore()
  const { sms } = settings
  const update = (changes) => dispatch({ type: 'settings/update', changes: { sms: { ...sms, ...changes } } })

  return (
    <GlassCard className="p-5">
      <CardHeader title="SMS Reminders" subtitle="Sent through the Twilio simulation on the Credit Records page" />
      <div className="mt-4 space-y-4">
        <Toggle label="SMS reminders" description="Allow customer payment reminders by SMS." checked={sms.enabled} onChange={(enabled) => update({ enabled })} />
        <Toggle label="Remind before the due date" checked={sms.beforeDue} disabled={!sms.enabled} onChange={(beforeDue) => update({ beforeDue })} />
        <Toggle label="Remind daily once overdue" checked={sms.overdueDaily} disabled={!sms.enabled} onChange={(overdueDaily) => update({ overdueDaily })} />
        <Field
          label="Days before the due date"
          type="number"
          min="1"
          max="30"
          inputMode="numeric"
          disabled={!sms.enabled || !sms.beforeDue}
          value={sms.daysBefore}
          onChange={(e) => update({ daysBefore: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })}
        />
        <div>
          <label htmlFor="sms-template" className="field-label">
            Message template
          </label>
          <textarea id="sms-template" rows={3} disabled={!sms.enabled} value={sms.template} onChange={(e) => update({ template: e.target.value })} className="field !h-auto resize-y py-3 leading-relaxed disabled:opacity-50" />
          <p className="mt-1.5 text-xs text-frost-muted">Placeholders: {'{name}'}, {'{shop}'}, {'{amount}'}, {'{date}'}</p>
        </div>
      </div>
    </GlassCard>
  )
}

function AlertsAndSecurity() {
  const { settings, products, dispatch } = useStore()
  const { toast } = useToast()
  const update = (changes) => dispatch({ type: 'settings/update', changes })
  const flagged = products.filter((p) => stockStatus(p.stock, settings.lowStockThreshold) !== 'in').length

  return (
    <GlassCard className="p-5">
      <CardHeader title="Alerts & Security" subtitle="What Dokan warns you about, and how it protects you" />
      <div className="mt-4 space-y-4">
        <Toggle label="Low stock alerts" description="Add a notification when a product falls to the threshold." checked={settings.lowStockAlerts} onChange={(lowStockAlerts) => update({ lowStockAlerts })} />
        <Field
          label="Low stock threshold (units)"
          type="number"
          min="1"
          inputMode="numeric"
          value={settings.lowStockThreshold}
          onChange={(e) => update({ lowStockThreshold: Math.max(1, Number(e.target.value) || 1) })}
          hint={`${flagged} ${flagged === 1 ? 'product is' : 'products are'} at or below this level right now, including any that are out of stock.`}
        />
        <Toggle label="Payment reminders" description="Notify me when a supplier purchase leaves money due." checked={settings.paymentReminders} onChange={(paymentReminders) => update({ paymentReminders })} />
        <Toggle
          label="Two-factor authentication"
          description="Ask for a one-time code at sign-in. Simulated in this demo."
          checked={settings.twoFactor}
          onChange={(twoFactor) => {
            update({ twoFactor })
            toast(`Two-factor authentication ${twoFactor ? 'on' : 'off'} (simulated).`, 'info')
          }}
        />
        <Toggle label="Compact interface" description="Tighter table rows, so more fits on screen." checked={settings.compact} onChange={(compact) => update({ compact })} />
      </div>
      <p className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
        <ShieldCheck className="h-5 w-5 shrink-0 text-brand-emerald" aria-hidden="true" />
        <span className="text-xs text-frost-muted">
          <strong className="block text-[13px] font-bold text-frost">You're in safe hands</strong>
          Current session • Desktop • Sylhet, Bangladesh
        </span>
      </p>
    </GlassCard>
  )
}

const METHOD_ICONS = { bKash: Smartphone, Nagad: Smartphone, Rocket: Smartphone, Upay: Smartphone, 'Bangla QR': QrCode, 'Card API': CreditCard }

function PaymentMethodTile({ name, method, onChange }) {
  const [test, setTest] = useState(null) // null, 'testing', 'ok', or 'missing'
  const Icon = METHOD_ICONS[name] || Landmark

  const runTest = () => {
    if (!method.account.trim()) return setTest('missing')
    setTest('testing')
    setTimeout(() => setTest('ok'), 700)
  }

  return (
    <div className={`rounded-xl border p-4 transition duration-200 ${method.enabled ? 'border-brand-cyan/30 bg-brand-cyan/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.07] text-brand-cyan">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <Toggle label={name} checked={method.enabled} onChange={(enabled) => onChange({ enabled })} />
        </div>
      </div>
      <Field
        className="mt-3"
        label={method.label}
        value={method.account}
        disabled={!method.enabled}
        placeholder={method.enabled ? `Enter ${method.label.toLowerCase()}` : 'Turn on to configure'}
        onChange={(e) => {
          onChange({ account: e.target.value })
          setTest(null)
        }}
      />
      <div className="mt-2.5 flex min-h-9 items-center justify-between gap-2">
        <span aria-live="polite" className="text-xs">
          {test === 'ok' && (
            <span className="flex items-center gap-1 font-semibold text-[#6EE7B7]">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Connected (simulated)
            </span>
          )}
          {test === 'missing' && <span className="font-semibold text-[#FDA4B4]">Add the {method.label.toLowerCase()} first.</span>}
        </span>
        <Button size="sm" disabled={!method.enabled} loading={test === 'testing'} onClick={runTest}>
          Test
        </Button>
      </div>
    </div>
  )
}

function PaymentMethods() {
  const { settings, dispatch } = useStore()
  const { paymentMethods } = settings
  const update = (name, changes) =>
    dispatch({
      type: 'settings/update',
      changes: { paymentMethods: { ...paymentMethods, [name]: { ...paymentMethods[name], ...changes } } },
    })

  return (
    <GlassCard className="p-5">
      <CardHeader title="Payment Methods" subtitle="Methods you turn on appear on the Sales and Credit Records screens" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(paymentMethods).map(([name, method]) => (
          <PaymentMethodTile key={name} name={name} method={method} onChange={(changes) => update(name, changes)} />
        ))}
      </div>
    </GlassCard>
  )
}

function ChangePassword() {
  const { changePassword } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  const submit = (event) => {
    event.preventDefault()
    const next = {}
    if (!form.current) next.current = 'Enter your current password.'
    if (form.next.length < 8) next.next = 'Use at least 8 characters.'
    if (form.confirm !== form.next) next.confirm = 'The passwords do not match.'
    if (!Object.keys(next).length && !changePassword(form.current, form.next)) next.current = 'That is not your current password.'
    setErrors(next)
    if (Object.keys(next).length) return
    setForm({ current: '', next: '', confirm: '' })
    toast('Password changed.')
  }

  return (
    <GlassCard className="p-5">
      <CardHeader title="Change Password" subtitle="Use at least 8 characters" action={<KeyRound className="h-[18px] w-[18px] text-frost-muted" aria-hidden="true" />} />
      <form onSubmit={submit} noValidate className="mt-4 space-y-4">
        <Field label="Current password" type="password" autoComplete="current-password" value={form.current} onChange={set('current')} error={errors.current} />
        <Field label="New password" type="password" autoComplete="new-password" value={form.next} onChange={set('next')} error={errors.next} />
        <Field label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" variant="primary">
          Change Password
        </Button>
      </form>
    </GlassCard>
  )
}

function DemoData() {
  const { dispatch } = useStore()
  const { toast } = useToast()
  const [confirming, setConfirming] = useState(false)
  return (
    <GlassCard className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-frost">Demo Data</h2>
        <p className="mt-0.5 text-[13px] text-frost-muted">Changes are saved in this browser. Reset to return to the original sample data.</p>
      </div>
      <Button icon={RotateCcw} onClick={() => setConfirming(true)}>
        Reset Demo Data
      </Button>
      {confirming && (
        <ConfirmDialog
          title="Reset demo data?"
          message="All products, sales, purchases, customers and settings you changed will return to the original sample data. Your login stays the same."
          confirmLabel="Reset"
          onClose={() => setConfirming(false)}
          onConfirm={() => {
            dispatch({ type: 'demo/reset' })
            setConfirming(false)
            toast('Demo data reset.')
          }}
        />
      )}
    </GlassCard>
  )
}

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Make Dokan feel like your business." />
      <ProfileCard />
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <ShopInformation />
          <SmsReminders />
        </div>
        <div className="space-y-4">
          <AlertsAndSecurity />
          <ChangePassword />
        </div>
      </div>
      <PaymentMethods />
      <DemoData />
    </>
  )
}
