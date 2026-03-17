import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useBmsSession } from '@/hooks/useBmsSession'
import { handleUrlSession, getSessionCookie } from '@/utils/sessionStorage'

type BmsSessionContextType = ReturnType<typeof useBmsSession>

const BmsSessionContext = createContext<BmsSessionContextType | null>(null)

interface BmsSessionProviderProps {
  children: ReactNode
}

export function BmsSessionProvider({ children }: BmsSessionProviderProps) {
  const session = useBmsSession()

  useEffect(() => {
    const urlSessionId = handleUrlSession()
    if (urlSessionId) {
      session.connectSession(urlSessionId)
      return
    }

    const cookieSessionId = getSessionCookie()
    if (cookieSessionId) {
      session.connectSession(cookieSessionId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BmsSessionContext.Provider value={session}>
      {children}
    </BmsSessionContext.Provider>
  )
}

export function useBmsSessionContext(): BmsSessionContextType {
  const context = useContext(BmsSessionContext)
  if (!context) {
    throw new Error('useBmsSessionContext must be used within a BmsSessionProvider')
  }
  return context
}
