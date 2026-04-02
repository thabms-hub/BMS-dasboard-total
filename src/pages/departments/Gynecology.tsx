// =============================================================================
// Department: นรีเวชกรรม (Gynecology)
// =============================================================================

import { Venus } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

function WomanIcon({ className }: { className?: string }) {
  return <Venus className={className} style={{ transform: 'rotate(30deg)' }} />
}

export default function Gynecology() {
  return (
    <DepartmentPageTemplate
      title="นรีเวชกรรม"
      subtitle="Gynecology"
      icon={WomanIcon}
    />
  )
}
