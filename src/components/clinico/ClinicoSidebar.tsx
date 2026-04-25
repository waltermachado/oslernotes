import { LogOut } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'

import { cn } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { navForRole, type ClinicoRole } from '../../utils/clinicoNav'

export default function ClinicoSidebar(props: { role: ClinicoRole; userName: string; userSubtitle: string; basePath?: string }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const items = navForRole(props.role, props.basePath ?? '/clinico')

  async function onLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-[260px] shrink-0 border-r border-gray-800 bg-dark-card/20">
      <div className="h-16 px-5 flex items-center gap-3 border-b border-gray-800">
        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center overflow-hidden">
          <span className="text-brand-blue font-bold">O</span>
        </div>
        <div className="leading-tight">
          <div className="text-white font-semibold tracking-tight">Osler</div>
          <div className="text-[10px] text-gray-400 tracking-[0.22em] uppercase">Health System</div>
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
                    isActive ? 'bg-brand-blue/15 text-white' : 'text-gray-300 hover:bg-gray-800/40 hover:text-white',
                  )
                }
                end
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        isActive ? 'bg-brand-blue/20 text-brand-blue' : 'bg-gray-800/30 text-gray-400 group-hover:text-gray-200',
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
        <div className="border-t border-gray-800 pt-4">
          <div className="flex items-center gap-3 rounded-2xl bg-dark-input/70 border border-gray-800 px-3 py-3">
            <div className="w-9 h-9 rounded-full bg-gray-700/60 flex items-center justify-center text-xs font-semibold text-gray-100">
              {initials(props.userName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{props.userName}</div>
              <div className="text-xs text-gray-400 truncate">{props.userSubtitle}</div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/40 transition-colors"
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

function initials(value: string) {
  const cleaned = String(value ?? '').trim()
  if (!cleaned) return 'U'
  const parts = cleaned.split(/\s+/g).filter(Boolean)
  const first = parts[0]?.[0] ?? 'U'
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : ''
  return (first + last).toUpperCase()
}
