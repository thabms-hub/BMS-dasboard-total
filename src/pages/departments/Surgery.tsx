// =============================================================================
// Department: ศัลยกรรม (Surgery)
// =============================================================================

import { Scissors } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function Surgery() {
  return (
    <DepartmentPageTemplate
      title="ศัลยกรรม"
      subtitle="Surgery"
      icon={Scissors}
    />
  )
}
