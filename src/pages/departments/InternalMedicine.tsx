// =============================================================================
// Department: อายุรกรรม (Internal Medicine)
// =============================================================================

import { Stethoscope } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function InternalMedicine() {
  return (
    <DepartmentPageTemplate
      title="อายุรกรรม"
      subtitle="Internal Medicine"
      icon={Stethoscope}
    />
  )
}
