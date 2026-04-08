// =============================================================================
// BMS Session KPI Dashboard - App Header (T046)
// Professional navigation header — dark blue signature gradient + theme toggle.
// =============================================================================

import { useLocation } from 'react-router-dom';
import { useBmsSessionContext } from '@/contexts/BmsSessionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LogOut, Moon, Sun } from 'lucide-react';

// Page title map
const PAGE_TITLES: Record<string, string> = {
  '/': 'ภาพรวม',
  '/trends': 'แนวโน้ม',
  '/appointments': 'ระบบนัดหมาย',
  '/departments': 'แผนก',
  '/demographics': 'ข้อมูลประชากร',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppHeader() {
  const { session, disconnectSession } = useBmsSessionContext();
  const { theme, toggleTheme, colorTheme, setColorTheme } = useTheme();
  const location = useLocation();

  const databaseLabel =
    session?.databaseType === 'postgresql' ? 'PostgreSQL' : 'MySQL';

  const userInitial = session?.userInfo.name?.charAt(0).toUpperCase() ?? '?';

  const pageTitle = PAGE_TITLES[location.pathname] ?? '';

  return (
    <header className="signature-gradient sticky top-0 z-50 flex h-16 items-center justify-between px-6 shadow-md">
      {/* ----------------------------------------------------------------- */}
      {/* Left: Hospital logo + title + current page                        */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center gap-3">
        {/* BMS-style inline SVG logo — no external file needed */}
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 rounded-lg shadow-sm"
          aria-label="BMS Logo"
        >
          {/* Background */}
          <defs>
            <linearGradient id="bmsLogoGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <rect width="36" height="36" rx="8" fill="url(#bmsLogoGrad)" />

          {/* Medical cross */}
          <rect x="15.5" y="7" width="5" height="15" rx="2" fill="white" fillOpacity="0.95" />
          <rect x="8" y="13.5" width="20" height="5" rx="2" fill="white" fillOpacity="0.95" />

          {/* BMS text */}
          <text
            x="18"
            y="33"
            textAnchor="middle"
            fontSize="6"
            fontWeight="700"
            fontFamily="'Arial', sans-serif"
            letterSpacing="0.8"
            fill="white"
            fillOpacity="0.85"
          >
            BMS
          </text>
        </svg>
        <div className="flex flex-col">
          <h1 className="text-base font-extrabold leading-tight tracking-tight text-white">
            {session?.userInfo.location || 'โรงพยาบาล'}
          </h1>
          {pageTitle && (
            <span className="text-xs text-white/60 leading-tight">{pageTitle}</span>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Right: Theme toggle, connection status, DB badge, user, disconnect */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center gap-3">
        {/* Color theme swatches */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setColorTheme('blue')}
            title="ธีมสีน้ำเงิน"
            className={`h-5 w-5 rounded-full bg-blue-500 ring-offset-1 transition-all ${
              colorTheme === 'blue'
                ? 'ring-2 ring-white/80 scale-110'
                : 'opacity-60 hover:opacity-90'
            }`}
          />
          <button
            onClick={() => setColorTheme('green')}
            title="ธีมสีเขียว"
            className={`h-5 w-5 rounded-full bg-green-500 ring-offset-1 transition-all ${
              colorTheme === 'green'
                ? 'ring-2 ring-white/80 scale-110'
                : 'opacity-60 hover:opacity-90'
            }`}
          />
          <button
            onClick={() => setColorTheme('orange')}
            title="ธีมสีส้ม"
            className={`h-5 w-5 rounded-full bg-orange-500 ring-offset-1 transition-all ${
              colorTheme === 'orange'
                ? 'ring-2 ring-white/80 scale-110'
                : 'opacity-60 hover:opacity-90'
            }`}
          />
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'เปลี่ยนเป็น Dark Mode' : 'เปลี่ยนเป็น Light Mode'}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all hover:bg-white/20 hover:text-white"
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </button>

        {session && (
          <>
            {/* Divider */}
            <div className="h-6 w-px bg-white/15" />

            {/* Connection status */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
              </span>
              <span className="text-xs font-medium text-white/80">
                เชื่อมต่อแล้ว
              </span>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-white/15" />

            {/* Database badge */}
            <span className="inline-flex items-center rounded-md border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/90">
              {databaseLabel}
            </span>

            {/* Divider */}
            <div className="h-6 w-px bg-white/15" />

            {/* User avatar + info */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
                {userInitial}
              </div>
              <div className="flex flex-col text-right">
                <span className="text-sm font-semibold leading-tight text-white">
                  {session.userInfo.name}
                </span>
                <span className="text-[11px] leading-tight text-white/50">
                  {session.userInfo.department}
                </span>
              </div>
            </div>

            {/* Disconnect button */}
            <button
              onClick={disconnectSession}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-white/60 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              ยกเลิกการเชื่อมต่อ
            </button>
          </>
        )}
      </div>
    </header>
  );
}
