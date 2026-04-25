import React from 'react'

export type ClinicInvoiceRow = {
  id: string
  status: string
  amount_cents: number | null
  currency: string
  created_at: string
}

export default function ClinicDetailPaymentsTable(props: { invoices: ClinicInvoiceRow[] }) {
  return (
    <div className="bg-dark-card border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="text-sm font-semibold">Histórico de pagamentos</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/20 text-gray-500">
            <tr>
              <th className="px-6 py-3 font-medium">Data</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {props.invoices.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-6 text-gray-500">
                  Sem faturas registradas.
                </td>
              </tr>
            ) : (
              props.invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/5">
                  <td className="px-6 py-3 text-gray-300">{new Date(inv.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-3 text-gray-300">{inv.status}</td>
                  <td className="px-6 py-3 text-gray-300">
                    {inv.amount_cents != null
                      ? (inv.amount_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: inv.currency || 'BRL' })
                      : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

