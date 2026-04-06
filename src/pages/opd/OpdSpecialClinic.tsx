// =============================================================================
// OPD: งานคลินิกพิเศษ
// =============================================================================

import { Star } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function OpdSpecialClinic() {
  return (
    <DepartmentPageTemplate
      title="งานคลินิกพิเศษ"
      subtitle="Special Clinic"
      icon={Star}
    />
  )
}
