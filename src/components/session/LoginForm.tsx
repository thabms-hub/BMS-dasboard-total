import { useState } from 'react'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'

interface LoginFormProps {
  onConnect: (sessionId: string) => Promise<boolean>
  error?: Error | null
  isConnecting: boolean
}

export function LoginForm({ onConnect, error, isConnecting }: LoginFormProps) {
  const [sessionId, setSessionId] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = sessionId.trim()
    if (!trimmed) return
    await onConnect(trimmed)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo mark */}
        <div className="flex flex-col items-center gap-4">
          {/* BMS-style inline SVG logo */}
          <svg
            width="56"
            height="56"
            viewBox="0 0 56 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="rounded-2xl shadow-md"
            aria-label="BMS Logo"
          >
            <defs>
              <linearGradient id="bmsLoginGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0a2558" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
            <rect width="56" height="56" rx="14" fill="url(#bmsLoginGrad)" />
            {/* Medical cross */}
            <rect x="24" y="10" width="8" height="24" rx="3" fill="white" fillOpacity="0.95" />
            <rect x="12" y="21" width="32" height="8" rx="3" fill="white" fillOpacity="0.95" />
            {/* BMS text */}
            <text
              x="28"
              y="51"
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              fontFamily="'Arial', sans-serif"
              letterSpacing="1.5"
              fill="white"
              fillOpacity="0.85"
            >
              BMS
            </text>
          </svg>
          <div className="text-center">
            <h1 className="bg-gradient-to-br from-[#0a2558] to-[#2563eb] bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
              แดชบอร์ด BMS
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              ป้อนรหัสเซสชัน BMS เพื่อเชื่อมต่อกับฐานข้อมูลโรงพยาบาล
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="ghost-lift rounded-2xl bg-card p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="session-id" className="block text-sm font-semibold text-foreground">
                รหัสเซสชัน
              </label>
              <input
                id="session-id"
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="02FA45D1-91EF-4D6E-B341-ED1436343807"
                disabled={isConnecting}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 transition-all"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/8 p-3 text-sm text-destructive">
                {error.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isConnecting || !sessionId.trim()}
              className="signature-gradient inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 active:opacity-95 disabled:pointer-events-none disabled:opacity-50 transition-all"
            >
              {isConnecting ? (
                <LoadingSpinner size="sm" message="กำลังเชื่อมต่อ..." />
              ) : (
                'เชื่อมต่อ'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          รหัสเซสชันได้รับจาก URL ของระบบ HOSxP หรือผู้ดูแลระบบ
        </p>
      </div>
    </div>
  )
}
