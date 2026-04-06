// =============================================================================
// App Sidebar - Collapsible left navigation with sub-menu support
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Activity,
  Baby,
  Bed,
  CalendarCheck2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Infinity,
  LayoutDashboard,
  Leaf,
  Microscope,
  Package,
  Pill,
  Scan,
  Scissors,
  Send,
  Siren,
  Sprout,
  Star,
  Stethoscope,
  Sun,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    label: 'งานผู้ป่วยนอก OPD',
    path: '/opd',
    icon: Stethoscope,
    children: [
      { label: 'งานคัดกรอง OPD Screen', path: '/opd/screen', icon: ClipboardCheck },
      { label: 'งานห้องตรวจแพทย์', path: '/opd/exam-room', icon: Stethoscope },
      { label: 'งานคลินิกพิเศษ', path: '/opd/special-clinic', icon: Star },
      { label: 'ระบบนัดหมาย', path: '/opd/appointments', icon: CalendarCheck2 },
      { label: 'งานอุบัติเหตุและฉุกเฉิน ER', path: '/opd/emergency', icon: Siren },
      { label: 'งานส่งต่อผู้ป่วย Refer', path: '/opd/refer', icon: Send },
    ],
  },
  {
    label: 'งานผู้ป่วยใน IPD',
    path: '/ipd',
    icon: Bed,
    children: [
      { label: 'ผู้ป่วยใน', path: '/ipd/inpatient', icon: Bed },
      { label: 'ห้องคลอด', path: '/ipd/delivery', icon: Baby },
    ],
  },
  {
    label: 'งานเภสัชกรรม',
    path: '/pharmacy',
    icon: Pill,
    children: [
      { label: 'ห้องยาผู้ป่วยนอก', path: '/pharmacy/opd', icon: Pill },
      { label: 'ห้องยาผู้ป่วยใน', path: '/pharmacy/ipd', icon: Package },
    ],
  },
  {
    label: 'ระบบสนับสนุน',
    path: '/support',
    icon: Infinity,
    children: [
      { label: 'ระบบทันตกรรม', path: '/support/dentistry', icon: ToothIcon as unknown as LucideIcon },
      { label: 'งานห้องปฏิบัติการ Lab', path: '/support/lab', icon: Microscope },
      { label: 'งานรังสีวิทยา X-Ray', path: '/support/xray', icon: Scan },
      { label: 'ระบบห้องผ่าตัด OR', path: '/support/or', icon: Scissors },
    ],
  },
  {
    label: 'งานแพทย์ทางเลือก',
    path: '/alternative',
    icon: Sprout,
    children: [
      { label: 'งานกายภาพบำบัด', path: '/alternative/physiotherapy', icon: Activity },
      { label: 'งานแพทย์แผนไทย', path: '/alternative/thai-traditional', icon: Leaf },
      { label: 'งานแพทย์แผนจีน', path: '/alternative/chinese-medicine', icon: Sun },
    ],
  },
]

/** Check if a child path matches the current location */
function isChildPathActive(childPath: string, pathname: string): boolean {
  return pathname === childPath || pathname.startsWith(childPath + '/')
}

/** Check if a nav group (with children) should be considered active */
function isGroupActive(item: NavItem, pathname: string): boolean {
  if (pathname.startsWith(item.path + '/') || pathname === item.path) return true
  return item.children?.some((c) => isChildPathActive(c.path, pathname)) ?? false
}

const TABLET_BREAKPOINT = 1024

export function AppSidebar() {
  const location = useLocation()

  const [collapsed, setCollapsed] = useState(() => window.innerWidth < TABLET_BREAKPOINT)
  const [userOverride, setUserOverride] = useState(false)
  const [openMenus, setOpenMenus] = useState<Set<string>>(() => {
    for (const item of NAV_ITEMS) {
      if (item.children && isGroupActive(item, location.pathname)) {
        return new Set([item.path])
      }
    }
    return new Set()
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

  // Auto-open parent group when navigating to a child route
  useEffect(() => {
    for (const item of NAV_ITEMS) {
      if (item.children && isGroupActive(item, location.pathname)) {
        setOpenMenus((prev) => new Set([...prev, item.path]))
        break
      }
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
              : isGroupActive(item, location.pathname)
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
                        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-white/60" />
                        {isParentActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-white/80" />
                        )}
                      </Link>
                    </div>
                  ) : (
                    // Expanded: full-row toggle button (click anywhere to open/close)
                    <button
                      onClick={() => toggleMenu(item.path)}
                      className={cn(
                        'relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                        isParentActive
                          ? 'bg-white/20 text-white'
                          : 'text-white/60 hover:bg-white/10 hover:text-white',
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1 text-left whitespace-nowrap overflow-hidden">
                        {item.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 transition-transform duration-200',
                          isOpen ? 'rotate-180' : '',
                        )}
                      />
                      {isParentActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-white/80" />
                      )}
                    </button>
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
                      const isChildActive = isChildPathActive(child.path, location.pathname)
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
          <div className="signature-gradient rounded-lg shadow-xl border border-white/10 py-1.5 min-w-52">
            <Link
              to={flyoutItem.path}
              onClick={() => setFlyoutPath(null)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors',
                isGroupActive(flyoutItem, location.pathname)
                  ? 'text-white'
                  : 'text-white/70 hover:text-white',
              )}
            >
              <flyoutItem.icon className="h-3.5 w-3.5 shrink-0" />
              <span>{flyoutItem.label}</span>
            </Link>
            <div className="mx-3 mb-1 border-t border-white/15" />
            {flyoutItem.children!.map((child) => {
              const ChildIcon = child.icon
              const isChildActive = isChildPathActive(child.path, location.pathname)
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
