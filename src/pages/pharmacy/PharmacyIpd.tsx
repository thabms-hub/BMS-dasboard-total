// =============================================================================
// Pharmacy: ห้องยาผู้ป่วยใน
// =============================================================================

import { Package } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

export default function PharmacyIpd() {
  return (
    <DepartmentPageTemplate
      title="ห้องยาผู้ป่วยใน"
      subtitle="Inpatient Pharmacy"
      icon={Package}
    />
  )
}
