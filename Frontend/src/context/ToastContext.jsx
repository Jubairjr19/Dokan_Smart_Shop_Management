import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const STYLES = {
  success: { icon: CheckCircle2, color: 'text-brand-emerald' },
  error: { icon: AlertTriangle, color: 'text-brand-rose' },
  info: { icon: Info, color: 'text-brand-cyan' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback(
    (message, type = 'success') => {
      const id = nextId.current++
      setToasts((list) => [...list, { id, message, type }])
      setTimeout(() => dismiss(id), 4200)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
        {toasts.map(({ id, message, type }) => {
          const { icon: Icon, color } = STYLES[type]
          return (
            <div key={id} className="glass pointer-events-auto flex animate-toast-in items-start gap-3 !bg-slate-900/80 p-3.5 pr-2.5">
              <Icon className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${color}`} aria-hidden="true" />
              <p className="flex-1 text-[13.5px] font-medium leading-snug text-frost">{message}</p>
              <button
                type="button"
                onClick={() => dismiss(id)}
                aria-label="Dismiss"
                className="rounded-lg p-1 text-frost-muted transition hover:bg-white/10 hover:text-frost"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
