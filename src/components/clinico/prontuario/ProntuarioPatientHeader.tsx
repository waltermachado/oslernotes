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
    <div className="bg-dark-card border border-gray-800/50 rounded-2xl overflow-hidden">
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-brand-blue/15 overflow-hidden flex items-center justify-center">
              {props.patient.foto_url ? (
                <img src={props.patient.foto_url} className="w-full h-full object-cover" />
              ) : (
                <span className="text-brand-blue font-bold text-xl">{props.patient.nome_completo.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-white truncate">{props.patient.nome_completo}</h1>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-500/10 text-brand-green border border-green-500/20">Ativo</span>
              </div>
              <div className="mt-1 flex items-center gap-3 flex-wrap text-sm text-gray-400">
                <span>
                  {age} anos{props.patient.sexo ? ` • ${props.patient.sexo}` : ''}
                </span>
                {maskedCpf ? <span>CPF: {maskedCpf}</span> : <span>CPF não informado</span>}
                {props.patient.convenio ? (
                  <span className="px-2 py-0.5 rounded-lg bg-gray-800/40 border border-gray-800 text-xs text-gray-200">
                    Convênio: {props.patient.convenio}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/clinico/pacientes"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900/40 border border-gray-800 text-gray-200 hover:bg-gray-900/60"
            >
              <Pencil className="w-4 h-4" />
              Editar cadastro
            </Link>
            <button
              type="button"
              onClick={props.onExport}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-blue text-white hover:bg-blue-600"
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

