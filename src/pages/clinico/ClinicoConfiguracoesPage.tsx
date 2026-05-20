import { usePreferences, type DisplayFont, type Theme } from '../../context/PreferencesContext'

type FontOption = { id: DisplayFont; label: string; sample: string; desc: string }
type ThemeOption = { id: Theme; label: string; desc: string; bgClass: string; textClass: string; borderClass: string }

const FONT_OPTIONS: FontOption[] = [
  { id: 'courgette', label: 'Courgette', sample: 'Osler Notes', desc: 'Padrão — script amigável, ritmo uniforme' },
  { id: 'caveat',    label: 'Caveat',    sample: 'Osler Notes', desc: 'Caligrafia clínica — mais legível em tamanhos pequenos' },
  { id: 'pacifico',  label: 'Pacifico',  sample: 'Osler Notes', desc: 'Retro-script — presença visual mais forte' },
]

const THEME_OPTIONS: ThemeOption[] = [
  { id: 'light', label: 'Claro',  desc: 'Fundo creme, tinta navy — ótimo para uso diurno',    bgClass: 'bg-cream-100', textClass: 'text-ink-900', borderClass: 'border-cream-300' },
  { id: 'dark',  label: 'Escuro', desc: 'Fundo escuro, texto creme — confortável à noite',     bgClass: 'bg-navy-800',  textClass: 'text-cream-50', borderClass: 'border-navy-600' },
]

const FONT_FAMILIES: Record<DisplayFont, string> = {
  courgette: '"Courgette", cursive',
  caveat:    '"Caveat", cursive',
  pacifico:  '"Pacifico", cursive',
}

export default function ClinicoConfiguracoesPage() {
  const { theme, setTheme, font, setFont } = usePreferences()

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-normal text-ink-900 text-5xl">Configurações</h1>
          <p className="text-ink-500 text-sm mt-1">Personalize a aparência do sistema</p>
        </div>

        {/* Theme section */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-ink-700 uppercase tracking-[0.18em] mb-4">Tema</h2>
          <div className="grid grid-cols-2 gap-3">
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTheme(opt.id)}
                  className={[
                    'rounded-2xl border-2 p-4 text-left transition-all',
                    active ? 'border-navy-500 shadow-ring' : 'border-cream-300 hover:border-navy-300',
                  ].join(' ')}
                >
                  <div className={`rounded-xl ${opt.bgClass} ${opt.borderClass} border h-12 mb-3 flex items-center px-3 gap-2`}>
                    <div className={`w-3 h-3 rounded-full border ${opt.borderClass} ${opt.bgClass === 'bg-navy-800' ? 'bg-navy-600' : 'bg-cream-300'}`} />
                    <div className={`h-2 rounded-full flex-1 ${opt.bgClass === 'bg-navy-800' ? 'bg-navy-600' : 'bg-cream-300'}`} />
                  </div>
                  <div className={`text-sm font-semibold mb-0.5 ${active ? 'text-navy-500' : 'text-ink-800'}`}>{opt.label}</div>
                  <div className="text-xs text-ink-500">{opt.desc}</div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Font section */}
        <section>
          <h2 className="text-base font-bold text-ink-700 uppercase tracking-[0.18em] mb-4">Fonte dos Títulos</h2>
          <div className="flex flex-col gap-3">
            {FONT_OPTIONS.map((opt) => {
              const active = font === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFont(opt.id)}
                  className={[
                    'rounded-2xl border-2 p-4 flex items-center gap-4 text-left transition-all',
                    active ? 'border-navy-500 bg-navy-50 shadow-ring' : 'border-cream-300 bg-surface hover:border-navy-300',
                  ].join(' ')}
                >
                  <span
                    className="text-3xl text-ink-900 flex-shrink-0 w-32 text-center leading-none"
                    style={{ fontFamily: FONT_FAMILIES[opt.id] }}
                  >
                    {opt.sample}
                  </span>
                  <div className="min-w-0">
                    <div className={`text-sm font-semibold mb-0.5 ${active ? 'text-navy-500' : 'text-ink-800'}`}>{opt.label}</div>
                    <div className="text-xs text-ink-500">{opt.desc}</div>
                  </div>
                  {active && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-navy-500 flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#FBF9F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
