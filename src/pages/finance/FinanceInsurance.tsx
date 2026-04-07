// =============================================================================
// งานประกันรายได้
// =============================================================================

import { ShieldCheck } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function FinanceInsurance() {
  return (
    <DepartmentPageTemplate
      title="งานประกันรายได้"
      subtitle="Health Insurance & Revenue"
      icon={ShieldCheck}
    />
  )
}
