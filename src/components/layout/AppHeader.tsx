// =============================================================================
// BMS Session KPI Dashboard - App Header (T046)
// Navigation header with tabs, user info, and connection status.
// =============================================================================

import { Link, useLocation } from 'react-router-dom';
import { useBmsSessionContext } from '@/contexts/BmsSessionContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Navigation tab definitions
// ---------------------------------------------------------------------------

interface NavTab {
  label: string;
  path: string;
}

const NAV_TABS: NavTab[] = [
  { label: 'Overview', path: '/' },
  { label: 'Trends', path: '/trends' },
  { label: 'Departments', path: '/departments' },
  { label: 'Demographics', path: '/demographics' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppHeader() {
  const { session, disconnectSession } = useBmsSessionContext();
  const location = useLocation();

  const databaseLabel =
    session?.databaseType === 'postgresql' ? 'PostgreSQL' : 'MySQL';

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      {/* Left: Title */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight">BMS Dashboard</h1>
      </div>

      {/* Center: Navigation tabs */}
      <nav className="flex items-center gap-1">
        {NAV_TABS.map((tab) => {
          const isActive =
            tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path);

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors ' +
                (isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Right: User info, database badge, disconnect */}
      <div className="flex items-center gap-3">
        {session && (
          <>
            <div className="text-right text-sm leading-tight">
              <p className="font-medium">{session.userInfo.name}</p>
              <p className="text-muted-foreground">{session.userInfo.department}</p>
            </div>
            <Badge variant="secondary">{databaseLabel}</Badge>
            <Button variant="outline" size="sm" onClick={disconnectSession}>
              Disconnect
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
