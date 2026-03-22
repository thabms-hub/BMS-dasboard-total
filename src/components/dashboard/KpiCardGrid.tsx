// =============================================================================
// BMS Session KPI Dashboard - KPI Card Grid Component (Redesigned)
// =============================================================================

import { useCallback } from 'react'
import { BedDouble, Siren, Building2 } from 'lucide-react'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { OpdKpiCard } from '@/components/dashboard/OpdKpiCard'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import { getKpiSummary, getOpdVisitDetail } from '@/services/kpiService'

export function KpiCardGrid() {
  const { connectionConfig, session } = useBmsSessionContext()
  const enabled = connectionConfig !== null && session !== null

  const kpiFn = useCallback(
    () => getKpiSummary(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const {
    data: kpiSummary,
    isLoading: isKpiLoading,
    isError: isKpiError,
    error: kpiError,
    execute: retryKpi,
  } = useQuery<Awaited<ReturnType<typeof getKpiSummary>>>({
    queryFn: kpiFn,
    enabled,
  })

  const opdFn = useCallback(
    () => getOpdVisitDetail(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const {
    data: opdDetail,
    isLoading: isOpdLoading,
    isError: isOpdError,
    error: opdError,
    execute: retryOpd,
  } = useQuery<Awaited<ReturnType<typeof getOpdVisitDetail>>>({
    queryFn: opdFn,
    enabled,
  })

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <OpdKpiCard
        data={opdDetail ?? null}
        isLoading={isOpdLoading}
        isError={isOpdError}
        error={opdError?.message}
        onRetry={retryOpd}
      />
      <KpiCard
        title="ผู้ป่วยใน (IPD)"
        value={kpiSummary?.ipdPatientCount ?? null}
        icon={<BedDouble className="h-5 w-5" />}
        isLoading={isKpiLoading}
        isError={isKpiError}
        error={kpiError?.message}
        onRetry={retryKpi}
        description="จำนวนผู้ป่วยในปัจจุบัน"
        accentColor="text-purple-500"
      />
      <KpiCard
        title="ห้องฉุกเฉิน (ER)"
        value={kpiSummary?.erVisitCount ?? null}
        icon={<Siren className="h-5 w-5" />}
        isLoading={isKpiLoading}
        isError={isKpiError}
        error={kpiError?.message}
        onRetry={retryKpi}
        description="จำนวนเข้ารับบริการฉุกเฉินวันนี้"
        accentColor="text-red-500"
      />
      <KpiCard
        title="แผนกที่มีบริการ"
        value={kpiSummary?.activeDepartmentCount ?? null}
        icon={<Building2 className="h-5 w-5" />}
        isLoading={isKpiLoading}
        isError={isKpiError}
        error={kpiError?.message}
        onRetry={retryKpi}
        description="จำนวนแผนกที่มีผู้ป่วยวันนี้"
        accentColor="text-green-500"
      />
    </div>
  )
}
