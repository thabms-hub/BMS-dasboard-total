// =============================================================================
// BMS Session KPI Dashboard - Doctor Workload Table Component (T064)
// Professional showcase redesign with progress bars, rank badges, totals
// =============================================================================

import { useMemo } from 'react'
import { Stethoscope } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import type { DoctorWorkload } from '@/types'

interface DoctorTableProps {
  data: DoctorWorkload[]
  isLoading: boolean
  className?: string
}

export function DoctorTable({ data, isLoading, className }: DoctorTableProps) {
  const maxPatientCount = useMemo(
    () =>
      data && data.length > 0
        ? Math.max(...data.map((d) => d.patientCount))
        : 0,
    [data],
  )

  const totalPatients = useMemo(
    () => (data ? data.reduce((sum, d) => sum + d.patientCount, 0) : 0),
    [data],
  )

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className={cn(className)}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-12 uppercase text-xs tracking-wider text-muted-foreground">
                #
              </TableHead>
              <TableHead className="uppercase text-xs tracking-wider text-muted-foreground">
                ชื่อแพทย์
              </TableHead>
              <TableHead className="text-right uppercase text-xs tracking-wider text-muted-foreground">
                จำนวนผู้ป่วย
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className={i % 2 === 0 ? 'bg-muted/50' : ''}>
                <TableCell>
                  <Skeleton className="h-6 w-6 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-4 w-16" />
                  <Skeleton className="mt-1.5 h-1.5 w-full rounded-full" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (!data || data.length === 0) {
    return (
      <div className={cn(className)}>
        <EmptyState
          icon={<Stethoscope className="h-8 w-8" />}
          title="ไม่พบข้อมูลแพทย์ในช่วงเวลานี้"
          description="ลองเลือกช่วงวันที่หรือแผนกอื่น"
        />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Data table
  // ---------------------------------------------------------------------------
  return (
    <div className={cn(className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-12 uppercase text-xs tracking-wider text-muted-foreground">
              #
            </TableHead>
            <TableHead className="uppercase text-xs tracking-wider text-muted-foreground">
              ชื่อแพทย์
            </TableHead>
            <TableHead className="text-right uppercase text-xs tracking-wider text-muted-foreground">
              จำนวนผู้ป่วย
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((doctor, index) => {
            const percentage =
              maxPatientCount > 0
                ? Math.round((doctor.patientCount / maxPatientCount) * 100)
                : 0

            return (
              <TableRow
                key={doctor.doctorCode}
                className={`hover:bg-muted transition-colors ${
                  index % 2 === 0 ? 'bg-muted/50' : ''
                }`}
              >
                {/* Rank badge */}
                <TableCell>
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">
                    {index + 1}
                  </div>
                </TableCell>

                {/* Doctor name */}
                <TableCell className="font-medium">
                  {doctor.doctorName || doctor.doctorCode}
                </TableCell>

                {/* Patient count + progress bar */}
                <TableCell className="text-right">
                  <span className="font-semibold">
                    {doctor.patientCount.toLocaleString()}
                  </span>
                  <div className="relative mt-1.5 h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-primary/60 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            )
          })}

          {/* Total row */}
          <TableRow className="border-t-2">
            <TableCell />
            <TableCell className="font-bold">รวม</TableCell>
            <TableCell className="text-right font-bold">
              {totalPatients.toLocaleString()}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
