import { FileDown, Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { PatientRecordBase } from './prontuarioTypes'
import { calcAge, maskCpf } from './prontuarioFormat'

export default function ProntuarioPatientHeader(props: {
  patient: PatientRecordBase
  onExport: () => void
}) {
  const age = calcAge(props.patient.data_nascimento)
  const maskedCpf = maskCpf(props.patient.cpf)

  return (
    <div className="bg-surface border border-cream-300/50 rounded-2xl overflow-hidden">
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-navy-500/15 overflow-hidden flex items-center justify-center">
              {props.patient.foto_url ? (
                <img src={props.patient.foto_url} className="w-full h-full object-cover" />
              ) : (
                <span className="text-navy-500 font-bold text-xl">{props.patient.nome_completo.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-ink-900 truncate">{props.patient.nome_completo}</h1>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sage-50 text-sage-400 border border-sage-100">Ativo</span>
              </div>
              <div className="mt-1 flex items-center gap-3 flex-wrap text-sm text-ink-500">
                <span>
                  {age} anos{props.patient.sexo ? ` • ${props.patient.sexo}` : ''}
                </span>
                {maskedCpf ? <span>CPF: {maskedCpf}</span> : <span>CPF não informado</span>}
                {props.patient.convenio ? (
                  <span className="px-2 py-0.5 rounded-lg bg-cream-200/60 border border-cream-300 text-xs text-ink-700">
                    Convênio: {props.patient.convenio}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/clinico/pacientes"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900/40 border border-cream-300 text-ink-700 hover:bg-gray-900/60"
            >
              <Pencil className="w-4 h-4" />
              Editar cadastro
            </Link>
            <button
              type="button"
              onClick={props.onExport}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-navy-500 text-ink-900 hover:bg-navy-600"
            >
              <FileDown className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

