// =============================================================================
// BMS Session KPI Dashboard - Department Workload Table Component (T045)
// =============================================================================

import { useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import { getDepartmentWorkload } from '@/services/kpiService'

export function DepartmentTable() {
  const { connectionConfig, session } = useBmsSessionContext()

  const queryFn = useCallback(
    () => getDepartmentWorkload(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )

  const {
    data: departments,
    isLoading,
    isError,
    error,
    execute,
  } = useQuery<Awaited<ReturnType<typeof getDepartmentWorkload>>>({
    queryFn,
    enabled: connectionConfig !== null && session !== null,
  })

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="text-right">Visits</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-6" /></TableCell>
              <TableCell><Skeleton className="h-4 w-40" /></TableCell>
              <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-10" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (isError) {
    return (
      <EmptyState
        title="Failed to load department data"
        description={error?.message ?? 'An unexpected error occurred.'}
        action={
          <button
            className="text-sm text-primary underline hover:no-underline"
            onClick={execute}
          >
            Retry
          </button>
        }
      />
    )
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (!departments || departments.length === 0) {
    return (
      <EmptyState
        title="No department visits found for today"
        description="Data will appear when patients visit."
      />
    )
  }

  // ---------------------------------------------------------------------------
  // Data table
  // ---------------------------------------------------------------------------
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Department</TableHead>
          <TableHead className="text-right">Visits</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {departments.map((dept, index) => (
          <TableRow key={dept.departmentCode}>
            <TableCell className="font-medium">{index + 1}</TableCell>
            <TableCell>{dept.departmentName}</TableCell>
            <TableCell className="text-right">
              {dept.visitCount.toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
