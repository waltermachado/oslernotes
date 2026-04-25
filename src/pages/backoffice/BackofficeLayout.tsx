import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, Building2, ClipboardList, CreditCard, LogOut } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/backoffice/clinicas', label: 'Clínicas', icon: Building2 },
  { to: '/backoffice/planos', label: 'Planos & Limites', icon: CreditCard },
  { to: '/backoffice/auditoria', label: 'Auditoria', icon: ClipboardList },
  { to: '/backoffice/notificacoes', label: 'Notificações', icon: Bell },
]

export default function BackofficeLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <header className="bg-dark-card border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center font-bold text-white">O</div>
            <div className="flex flex-col">
              <div className="text-lg font-bold tracking-tight leading-tight">
                OSLER <span className="text-gray-500 font-normal">| Backoffice</span>
              </div>
              <div className="text-xs text-gray-500 leading-tight">Super Admin</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-right hidden sm:block">
              <p className="font-medium">{user?.nome || 'Super Admin'}</p>
              <p className="text-gray-400 text-xs">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <aside className="bg-dark-card border border-gray-800 rounded-2xl p-3 h-fit">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors',
                    isActive
                      ? 'bg-white/5 text-white border border-gray-800'
                      : 'text-gray-300 hover:text-white hover:bg-white/5',
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

