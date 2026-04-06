// =============================================================================
// Support: งานรังสีวิทยา X-Ray
// =============================================================================

import { Scan } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function SupportXray() {
  return (
    <DepartmentPageTemplate
      title="งานรังสีวิทยา X-Ray"
      subtitle="Radiology"
      icon={Scan}
    />
  )
}
