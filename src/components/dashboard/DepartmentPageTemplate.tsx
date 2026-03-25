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
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
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
