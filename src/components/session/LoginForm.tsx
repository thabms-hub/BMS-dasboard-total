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
          <div className="signature-gradient flex h-14 w-14 items-center justify-center rounded-2xl shadow-md">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
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
