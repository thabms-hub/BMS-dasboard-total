// =============================================================================
// BMS Session KPI Dashboard - KPI Card Grid Component (T044)
// =============================================================================

import { useCallback } from 'react'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import { getKpiSummary } from '@/services/kpiService'
export function KpiCardGrid() {
  const { connectionConfig, session } = useBmsSessionContext()

  const queryFn = useCallback(
    () => getKpiSummary(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )

  const {
    data: kpiSummary,
    isLoading,
    isError,
    error,
    execute,
  } = useQuery<Awaited<ReturnType<typeof getKpiSummary>>>({
    queryFn,
    enabled: connectionConfig !== null && session !== null,
  })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="OPD Visits"
        value={kpiSummary?.opdVisitCount ?? null}
        isLoading={isLoading}
        isError={isError}
        error={error?.message}
        onRetry={execute}
        description="Today's outpatient visits"
      />
      <KpiCard
        title="IPD Patients"
        value={kpiSummary?.ipdPatientCount ?? null}
        isLoading={isLoading}
        isError={isError}
        error={error?.message}
        onRetry={execute}
        description="Current inpatient count"
      />
      <KpiCard
        title="ER Visits"
        value={kpiSummary?.erVisitCount ?? null}
        isLoading={isLoading}
        isError={isError}
        error={error?.message}
        onRetry={execute}
        description="Today's emergency visits"
      />
      <KpiCard
        title="Active Departments"
        value={kpiSummary?.activeDepartmentCount ?? null}
        isLoading={isLoading}
        isError={isError}
        error={error?.message}
        onRetry={execute}
        description="Departments with activity today"
      />
    </div>
  )
}
