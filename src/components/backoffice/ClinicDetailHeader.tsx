import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { cn } from '../../lib/utils'

export default function ClinicDetailHeader(props: {
  clinicId: string
  nome: string
  cnpj: string
  ativa: boolean
  planoAssinatura: string
  planLabel: (value: string) => string
}) {
  const tier = String(props.planoAssinatura || 'bronze')

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Link to="/backoffice/clinicas" className="p-2 rounded-xl hover:bg-white/5 text-ink-700 hover:text-ink-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold leading-tight">{props.nome}</h2>
          <div className="text-sm text-ink-500">CNPJ {props.cnpj}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
            props.ativa ? 'bg-sage-50 text-sage-400 border-sage-100' : 'bg-rose-50 text-rose-400 border-rose-100',
          )}
        >
          {props.ativa ? 'Ativa' : 'Inativa'}
        </span>
        <span
          className={cn(
            'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
            tier === 'ouro'
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
              : tier === 'prata'
                ? 'bg-navy-500/10 text-navy-500 border-blue-500/20'
                : 'bg-ink-400/10 text-ink-700 border-gray-500/20',
          )}
        >
          {props.planLabel(tier)}
        </span>
      </div>
    </div>
  )
}

