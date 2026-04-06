// =============================================================================
// งานสนับสนุนการรักษา - Group Dashboard (Trends layout)
// =============================================================================

import { Link } from 'react-router-dom'
import { Infinity, Microscope, Scan, Scissors, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function ToothIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 5.5c-1.5-2-3.5-3-5-2.5C4.5 4 3 6.5 3 9c0 2 .5 3.5 1.5 4.5.7.7 1 2 1.2 3.5l.3 3c.1.6.6 1 1.2 1 .5 0 1-.4 1.1-.9L9 17c.3-1.2.7-2 1-2.5.3.5.7 1.3 1 2.5l.7 3.1c.1.5.6.9 1.1.9.6 0 1.1-.4 1.2-1l.3-3c.2-1.5.5-2.8 1.2-3.5C16.5 12.5 17 11 17 9c0-2.5-1.5-5-4-5.5-1.5-.5-3.5.5-4 2z" />
      <path d="M9 5.5c1-1 2.5-1.5 3 0" />
    </svg>
  )
}

const SUB_PAGES = [
  {
    label: 'ระบบทันตกรรม',
    desc: 'สถิติการรักษาทางทันตกรรม',
    path: '/support/dentistry',
    icon: ToothIcon,
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
  },
  {
    label: 'งานห้องปฏิบัติการ Lab',
    desc: 'ผลการตรวจวิเคราะห์ทางห้องปฏิบัติการ',
    path: '/support/lab',
    icon: Microscope,
    color: 'text-violet-600',
    bg: 'bg-violet-500/10',
  },
  {
    label: 'งานรังสีวิทยา X-Ray',
    desc: 'สถิติการถ่ายภาพรังสีและตรวจรังสีวิทยา',
    path: '/support/xray',
    icon: Scan,
    color: 'text-sky-600',
    bg: 'bg-sky-500/10',
  },
  {
    label: 'ระบบห้องผ่าตัด OR',
    desc: 'สถิติการผ่าตัดและห้องผ่าตัด',
    path: '/support/or',
    icon: Scissors,
    color: 'text-orange-600',
    bg: 'bg-orange-500/10',
  },
]

export default function SupportDashboard() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-md ring-1 ring-primary/20">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent" />
          <Infinity className="relative h-10 w-10 text-primary drop-shadow-sm" />
        </div>
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">ระบบสนับสนุน</h1>
          <p className="text-base text-muted-foreground">
            ภาพรวมระบบสนับสนุนการรักษา — ทันตกรรม ห้องปฏิบัติการ รังสีวิทยา และห้องผ่าตัด
          </p>
        </div>
      </div>

      {/* Sub-page navigation cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <CardTitle className="text-sm font-medium">ภาพรวมงานสนับสนุนการรักษา</CardTitle>
          <CardDescription>Dashboard รวมจะแสดงสถิติภาพรวมของทุกระบบงานในส่วนนี้</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            อยู่ระหว่างพัฒนา — สถิติรวมของงานสนับสนุนการรักษาจะแสดงในส่วนนี้
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
