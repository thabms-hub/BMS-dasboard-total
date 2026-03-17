import type { ReactNode } from 'react'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { LoginForm } from './LoginForm'
import { SessionExpired } from './SessionExpired'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'

interface SessionValidatorProps {
  children: ReactNode
}

export function SessionValidator({ children }: SessionValidatorProps) {
  const { sessionState, error, connectSession } = useBmsSessionContext()

  if (sessionState === 'connecting') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" message="กำลังเชื่อมต่อเซสชัน BMS..." />
      </div>
    )
  }

  if (sessionState === 'expired') {
    return (
      <SessionExpired
        onReconnect={connectSession}
        error={error}
        isConnecting={false}
      />
    )
  }

  if (sessionState === 'disconnected') {
    return (
      <LoginForm
        onConnect={connectSession}
        error={error}
        isConnecting={false}
      />
    )
  }

  return <>{children}</>
}
