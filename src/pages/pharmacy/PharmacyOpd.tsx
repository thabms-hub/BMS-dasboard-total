// =============================================================================
// Pharmacy: ห้องยาผู้ป่วยนอก
// =============================================================================

import { Pill } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function PharmacyOpd() {
  return (
    <DepartmentPageTemplate
      title="ห้องยาผู้ป่วยนอก"
      subtitle="Outpatient Pharmacy"
      icon={Pill}
    />
  )
}
