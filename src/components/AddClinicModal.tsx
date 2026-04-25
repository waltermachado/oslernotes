import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Building, User, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  const { session } = useAuth();

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
      const response = await fetch('/api/admin/clinics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar clínica');
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
      <div className="bg-dark-card w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-brand-blue" />
            Nova Clínica
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {errorMsg && (
            <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-xl">
              {errorMsg}
            </div>
          )}

          <form id="clinicForm" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Dados da Clínica */}
            <section>
              <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Dados da Clínica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Nome Fantasia / Razão Social *</label>
                  <input
                    {...register('nome', { required: true })}
                    className="w-full bg-dark-input border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">CNPJ *</label>
                  <input
                    {...register('cnpj', { required: true })}
                    onChange={(e) => {
                      const formatted = formatCNPJ(e.target.value);
                      setValue('cnpj', formatted);
                    }}
                    className="w-full bg-dark-input border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Especialidade Principal</label>
                  <input
                    {...register('especialidade_principal')}
                    className="w-full bg-dark-input border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Horário de Funcionamento</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <input
                      {...register('horario_funcionamento')}
                      placeholder="Ex: Seg-Sex 08:00 - 18:00"
                      className="w-full bg-dark-input border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Contato & Responsável */}
            <section>
              <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Contato & Responsável</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Nome do Responsável *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <input
                      {...register('nome_responsavel', { required: true })}
                      className="w-full bg-dark-input border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">E-mail (Admin) *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <input
                      type="email"
                      {...register('email', { required: true })}
                      className="w-full bg-dark-input border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <input
                      {...register('telefone')}
                      className="w-full bg-dark-input border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Endereço */}
            <section>
              <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Endereço
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm text-gray-300 mb-1.5">CEP</label>
                  <input
                    {...register('cep')}
                    onChange={(e) => setValue('cep', formatCEP(e.target.value))}
                    className="w-full bg-dark-input border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1.5">Logradouro</label>
                  <input
                    {...register('logradouro')}
                    className="w-full bg-dark-input border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Número</label>
                  <input
                    {...register('numero')}
                    className="w-full bg-dark-input border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Bairro</label>
                  <input
                    {...register('bairro')}
                    className="w-full bg-dark-input border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Cidade</label>
                    <input
                      {...register('cidade')}
                      className="w-full bg-dark-input border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">UF</label>
                    <input
                      {...register('estado')}
                      maxLength={2}
                      className="w-full bg-dark-input border border-gray-800 rounded-xl px-4 py-2.5 text-white uppercase focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                    />
                  </div>
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-dark-card rounded-b-2xl mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-gray-300 hover:bg-gray-800 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="clinicForm"
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-medium transition-colors disabled:opacity-70 flex items-center gap-2"
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