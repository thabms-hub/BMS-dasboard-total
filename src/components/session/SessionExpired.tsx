import { LoginForm } from './LoginForm'

interface SessionExpiredProps {
  onReconnect: (sessionId: string) => Promise<boolean>
  error?: Error | null
  isConnecting: boolean
}

export function SessionExpired({ onReconnect, error, isConnecting }: SessionExpiredProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <svg className="h-6 w-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground">เซสชันหมดอายุ</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            เซสชัน BMS ของคุณหมดอายุแล้ว กรุณาป้อนรหัสเซสชันใหม่เพื่อเชื่อมต่อ
          </p>
        </div>

        <LoginForm onConnect={onReconnect} error={error} isConnecting={isConnecting} />
      </div>
    </div>
  )
}
