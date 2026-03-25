// =============================================================================
// Department: เวชศาสตร์ฉุกเฉิน / ER (Emergency Medicine)
// =============================================================================

import { Siren } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function EmergencyMedicine() {
  return (
    <DepartmentPageTemplate
      title="เวชศาสตร์ฉุกเฉิน (ER)"
      subtitle="Emergency Medicine"
      icon={Siren}
    />
  )
}
