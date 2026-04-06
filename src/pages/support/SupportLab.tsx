// =============================================================================
// Support: งานห้องปฏิบัติการ Lab
// =============================================================================

import { Microscope } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function SupportLab() {
  return (
    <DepartmentPageTemplate
      title="งานห้องปฏิบัติการ Lab"
      subtitle="Laboratory"
      icon={Microscope}
    />
  )
}
