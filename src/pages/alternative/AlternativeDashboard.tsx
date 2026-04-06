// =============================================================================
// งานแพทย์ทางเลือก - Group Dashboard
// =============================================================================

import { Link } from 'react-router-dom'
import { Sprout, Activity, Leaf, Sun, ChevronRight } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const SUB_PAGES = [
  {
    label: 'งานกายภาพบำบัด',
    desc: 'สถิติการรักษาด้วยกายภาพบำบัด',
    path: '/alternative/physiotherapy',
    icon: Activity,
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
  },
  {
    label: 'งานแพทย์แผนไทย',
    desc: 'บริการแพทย์แผนไทยและแพทย์ทางเลือก',
    path: '/alternative/thai-traditional',
    icon: Leaf,
    color: 'text-green-600',
    bg: 'bg-green-500/10',
  },
  {
    label: 'งานแพทย์แผนจีน',
    desc: 'บริการแพทย์แผนจีนและการฝังเข็ม',
    path: '/alternative/chinese-medicine',
    icon: Sun,
    color: 'text-amber-600',
    bg: 'bg-amber-500/10',
  },
]

export default function AlternativeDashboard() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-md ring-1 ring-primary/20">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent" />
          <Sprout className="relative h-10 w-10 text-primary drop-shadow-sm" />
        </div>
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">งานแพทย์ทางเลือก</h1>
          <p className="text-base text-muted-foreground">
            ภาพรวมระบบงานแพทย์ทางเลือก — กายภาพบำบัด แพทย์แผนไทย และแพทย์แผนจีน
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
    </div>
  )
}
