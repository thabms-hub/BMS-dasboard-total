// =============================================================================
// Department: กุมารเวชกรรม (Pediatrics)
// =============================================================================

import { SmilePlus } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function Pediatrics() {
  return (
    <DepartmentPageTemplate
      title="กุมารเวชกรรม"
      subtitle="Pediatrics"
      icon={SmilePlus}
    />
  )
}
