// =============================================================================
// BMS Session KPI Dashboard - App Layout
// Sidebar (left) + Header + Main content
// =============================================================================

import type { ReactNode } from 'react'
import { AppHeader } from '@/components/layout/AppHeader'
import { AppSidebar } from '@/components/layout/AppSidebar'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header — full width */}
      <AppHeader />

      {/* Below header: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
