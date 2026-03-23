// =============================================================================
// BMS Session KPI Dashboard - KPI Card Grid Component (Redesigned)
// =============================================================================

import { useCallback } from 'react'
import { Building2 } from 'lucide-react'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { OpdKpiCard } from '@/components/dashboard/OpdKpiCard'
import { IpdKpiCard } from '@/components/dashboard/IpdKpiCard'
import { ErKpiCard } from '@/components/dashboard/ErKpiCard'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import { getKpiSummary, getOpdVisitDetail, getIpdVisitDetail, getErVisitDetail } from '@/services/kpiService'

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

  const ipdFn = useCallback(
    () => getIpdVisitDetail(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const {
    data: ipdDetail,
    isLoading: isIpdLoading,
    isError: isIpdError,
    error: ipdError,
    execute: retryIpd,
  } = useQuery<Awaited<ReturnType<typeof getIpdVisitDetail>>>({
    queryFn: ipdFn,
    enabled,
  })

  const erFn = useCallback(
    () => getErVisitDetail(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const {
    data: erDetail,
    isLoading: isErLoading,
    isError: isErError,
    error: erError,
    execute: retryEr,
  } = useQuery<Awaited<ReturnType<typeof getErVisitDetail>>>({
    queryFn: erFn,
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
      <IpdKpiCard
        data={ipdDetail ?? null}
        isLoading={isIpdLoading}
        isError={isIpdError}
        error={ipdError?.message}
        onRetry={retryIpd}
      />
      <ErKpiCard
        data={erDetail ?? null}
        isLoading={isErLoading}
        isError={isErError}
        error={erError?.message}
        onRetry={retryEr}
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
