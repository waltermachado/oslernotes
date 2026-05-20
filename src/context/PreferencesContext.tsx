import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'
export type DisplayFont = 'courgette' | 'caveat' | 'pacifico'

const FONTS: Record<DisplayFont, string> = {
  courgette: '"Courgette", cursive',
  caveat:    '"Caveat", cursive',
  pacifico:  '"Pacifico", cursive',
}

type PreferencesCtx = {
  theme: Theme
  setTheme: (t: Theme) => void
  font: DisplayFont
  setFont: (f: DisplayFont) => void
}

const Ctx = createContext<PreferencesCtx>(null!)

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('osler.theme') as Theme) ?? 'light'
  )
  const [font, setFontState] = useState<DisplayFont>(
    () => (localStorage.getItem('osler.displayFont') as DisplayFont) ?? 'courgette'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '')
    localStorage.setItem('osler.theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--font-display', FONTS[font])
    localStorage.setItem('osler.displayFont', font)
  }, [font])

  return (
    <Ctx.Provider value={{ theme, setTheme: setThemeState, font, setFont: setFontState }}>
      {children}
    </Ctx.Provider>
  )
}

export const usePreferences = () => useContext(Ctx)
