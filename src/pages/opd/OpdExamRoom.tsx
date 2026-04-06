// =============================================================================
// OPD: งานห้องตรวจแพทย์
// =============================================================================

import { Stethoscope } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function OpdExamRoom() {
  return (
    <DepartmentPageTemplate
      title="งานห้องตรวจแพทย์"
      subtitle="Outpatient Examination Room"
      icon={Stethoscope}
    />
  )
}
