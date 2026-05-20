import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Search, Building2, LogOut } from 'lucide-react';
import AddClinicModal from '../components/AddClinicModal';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../components/brand/BrandLogo'

interface Clinic {
  id: string;
  nome: string;
  cnpj: string;
  nome_responsavel: string;
  email: string;
  ativa: boolean;
  created_at: string;
}

export default function Backoffice() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

  const fetchClinics = async () => {
    setIsLoading(true);
    try {
      const { data, error: qError } = await supabase
        .from('clinicas')
        .select('id, nome, cnpj, nome_responsavel, email, ativa, created_at')
        .order('created_at', { ascending: false });

      if (qError) throw new Error(qError.message || 'Falha ao buscar clínicas');
      setClinics(data ?? []);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro desconhecido.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClinics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-canvas text-ink-900">
      {/* Header */}
      <header className="bg-surface border-b border-cream-300 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <BrandLogo className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">OSLER NOTES <span className="text-ink-500 font-normal">| Backoffice</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-right hidden sm:block">
              <p className="font-medium">{user?.nome || 'Super Admin'}</p>
              <p className="text-ink-500 text-xs">{user?.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-ink-500 hover:text-ink-800 hover:bg-cream-200 rounded-xl transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-1">Clínicas Cadastradas</h2>
            <p className="text-ink-500 text-sm">Gerencie todas as clínicas do sistema</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
              <input 
                type="text" 
                placeholder="Buscar clínica..." 
                className="bg-sunken border border-cream-300 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-navy-400 focus:ring-1 focus:ring-brand-blue w-full sm:w-64 transition-all"
              />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-navy-500 hover:bg-navy-600 text-cream-50 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nova Clínica
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-100 text-rose-400 text-sm p-4 rounded-xl">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-surface border border-cream-300 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-sunken/50 text-ink-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Clínica</th>
                  <th className="px-6 py-4 font-medium">CNPJ</th>
                  <th className="px-6 py-4 font-medium">Responsável</th>
                  <th className="px-6 py-4 font-medium">Data Cadastro</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-ink-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mb-4" />
                        Carregando clínicas...
                      </div>
                    </td>
                  </tr>
                ) : clinics.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-ink-500">
                      <div className="flex flex-col items-center justify-center">
                        <Building2 className="w-12 h-12 text-gray-700 mb-3" />
                        <p>Nenhuma clínica cadastrada.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  clinics.map((clinic) => (
                    <tr key={clinic.id} className="hover:bg-cream-200/40 transition-colors">
                      <td className="px-6 py-4 font-medium text-ink-900">{clinic.nome}</td>
                      <td className="px-6 py-4 text-ink-500">{clinic.cnpj}</td>
                      <td className="px-6 py-4">
                        <p className="text-ink-700">{clinic.nome_responsavel}</p>
                        <p className="text-ink-500 text-xs">{clinic.email}</p>
                      </td>
                      <td className="px-6 py-4 text-ink-500">
                        {new Date(clinic.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                          clinic.ativa 
                            ? 'bg-sage-50 text-sage-400 border border-sage-100' 
                            : 'bg-rose-50 text-rose-400 border border-rose-100'
                        }`}>
                          {clinic.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-navy-500 hover:text-blue-400 text-sm font-medium transition-colors">
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AddClinicModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          setIsModalOpen(false);
          fetchClinics();
        }}
      />
    </div>
  );
}
