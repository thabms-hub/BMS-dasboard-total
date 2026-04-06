// =============================================================================
// OPD: งานส่งต่อผู้ป่วย Refer
// =============================================================================

import { Send } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function OpdRefer() {
  return (
    <DepartmentPageTemplate
      title="งานส่งต่อผู้ป่วย Refer"
      subtitle="Patient Referral"
      icon={Send}
    />
  )
}
