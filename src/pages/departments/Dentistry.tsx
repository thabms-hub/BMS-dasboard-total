// =============================================================================
// Department: ทันตกรรม (Dentistry)
// =============================================================================

import type { LucideIcon, LucideProps } from 'lucide-react'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'

function ToothIcon({ className, size = 24, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 5.5c-1.5-2-3.5-3-5-2.5C4.5 4 3 6.5 3 9c0 2 .5 3.5 1.5 4.5.7.7 1 2 1.2 3.5l.3 3c.1.6.6 1 1.2 1 .5 0 1-.4 1.1-.9L9 17c.3-1.2.7-2 1-2.5.3.5.7 1.3 1 2.5l.7 3.1c.1.5.6.9 1.1.9.6 0 1.1-.4 1.2-1l.3-3c.2-1.5.5-2.8 1.2-3.5C16.5 12.5 17 11 17 9c0-2.5-1.5-5-4-5.5-1.5-.5-3.5.5-4 2z" />
      <path d="M9 5.5c1-1 2.5-1.5 3 0" />
    </svg>
  )
}

export default function Dentistry() {
  return (
    <DepartmentPageTemplate
      title="ทันตกรรม"
      subtitle="Dentistry"
      icon={ToothIcon as unknown as LucideIcon}
    />
  )
}
