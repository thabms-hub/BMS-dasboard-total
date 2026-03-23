// =============================================================================
// Theme Context — dark / light toggle with localStorage persistence
// =============================================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'light' | 'dark'
type ColorTheme = 'blue' | 'green' | 'orange'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  colorTheme: ColorTheme
  setColorTheme: (color: ColorTheme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
  colorTheme: 'blue',
  setColorTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('bms-theme') as Theme | null
    if (stored === 'dark' || stored === 'light') return stored
    // Respect OS preference as default
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  })

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const stored = localStorage.getItem('bms-color-theme') as ColorTheme | null
    if (stored === 'green' || stored === 'orange') return stored
    return 'blue'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('bms-theme', theme)
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    // Remove any previous color attribute, then set the new one
    root.removeAttribute('data-color')
    if (colorTheme !== 'blue') {
      root.setAttribute('data-color', colorTheme)
    }
    localStorage.setItem('bms-color-theme', colorTheme)
  }, [colorTheme])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  const setColorTheme = (color: ColorTheme) => setColorThemeState(color)

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
