// =============================================================================
// ค่าใช้จ่ายในการรักษา
// =============================================================================

import { Receipt } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function FinanceTreatmentCost() {
  return (
    <DepartmentPageTemplate
      title="ค่าใช้จ่ายในการรักษา"
      subtitle="Treatment Cost"
      icon={Receipt}
    />
  )
}
