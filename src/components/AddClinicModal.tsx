import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Building, User, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AddClinicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ClinicFormData {
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  nome_responsavel: string;
  especialidade_principal: string;
  horario_funcionamento: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export default function AddClinicModal({ isOpen, onClose, onSuccess }: AddClinicModalProps) {
  const { register, handleSubmit, reset, setValue } = useForm<ClinicFormData>();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
  };

  const onSubmit = async (data: ClinicFormData) => {
    setIsLoading(true);
    setErrorMsg('');

    const endereco = {
      cep: data.cep,
      logradouro: data.logradouro,
      numero: data.numero,
      bairro: data.bairro,
      cidade: data.cidade,
      estado: data.estado,
    };

    const payload = {
      nome: data.nome,
      cnpj: data.cnpj.replace(/\D/g, ''), // Send clean CNPJ
      telefone: data.telefone,
      email: data.email,
      nome_responsavel: data.nome_responsavel,
      especialidade_principal: data.especialidade_principal,
      horario_funcionamento: data.horario_funcionamento,
      endereco,
    };

    try {
      const cleanCnpj = String(payload.cnpj).replace(/\D/g, '')
      if (cleanCnpj.length !== 14) {
        throw new Error('CNPJ inválido')
      }

      // Verifica se CNPJ já existe
      const { data: existing } = await supabase
        .from('clinicas')
        .select('id')
        .eq('cnpj', cleanCnpj)
        .maybeSingle()

      if (existing) {
        throw new Error('Já existe uma clínica com este CNPJ')
      }

      const { error: insertError } = await supabase
        .from('clinicas')
        .insert({
          nome: payload.nome,
          cnpj: cleanCnpj,
          telefone: payload.telefone,
          email: payload.email,
          nome_responsavel: payload.nome_responsavel,
          especialidade_principal: payload.especialidade_principal,
          horario_funcionamento: payload.horario_funcionamento,
          endereco: payload.endereco,
        })

      if (insertError) {
        const isDup = (insertError as { code?: string }).code === '23505'
        throw new Error(isDup ? 'Já existe uma clínica com este CNPJ' : insertError.message)
      }

      reset();
      onSuccess();
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Ocorreu um erro desconhecido.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-3xl rounded-2xl shadow-2xl border border-cream-300 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-cream-300">
          <h2 className="text-xl font-semibold text-ink-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-navy-500" />
            Nova Clínica
          </h2>
          <button 
            onClick={onClose}
            className="text-ink-500 hover:text-ink-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {errorMsg && (
            <div className="mb-6 bg-rose-50 border border-rose-100 text-rose-400 text-sm p-4 rounded-xl">
              {errorMsg}
            </div>
          )}

          <form id="clinicForm" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Dados da Clínica */}
            <section>
              <h3 className="text-sm font-medium text-ink-500 mb-4 uppercase tracking-wider">Dados da Clínica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-ink-700 mb-1.5">Nome Fantasia / Razão Social *</label>
                  <input
                    {...register('nome', { required: true })}
                    className="w-full bg-sunken border border-cream-300 rounded-xl px-4 py-2.5 text-ink-900 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                  />
                </div>
                <div>
                  <label className="block text-sm text-ink-700 mb-1.5">CNPJ *</label>
                  <input
                    {...register('cnpj', { required: true })}
                    onChange={(e) => {
                      const formatted = formatCNPJ(e.target.value);
                      setValue('cnpj', formatted);
                    }}
                    className="w-full bg-sunken border border-cream-300 rounded-xl px-4 py-2.5 text-ink-900 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                  />
                </div>
                <div>
                  <label className="block text-sm text-ink-700 mb-1.5">Especialidade Principal</label>
                  <input
                    {...register('especialidade_principal')}
                    className="w-full bg-sunken border border-cream-300 rounded-xl px-4 py-2.5 text-ink-900 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                  />
                </div>
                <div>
                  <label className="block text-sm text-ink-700 mb-1.5">Horário de Funcionamento</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-ink-500" />
                    <input
                      {...register('horario_funcionamento')}
                      placeholder="Ex: Seg-Sex 08:00 - 18:00"
                      className="w-full bg-sunken border border-cream-300 rounded-xl pl-10 pr-4 py-2.5 text-ink-900 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Contato & Responsável */}
            <section>
              <h3 className="text-sm font-medium text-ink-500 mb-4 uppercase tracking-wider">Contato & Responsável</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-ink-700 mb-1.5">Nome do Responsável *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-ink-500" />
                    <input
                      {...register('nome_responsavel', { required: true })}
                      className="w-full bg-sunken border border-cream-300 rounded-xl pl-10 pr-4 py-2.5 text-ink-900 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-ink-700 mb-1.5">E-mail (Admin) *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-ink-500" />
                    <input
                      type="email"
                      {...register('email', { required: true })}
                      className="w-full bg-sunken border border-cream-300 rounded-xl pl-10 pr-4 py-2.5 text-ink-900 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-ink-700 mb-1.5">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-ink-500" />
                    <input
                      {...register('telefone')}
                      className="w-full bg-sunken border border-cream-300 rounded-xl pl-10 pr-4 py-2.5 text-ink-900 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Endereço */}
            <section>
              <h3 className="text-sm font-medium text-ink-500 mb-4 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Endereço
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm text-ink-700 mb-1.5">CEP</label>
                  <input
                    {...register('cep')}
                    onChange={(e) => setValue('cep', formatCEP(e.target.value))}
                    className="w-full bg-sunken border border-cream-300 rounded-xl px-4 py-2.5 text-ink-900 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-ink-700 mb-1.5">Logradouro</label>
                  <input
                    {...register('logradouro')}
                    className="w-full bg-sunken border border-cream-300 rounded-xl px-4 py-2.5 text-ink-900 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                  />
                </div>
                <div>
                  <label className="block text-sm text-ink-700 mb-1.5">Número</label>
                  <input
                    {...register('numero')}
                    className="w-full bg-sunken border border-cream-300 rounded-xl px-4 py-2.5 text-ink-900 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                  />
                </div>
                <div>
                  <label className="block text-sm text-ink-700 mb-1.5">Bairro</label>
                  <input
                    {...register('bairro')}
                    className="w-full bg-sunken border border-cream-300 rounded-xl px-4 py-2.5 text-ink-900 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm text-ink-700 mb-1.5">Cidade</label>
                    <input
                      {...register('cidade')}
                      className="w-full bg-sunken border border-cream-300 rounded-xl px-4 py-2.5 text-ink-900 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-ink-700 mb-1.5">UF</label>
                    <input
                      {...register('estado')}
                      maxLength={2}
                      className="w-full bg-sunken border border-cream-300 rounded-xl px-4 py-2.5 text-ink-900 uppercase focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                    />
                  </div>
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-cream-300 flex justify-end gap-3 bg-surface rounded-b-2xl mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-ink-700 hover:bg-cream-200 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="clinicForm"
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-navy-500 hover:bg-navy-600 text-ink-900 font-medium transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Salvar Clínica'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}