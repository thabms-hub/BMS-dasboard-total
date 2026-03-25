// =============================================================================
// Department: ทันตกรรม (Dentistry)
// =============================================================================

import { Smile } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function Dentistry() {
  return (
    <DepartmentPageTemplate
      title="ทันตกรรม"
      subtitle="Dentistry"
      icon={Smile}
    />
  )
}
