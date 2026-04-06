// =============================================================================
// Department: แพทย์แผนไทย (Thai Traditional Medicine)
// =============================================================================

import { Leaf } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function ThaiTraditionalMedicine() {
  return (
    <DepartmentPageTemplate
      title="แพทย์แผนไทย"
      subtitle="Thai Traditional Medicine"
      icon={Leaf}
    />
  )
}
