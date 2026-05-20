import React from 'react'

export type ClinicAuditRow = {
  id: string
  action: string
  entity_type: string
  created_at: string
}

export default function ClinicDetailAuditTable(props: { audit: ClinicAuditRow[] }) {
  return (
    <div className="bg-surface border border-cream-300 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-cream-300">
        <div className="text-sm font-semibold">Auditoria (últimos eventos)</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/20 text-ink-500">
            <tr>
              <th className="px-6 py-3 font-medium">Quando</th>
              <th className="px-6 py-3 font-medium">Ação</th>
              <th className="px-6 py-3 font-medium">Entidade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-300">
            {props.audit.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-6 text-ink-500">
                  Sem eventos.
                </td>
              </tr>
            ) : (
              props.audit.map((a) => (
                <tr key={a.id} className="hover:bg-white/5">
                  <td className="px-6 py-3 text-ink-700">{new Date(a.created_at).toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-3 text-ink-700 font-medium">{a.action}</td>
                  <td className="px-6 py-3 text-ink-500">{a.entity_type}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

