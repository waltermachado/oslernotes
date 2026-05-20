import { LogOut } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'

import { cn } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { navForRole, type ClinicoRole } from '../../utils/clinicoNav'
import Avatar from '../ui/Avatar'

export default function ClinicoSidebar(props: { role: ClinicoRole; userName: string; userSubtitle: string; basePath?: string }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const items = navForRole(props.role, props.basePath ?? '/clinico')

  async function onLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-[260px] shrink-0 border-r border-cream-300 bg-surface/20">
      <div className="h-16 px-5 flex items-center gap-3 border-b border-cream-300">
        <div className="w-9 h-9 rounded-full bg-cream-50 border border-cream-300 shadow-soft flex items-center justify-center overflow-hidden flex-shrink-0">
          <img src="/brand/oslerlogo.png" alt="Osler Notes" className="w-7 h-7 object-contain" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-ink-900 font-bold text-xs uppercase tracking-[0.18em] text-gold-500">Health System</div>
          <div className="text-ink-900 text-lg leading-none" style={{ fontFamily: 'var(--font-display)' }}>Osler Notes</div>
        </div>
      </div>

      <nav className="px-3 py-4">
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.key}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                    isActive ? 'bg-navy-500/15 text-ink-900' : 'text-ink-700 hover:bg-cream-200/60 hover:text-ink-800',
                  )
                }
                end
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        isActive ? 'bg-navy-500/20 text-navy-500' : 'bg-cream-200/40 text-ink-500 group-hover:text-ink-700',
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      <div className="mt-auto px-4 pb-4">
        <div className="border-t border-cream-300 pt-4">
          <div className="flex items-center gap-3 rounded-2xl bg-sunken/70 border border-cream-300 px-3 py-3">
            <Avatar name={props.userName} size={36} tone="navy" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{props.userName}</div>
              <div className="text-xs text-ink-500 truncate">{props.userSubtitle}</div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-xl text-ink-500 hover:text-ink-800 hover:bg-cream-200/60 transition-colors"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

