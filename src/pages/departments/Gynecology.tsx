// =============================================================================
// Department: นรีเวชกรรม (Gynecology)
// =============================================================================

import { HeartPulse } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function Gynecology() {
  return (
    <DepartmentPageTemplate
      title="นรีเวชกรรม"
      subtitle="Gynecology"
      icon={HeartPulse}
    />
  )
}
