// =============================================================================
// งานผู้ป่วยนอก OPD - Group Dashboard (Trends layout)
// =============================================================================

import { Link } from 'react-router-dom'
import {
  Stethoscope,
  ClipboardCheck,
  Star,
  CalendarCheck2,
  Siren,
  Send,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const SUB_PAGES = [
  {
    label: 'งานคัดกรอง OPD Screen',
    desc: 'คัดกรองและประเมินผู้ป่วยเบื้องต้น',
    path: '/opd/screen',
    icon: ClipboardCheck,
    color: 'text-blue-600',
    bg: 'bg-blue-500/10',
  },
  {
    label: 'งานห้องตรวจแพทย์',
    desc: 'สถิติการตรวจโรคทั่วไปประจำวัน',
    path: '/opd/exam-room',
    icon: Stethoscope,
    color: 'text-indigo-600',
    bg: 'bg-indigo-500/10',
  },
  {
    label: 'งานคลินิกพิเศษ',
    desc: 'คลินิกเฉพาะโรคและคลินิกพิเศษ',
    path: '/opd/special-clinic',
    icon: Star,
    color: 'text-amber-600',
    bg: 'bg-amber-500/10',
  },
  {
    label: 'ระบบนัดหมาย',
    desc: 'ระบบนัดหมายผู้ป่วยและติดตามการมาตามนัด',
    path: '/opd/appointments',
    icon: CalendarCheck2,
    color: 'text-violet-600',
    bg: 'bg-violet-500/10',
  },
  {
    label: 'งานอุบัติเหตุและฉุกเฉิน ER',
    desc: 'ห้องฉุกเฉินและอุบัติเหตุ',
    path: '/opd/emergency',
    icon: Siren,
    color: 'text-red-600',
    bg: 'bg-red-500/10',
  },
  {
    label: 'งานส่งต่อผู้ป่วย Refer',
    desc: 'ระบบส่งต่อและรับโอนผู้ป่วย',
    path: '/opd/refer',
    icon: Send,
    color: 'text-cyan-600',
    bg: 'bg-cyan-500/10',
  },
]

export default function OpdDashboard() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-md ring-1 ring-primary/20">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent" />
          <Stethoscope className="relative h-10 w-10 text-primary drop-shadow-sm" />
        </div>
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">งานผู้ป่วยนอก OPD</h1>
          <p className="text-base text-muted-foreground">
            ภาพรวมระบบงานผู้ป่วยนอก — คัดกรอง ตรวจโรค คลินิกพิเศษ และบริการที่เกี่ยวข้อง
          </p>
        </div>
      </div>

      {/* Sub-page navigation cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          <CardTitle className="text-sm font-medium">ภาพรวมงานผู้ป่วยนอก OPD</CardTitle>
          <CardDescription>Dashboard รวมจะแสดงสถิติภาพรวมของทุกระบบงานในส่วนนี้</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            อยู่ระหว่างพัฒนา — สถิติรวมของงานผู้ป่วยนอกจะแสดงในส่วนนี้
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
