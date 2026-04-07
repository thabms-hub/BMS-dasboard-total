import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { BmsSessionProvider } from '@/contexts/BmsSessionContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SessionValidator } from '@/components/session/SessionValidator'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { AppLayout } from '@/components/layout/AppLayout'

const Overview = lazy(() => import('@/pages/Overview'))
const Trends = lazy(() => import('@/pages/Trends'))

// งานผู้ป่วยนอก OPD
const OpdDashboard = lazy(() => import('@/pages/opd/OpdDashboard'))
const OpdScreen = lazy(() => import('@/pages/opd/OpdScreen'))
const OpdExamRoom = lazy(() => import('@/pages/opd/OpdExamRoom'))
const OpdSpecialClinic = lazy(() => import('@/pages/opd/OpdSpecialClinic'))
const Appointments = lazy(() => import('@/pages/opd/Appointments'))
const EmergencyMedicine = lazy(() => import('@/pages/opd/EmergencyMedicine'))
const OpdRefer = lazy(() => import('@/pages/opd/OpdRefer'))

// งานแพทย์ทางเลือก
const AlternativeDashboard = lazy(() => import('@/pages/alternative/AlternativeDashboard'))
const OpdPhysiotherapy = lazy(() => import('@/pages/opd/OpdPhysiotherapy'))
const ThaiTraditionalMedicine = lazy(() => import('@/pages/opd/ThaiTraditionalMedicine'))
const ChineseMedicine = lazy(() => import('@/pages/alternative/ChineseMedicine'))

// งานผู้ป่วยใน IPD
const IpdDashboard = lazy(() => import('@/pages/ipd/IpdDashboard'))
const IpdInpatient = lazy(() => import('@/pages/ipd/IpdInpatient'))
const IpdDelivery = lazy(() => import('@/pages/ipd/IpdDelivery'))

// งานเภสัชกรรม
const PharmacyDashboard = lazy(() => import('@/pages/pharmacy/PharmacyDashboard'))
const PharmacyOpd = lazy(() => import('@/pages/pharmacy/PharmacyOpd'))
const PharmacyIpd = lazy(() => import('@/pages/pharmacy/PharmacyIpd'))

// งานสนับสนุนการรักษา
const SupportDashboard = lazy(() => import('@/pages/support/SupportDashboard'))
const Dentistry = lazy(() => import('@/pages/support/Dentistry'))
const SupportLab = lazy(() => import('@/pages/support/SupportLab'))
const SupportXray = lazy(() => import('@/pages/support/SupportXray'))
const SupportOr = lazy(() => import('@/pages/support/SupportOr'))

// การเงินและรายได้
const FinanceDashboard = lazy(() => import('@/pages/finance/FinanceDashboard'))
const FinanceTreatmentCost = lazy(() => import('@/pages/finance/FinanceTreatmentCost'))
const FinanceInsurance = lazy(() => import('@/pages/finance/FinanceInsurance'))

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" message="กำลังโหลดหน้า..." className="min-h-[50vh]" />}>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/trends" element={<Trends />} />

        {/* งานผู้ป่วยนอก OPD */}
        <Route path="/opd" element={<OpdDashboard />} />
        <Route path="/opd/screen" element={<OpdScreen />} />
        <Route path="/opd/exam-room" element={<OpdExamRoom />} />
        <Route path="/opd/special-clinic" element={<OpdSpecialClinic />} />
        <Route path="/opd/appointments" element={<Appointments />} />
        <Route path="/opd/emergency" element={<EmergencyMedicine />} />
        <Route path="/opd/refer" element={<OpdRefer />} />

        {/* งานแพทย์ทางเลือก */}
        <Route path="/alternative" element={<AlternativeDashboard />} />
        <Route path="/alternative/physiotherapy" element={<OpdPhysiotherapy />} />
        <Route path="/alternative/thai-traditional" element={<ThaiTraditionalMedicine />} />
        <Route path="/alternative/chinese-medicine" element={<ChineseMedicine />} />

        {/* งานผู้ป่วยใน IPD */}
        <Route path="/ipd" element={<IpdDashboard />} />
        <Route path="/ipd/inpatient" element={<IpdInpatient />} />
        <Route path="/ipd/delivery" element={<IpdDelivery />} />

        {/* งานเภสัชกรรม */}
        <Route path="/pharmacy" element={<PharmacyDashboard />} />
        <Route path="/pharmacy/opd" element={<PharmacyOpd />} />
        <Route path="/pharmacy/ipd" element={<PharmacyIpd />} />

        {/* งานสนับสนุนการรักษา */}
        <Route path="/support" element={<SupportDashboard />} />
        <Route path="/support/dentistry" element={<Dentistry />} />
        <Route path="/support/lab" element={<SupportLab />} />
        <Route path="/support/xray" element={<SupportXray />} />
        <Route path="/support/or" element={<SupportOr />} />

        {/* การเงินและรายได้ */}
        <Route path="/finance" element={<FinanceDashboard />} />
        <Route path="/finance/treatment-cost" element={<FinanceTreatmentCost />} />
        <Route path="/finance/insurance" element={<FinanceInsurance />} />

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
