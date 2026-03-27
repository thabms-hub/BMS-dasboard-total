// =============================================================================
// App Sidebar - Collapsible left navigation with sub-menu support
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Baby,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Leaf,
  Scissors,
  SmilePlus,
  Siren,
  Stethoscope,
  TrendingUp,
  Users,
  Venus,
} from 'lucide-react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'

function WomanIcon({ className, size = 24, style, ...props }: LucideProps) {
  return (
    <Venus
      className={className}
      size={size}
      style={{ transform: 'rotate(30deg)', ...style }}
      {...props}
    />
  )
}

function ToothIcon({ className, size = 24, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 5.5c-1.5-2-3.5-3-5-2.5C4.5 4 3 6.5 3 9c0 2 .5 3.5 1.5 4.5.7.7 1 2 1.2 3.5l.3 3c.1.6.6 1 1.2 1 .5 0 1-.4 1.1-.9L9 17c.3-1.2.7-2 1-2.5.3.5.7 1.3 1 2.5l.7 3.1c.1.5.6.9 1.1.9.6 0 1.1-.4 1.2-1l.3-3c.2-1.5.5-2.8 1.2-3.5C16.5 12.5 17 11 17 9c0-2.5-1.5-5-4-5.5-1.5-.5-3.5.5-4 2z" />
      <path d="M9 5.5c1-1 2.5-1.5 3 0" />
    </svg>
  )
}

interface SubNavItem {
  label: string
  path: string
  icon: LucideIcon
}

interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  children?: SubNavItem[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'ภาพรวม', path: '/', icon: LayoutDashboard },
  { label: 'แนวโน้ม', path: '/trends', icon: TrendingUp },
  {
    label: 'ภาพรวมแผนก',
    path: '/departments',
    icon: Building2,
    children: [
      { label: 'อายุรกรรม', path: '/departments/internal-medicine', icon: Stethoscope },
      { label: 'ศัลยกรรม', path: '/departments/surgery', icon: Scissors },
      { label: 'สูติกรรม', path: '/departments/obstetrics', icon: Baby },
      { label: 'นรีเวชกรรม', path: '/departments/gynecology', icon: WomanIcon as unknown as LucideIcon },
      { label: 'กุมารเวชกรรม', path: '/departments/pediatrics', icon: SmilePlus },
      { label: 'ทันตกรรม', path: '/departments/dentistry', icon: ToothIcon as unknown as LucideIcon },
      { label: 'แพทย์แผนไทย', path: '/departments/thai-traditional', icon: Leaf },
      { label: 'เวชศาสตร์ฉุกเฉิน', path: '/departments/emergency', icon: Siren },
    ],
  },
  { label: 'ข้อมูลประชากร', path: '/demographics', icon: Users },
]

const TABLET_BREAKPOINT = 1024

export function AppSidebar() {
  const location = useLocation()

  const [collapsed, setCollapsed] = useState(() => window.innerWidth < TABLET_BREAKPOINT)
  const [userOverride, setUserOverride] = useState(false)
  const [openMenus, setOpenMenus] = useState<Set<string>>(() => {
    return location.pathname.startsWith('/departments')
      ? new Set(['/departments'])
      : new Set()
  })

  // Flyout state for collapsed mode
  const [flyoutPath, setFlyoutPath] = useState<string | null>(null)
  const [flyoutY, setFlyoutY] = useState(0)
  const flyoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleResize = useCallback(() => {
    const isTablet = window.innerWidth < TABLET_BREAKPOINT
    if (isTablet) {
      setCollapsed(true)
      setUserOverride(false)
    } else if (!userOverride) {
      setCollapsed(false)
    }
  }, [userOverride])

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  // Auto-open parent menu when navigating to a child route
  useEffect(() => {
    if (location.pathname.startsWith('/departments')) {
      setOpenMenus((prev) => new Set([...prev, '/departments']))
    }
  }, [location.pathname])

  // Close flyout when sidebar expands
  useEffect(() => {
    if (!collapsed) setFlyoutPath(null)
  }, [collapsed])

  const toggleCollapsed = () => {
    setUserOverride(true)
    setCollapsed((c) => !c)
  }

  const toggleMenu = (path: string) => {
    setOpenMenus((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const openFlyout = (path: string, el: HTMLElement) => {
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current)
    const rect = el.getBoundingClientRect()
    setFlyoutY(rect.top)
    setFlyoutPath(path)
  }

  const closeFlyout = () => {
    flyoutTimerRef.current = setTimeout(() => setFlyoutPath(null), 120)
  }

  const keepFlyout = () => {
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current)
  }

  const flyoutItem = flyoutPath
    ? NAV_ITEMS.find((i) => i.path === flyoutPath) ?? null
    : null

  return (
    <>
      <aside
        className={cn(
          'signature-gradient flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden h-full relative z-20',
          collapsed ? 'w-14' : 'w-56',
        )}
      >
        {/* ── Collapse toggle ───────────────────────────────────── */}
        <div className="px-2 pt-3 pb-1">
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/50 hover:bg-white/10 hover:text-white transition-all duration-200"
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

        {/* ── Nav items ─────────────────────────────────────────── */}
        <nav className="flex flex-col gap-0.5 flex-1 px-2 pt-1 pb-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const hasChildren = !!item.children?.length
            const isParentActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)
            const isOpen = openMenus.has(item.path)

            return (
              <div key={item.path}>
                {/* Parent item */}
                {hasChildren ? (
                  collapsed ? (
                    // Collapsed: icon only + flyout on hover
                    <div
                      className="relative"
                      onMouseEnter={(e) => openFlyout(item.path, e.currentTarget)}
                      onMouseLeave={closeFlyout}
                    >
                      <Link
                        to={item.path}
                        title={item.label}
                        className={cn(
                          'relative flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                          isParentActive
                            ? 'bg-white/20 text-white'
                            : 'text-white/60 hover:bg-white/10 hover:text-white',
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {/* dot indicator: has sub-items */}
                        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-white/60" />
                        {isParentActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-white/80" />
                        )}
                      </Link>
                    </div>
                  ) : (
                    // Expanded: link + separate chevron toggle
                    <div
                      className={cn(
                        'relative flex items-center rounded-lg text-sm font-semibold transition-all duration-200',
                        isParentActive
                          ? 'bg-white/20 text-white'
                          : 'text-white/60 hover:bg-white/10 hover:text-white',
                      )}
                    >
                      <Link
                        to={item.path}
                        className="flex flex-1 items-center gap-3 px-3 py-2.5"
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1 text-left whitespace-nowrap overflow-hidden">
                          {item.label}
                        </span>
                      </Link>
                      <button
                        onClick={() => toggleMenu(item.path)}
                        className="px-2 py-2.5 hover:text-white"
                      >
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 shrink-0 transition-transform duration-200',
                            isOpen ? 'rotate-180' : '',
                          )}
                        />
                      </button>
                      {isParentActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-white/80" />
                      )}
                    </div>
                  )
                ) : (
                  <Link
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                      isParentActive
                        ? 'bg-white/20 text-white'
                        : 'text-white/60 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span
                      className={cn(
                        'whitespace-nowrap overflow-hidden transition-all duration-300',
                        collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
                      )}
                    >
                      {item.label}
                    </span>
                    {isParentActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-white/80" />
                    )}
                  </Link>
                )}

                {/* Sub-menu — only when expanded and open */}
                {hasChildren && !collapsed && isOpen && (
                  <div className="ml-4 mt-0.5 mb-1 border-l border-white/20 pl-2 flex flex-col gap-0.5">
                    {item.children!.map((child) => {
                      const ChildIcon = child.icon
                      const isChildActive = location.pathname === child.path
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={cn(
                            'relative flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium transition-all duration-200',
                            isChildActive
                              ? 'bg-white/20 text-white'
                              : 'text-white/50 hover:bg-white/10 hover:text-white',
                          )}
                        >
                          <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{child.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>

      {/* ── Collapsed flyout panel (fixed, rendered outside aside) ── */}
      {collapsed && flyoutItem && (
        <div
          className="fixed z-[200] ml-1"
          style={{ left: 56, top: flyoutY }}
          onMouseEnter={keepFlyout}
          onMouseLeave={closeFlyout}
        >
          <div className="signature-gradient rounded-lg shadow-xl border border-white/10 py-1.5 min-w-44">
            {/* Parent label */}
            <Link
              to={flyoutItem.path}
              onClick={() => setFlyoutPath(null)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors',
                location.pathname === flyoutItem.path
                  ? 'text-white'
                  : 'text-white/70 hover:text-white',
              )}
            >
              <flyoutItem.icon className="h-3.5 w-3.5 shrink-0" />
              <span>{flyoutItem.label}</span>
            </Link>
            <div className="mx-3 mb-1 border-t border-white/15" />
            {/* Sub-items */}
            {flyoutItem.children!.map((child) => {
              const ChildIcon = child.icon
              const isChildActive = location.pathname === child.path
              return (
                <Link
                  key={child.path}
                  to={child.path}
                  onClick={() => setFlyoutPath(null)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors',
                    isChildActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/60 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>{child.label}</span>
                  {isChildActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/80" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
