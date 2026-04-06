// =============================================================================
// งานผู้ป่วยใน IPD - Group Dashboard (Trends layout)
// =============================================================================

import { Link } from 'react-router-dom'
import { Bed, Baby, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const SUB_PAGES = [
  {
    label: 'ผู้ป่วยใน',
    desc: 'สถิติการรับผู้ป่วยเข้าพักรักษาตัว',
    path: '/ipd/inpatient',
    icon: Bed,
    color: 'text-blue-600',
    bg: 'bg-blue-500/10',
  },
  {
    label: 'ห้องคลอด',
    desc: 'สถิติการคลอดและห้องคลอด',
    path: '/ipd/delivery',
    icon: Baby,
    color: 'text-pink-600',
    bg: 'bg-pink-500/10',
  },
]

export default function IpdDashboard() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-md ring-1 ring-primary/20">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent" />
          <Bed className="relative h-10 w-10 text-primary drop-shadow-sm" />
        </div>
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">งานผู้ป่วยใน IPD</h1>
          <p className="text-base text-muted-foreground">
            ภาพรวมระบบงานผู้ป่วยใน — การรับไว้รักษา วันนอน และห้องคลอด
          </p>
        </div>
      </div>

      {/* Sub-page navigation cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SUB_PAGES.map((page) => {
          const Icon = page.icon
          return (
            <Link key={page.path} to={page.path}>
              <Card className="h-full cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 card-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${page.bg}`}>
                      <Icon className={`h-5 w-5 ${page.color}`} />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-sm font-semibold leading-snug">{page.label}</CardTitle>
                  <CardDescription className="text-xs">{page.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Summary placeholder */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-sm font-medium">ภาพรวมงานผู้ป่วยใน IPD</CardTitle>
          <CardDescription>Dashboard รวมจะแสดงสถิติภาพรวมของทุกระบบงานในส่วนนี้</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            อยู่ระหว่างพัฒนา — สถิติรวมของงานผู้ป่วยในจะแสดงในส่วนนี้
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
