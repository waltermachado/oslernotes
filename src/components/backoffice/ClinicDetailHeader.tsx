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
        <Link to="/backoffice/clinicas" className="p-2 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold leading-tight">{props.nome}</h2>
          <div className="text-sm text-gray-400">CNPJ {props.cnpj}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
            props.ativa ? 'bg-green-500/10 text-brand-green border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20',
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
                ? 'bg-brand-blue/10 text-brand-blue border-blue-500/20'
                : 'bg-gray-500/10 text-gray-300 border-gray-500/20',
          )}
        >
          {props.planLabel(tier)}
        </span>
      </div>
    </div>
  )
}

