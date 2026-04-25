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
    <div className="bg-dark-card border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="text-sm font-semibold">Contas da clínica</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/20 text-gray-500">
            <tr>
              <th className="px-6 py-3 font-medium">Nome</th>
              <th className="px-6 py-3 font-medium">Role</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {props.users.map((u) => (
              <tr key={u.id} className="hover:bg-white/5">
                <td className="px-6 py-3">
                  <div className="text-gray-100 font-medium">{u.nome}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </td>
                <td className="px-6 py-3 text-gray-300">{u.papel}</td>
                <td className="px-6 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
                      u.ativo ? 'bg-green-500/10 text-brand-green border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20',
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

