// =============================================================================
// Department: สูติกรรม (Obstetrics)
// =============================================================================

import { Baby } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function Obstetrics() {
  return (
    <DepartmentPageTemplate
      title="สูติกรรม"
      subtitle="Obstetrics"
      icon={Baby}
    />
  )
}
