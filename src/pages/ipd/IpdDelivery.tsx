// =============================================================================
// IPD: ห้องคลอด
// =============================================================================

import { Baby } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function IpdDelivery() {
  return (
    <DepartmentPageTemplate
      title="ห้องคลอด"
      subtitle="Labour & Delivery Room"
      icon={Baby}
    />
  )
}
