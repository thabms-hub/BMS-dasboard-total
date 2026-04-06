// =============================================================================
// Support: ระบบห้องผ่าตัด OR
// =============================================================================

import { Scissors } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function SupportOr() {
  return (
    <DepartmentPageTemplate
      title="ระบบห้องผ่าตัด OR"
      subtitle="Operating Room"
      icon={Scissors}
    />
  )
}
