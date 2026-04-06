// =============================================================================
// OPD: งานคัดกรอง OPD Screen
// =============================================================================

import { ClipboardCheck } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function OpdScreen() {
  return (
    <DepartmentPageTemplate
      title="งานคัดกรอง OPD Screen"
      subtitle="OPD Screening"
      icon={ClipboardCheck}
    />
  )
}
