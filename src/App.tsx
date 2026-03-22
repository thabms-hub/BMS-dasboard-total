import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { BmsSessionProvider } from '@/contexts/BmsSessionContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SessionValidator } from '@/components/session/SessionValidator'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { AppLayout } from '@/components/layout/AppLayout'

const Overview = lazy(() => import('@/pages/Overview'))
const Trends = lazy(() => import('@/pages/Trends'))
const DepartmentAnalytics = lazy(() => import('@/pages/DepartmentAnalytics'))
const Demographics = lazy(() => import('@/pages/Demographics'))

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" message="กำลังโหลดหน้า..." className="min-h-[50vh]" />}>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/departments" element={<DepartmentAnalytics />} />
        <Route path="/demographics" element={<Demographics />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <BmsSessionProvider>
          <SessionValidator>
            <AppLayout>
              <AppRoutes />
            </AppLayout>
          </SessionValidator>
        </BmsSessionProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
