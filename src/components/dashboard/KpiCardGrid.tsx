// =============================================================================
// BMS Session KPI Dashboard - KPI Card Grid Component (Redesigned)
// =============================================================================

import { useCallback } from 'react'
import { OpdKpiCard } from '@/components/dashboard/OpdKpiCard'
import { IpdKpiCard } from '@/components/dashboard/IpdKpiCard'
import { ErKpiCard } from '@/components/dashboard/ErKpiCard'
import { AppointmentKpiCard } from '@/components/dashboard/AppointmentKpiCard'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import { getOpdVisitDetail, getIpdVisitDetail, getErVisitDetail, getAppointmentStats } from '@/services/kpiService'

export function KpiCardGrid() {
  const { connectionConfig, session } = useBmsSessionContext()
  const enabled = connectionConfig !== null && session !== null

  const appointmentFn = useCallback(
    () => getAppointmentStats(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const {
    data: appointmentData,
    isLoading: isAppointmentLoading,
    isError: isAppointmentError,
    error: appointmentError,
    execute: retryAppointment,
  } = useQuery<Awaited<ReturnType<typeof getAppointmentStats>>>({
    queryFn: appointmentFn,
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
      <AppointmentKpiCard
        data={appointmentData ?? null}
        isLoading={isAppointmentLoading}
        isError={isAppointmentError}
        error={appointmentError?.message}
        onRetry={retryAppointment}
      />
      <ErKpiCard
        data={erDetail ?? null}
        isLoading={isErLoading}
        isError={isErError}
        error={erError?.message}
        onRetry={retryEr}
      />
      <IpdKpiCard
        data={ipdDetail ?? null}
        isLoading={isIpdLoading}
        isError={isIpdError}
        error={ipdError?.message}
        onRetry={retryIpd}
      />
    </div>
  )
}
