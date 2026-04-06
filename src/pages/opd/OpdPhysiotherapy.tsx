// =============================================================================
// OPD: งานกายภาพบำบัด
// =============================================================================

import { Activity } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function OpdPhysiotherapy() {
  return (
    <DepartmentPageTemplate
      title="งานกายภาพบำบัด"
      subtitle="Physical Therapy"
      icon={Activity}
    />
  )
}
