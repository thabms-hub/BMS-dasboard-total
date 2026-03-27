// =============================================================================
// Department Page Template - Shared base layout for department sub-pages
// =============================================================================

import type { LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DepartmentPageTemplateProps {
  title: string
  subtitle?: string
  icon: LucideIcon | ComponentType<{ className?: string }>
  children?: React.ReactNode
}

export function DepartmentPageTemplate({
  title,
  subtitle,
  icon: Icon,
  children,
}: DepartmentPageTemplateProps) {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-5">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-md ring-1 ring-primary/20">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent" />
          <Icon className="relative h-10 w-10 text-primary drop-shadow-sm" />
        </div>
        <div className="space-y-0.5">
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-base text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Content */}
      {children ?? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ข้อมูลแผนก{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              อยู่ระหว่างพัฒนา — ข้อมูลสถิติของแผนก{title}จะแสดงในส่วนนี้
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
