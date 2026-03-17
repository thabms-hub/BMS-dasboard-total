// =============================================================================
// BMS Session KPI Dashboard - App Layout (T047)
// Top-level layout wrapper: header + main content area.
// =============================================================================

import type { ReactNode } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
