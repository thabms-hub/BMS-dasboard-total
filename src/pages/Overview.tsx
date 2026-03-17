// =============================================================================
// BMS Session KPI Dashboard - Overview Page (T048 / US1 MVP)
// =============================================================================

import { KpiCardGrid } from '@/components/dashboard/KpiCardGrid'
import { DepartmentTable } from '@/components/dashboard/DepartmentTable'
import { formatDate } from '@/utils/dateUtils'

export default function Overview() {
  const today = formatDate(new Date())

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      <KpiCardGrid />

      <div>
        <h2 className="mb-4 text-lg font-semibold">Department Workload</h2>
        <DepartmentTable />
      </div>
    </div>
  )
}
