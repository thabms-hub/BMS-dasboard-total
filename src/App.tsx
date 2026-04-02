import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { BmsSessionProvider } from '@/contexts/BmsSessionContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SessionValidator } from '@/components/session/SessionValidator'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { AppLayout } from '@/components/layout/AppLayout'

const Overview = lazy(() => import('@/pages/Overview'))
const Trends = lazy(() => import('@/pages/Trends'))
const Appointments = lazy(() => import('@/pages/Appointments'))
const DepartmentAnalytics = lazy(() => import('@/pages/DepartmentAnalytics'))
const Demographics = lazy(() => import('@/pages/Demographics'))

// Department sub-pages
const InternalMedicine = lazy(() => import('@/pages/departments/InternalMedicine'))
const Surgery = lazy(() => import('@/pages/departments/Surgery'))
const Obstetrics = lazy(() => import('@/pages/departments/Obstetrics'))
const Gynecology = lazy(() => import('@/pages/departments/Gynecology'))
const Pediatrics = lazy(() => import('@/pages/departments/Pediatrics'))
const Dentistry = lazy(() => import('@/pages/departments/Dentistry'))
const ThaiTraditionalMedicine = lazy(() => import('@/pages/departments/ThaiTraditionalMedicine'))
const EmergencyMedicine = lazy(() => import('@/pages/departments/EmergencyMedicine'))

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" message="กำลังโหลดหน้า..." className="min-h-[50vh]" />}>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/departments" element={<DepartmentAnalytics />} />
        <Route path="/departments/internal-medicine" element={<InternalMedicine />} />
        <Route path="/departments/surgery" element={<Surgery />} />
        <Route path="/departments/obstetrics" element={<Obstetrics />} />
        <Route path="/departments/gynecology" element={<Gynecology />} />
        <Route path="/departments/pediatrics" element={<Pediatrics />} />
        <Route path="/departments/dentistry" element={<Dentistry />} />
        <Route path="/departments/thai-traditional" element={<ThaiTraditionalMedicine />} />
        <Route path="/departments/emergency" element={<EmergencyMedicine />} />
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
