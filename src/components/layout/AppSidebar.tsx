// =============================================================================
// App Sidebar - Collapsible left navigation
// =============================================================================

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { label: 'ภาพรวม', path: '/', icon: LayoutDashboard },
  { label: 'แนวโน้ม', path: '/trends', icon: TrendingUp },
  { label: 'แผนก', path: '/departments', icon: Building2 },
  { label: 'ข้อมูลประชากร', path: '/demographics', icon: Users },
]

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside
      className={cn(
        'signature-gradient flex flex-col shrink-0 transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-52',
      )}
    >
      {/* ── Nav items ─────────────────────────────────────────── */}
      <nav className="flex flex-col gap-1 flex-1 px-2 pt-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)
          const Icon = item.icon

          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />

              {/* Label — hidden when collapsed */}
              <span
                className={cn(
                  'whitespace-nowrap overflow-hidden transition-all duration-300',
                  collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
                )}
              >
                {item.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-white/80" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Collapse toggle at bottom ─────────────────────────── */}
      <div className="px-2 pb-4">
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'ขยาย' : 'ย่อ'}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/50 hover:bg-white/10 hover:text-white transition-all duration-200"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap overflow-hidden">ย่อเมนู</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
