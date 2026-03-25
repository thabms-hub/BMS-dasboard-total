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
      {/* Header — full width, sticky (handled inside AppHeader) */}
      <AppHeader />

      {/* Below header: sidebar + main */}
      <div className="flex flex-1">
        {/* Sidebar — sticky, fills remaining viewport height below header (h-16 = 64px) */}
        <div className="sticky top-16 h-[calc(100vh-4rem)] shrink-0 overflow-y-auto">
          <AppSidebar />
        </div>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
