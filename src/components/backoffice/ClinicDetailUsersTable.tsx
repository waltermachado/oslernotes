import React from 'react'

import { cn } from '../../lib/utils'

export type ClinicUserRow = {
  id: string
  nome: string
  email: string
  papel: 'admin' | 'medico' | 'atendente' | 'super_admin'
  ativo: boolean
}

export default function ClinicDetailUsersTable(props: { users: ClinicUserRow[] }) {
  return (
    <div className="bg-surface border border-cream-300 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-cream-300">
        <div className="text-sm font-semibold">Contas da clínica</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/20 text-ink-500">
            <tr>
              <th className="px-6 py-3 font-medium">Nome</th>
              <th className="px-6 py-3 font-medium">Role</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-300">
            {props.users.map((u) => (
              <tr key={u.id} className="hover:bg-white/5">
                <td className="px-6 py-3">
                  <div className="text-ink-900 font-medium">{u.nome}</div>
                  <div className="text-xs text-ink-500">{u.email}</div>
                </td>
                <td className="px-6 py-3 text-ink-700">{u.papel}</td>
                <td className="px-6 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
                      u.ativo ? 'bg-sage-50 text-sage-400 border-sage-100' : 'bg-rose-50 text-rose-400 border-rose-100',
                    )}
                  >
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

