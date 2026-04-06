// =============================================================================
// IPD: ผู้ป่วยใน
// =============================================================================

import { Bed } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function IpdInpatient() {
  return (
    <DepartmentPageTemplate
      title="ผู้ป่วยใน"
      subtitle="Inpatient Ward"
      icon={Bed}
    />
  )
}
