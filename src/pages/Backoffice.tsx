import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
  const { session, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

  const fetchClinics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/clinics', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Falha ao buscar clínicas');
      }
      
      const data = await response.json();
      setClinics(data);
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
  }, [session]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <header className="bg-dark-card border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <BrandLogo className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">OSLER NOTES <span className="text-gray-500 font-normal">| Backoffice</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-right hidden sm:block">
              <p className="font-medium">{user?.nome || 'Super Admin'}</p>
              <p className="text-gray-400 text-xs">{user?.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
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
            <p className="text-gray-400 text-sm">Gerencie todas as clínicas do sistema</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Buscar clínica..." 
                className="bg-dark-input border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue w-full sm:w-64 transition-all"
              />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nova Clínica
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-xl">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-dark-card border border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-dark-input/50 text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Clínica</th>
                  <th className="px-6 py-4 font-medium">CNPJ</th>
                  <th className="px-6 py-4 font-medium">Responsável</th>
                  <th className="px-6 py-4 font-medium">Data Cadastro</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mb-4" />
                        Carregando clínicas...
                      </div>
                    </td>
                  </tr>
                ) : clinics.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <Building2 className="w-12 h-12 text-gray-700 mb-3" />
                        <p>Nenhuma clínica cadastrada.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  clinics.map((clinic) => (
                    <tr key={clinic.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">{clinic.nome}</td>
                      <td className="px-6 py-4 text-gray-400">{clinic.cnpj}</td>
                      <td className="px-6 py-4">
                        <p className="text-gray-300">{clinic.nome_responsavel}</p>
                        <p className="text-gray-500 text-xs">{clinic.email}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(clinic.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                          clinic.ativa 
                            ? 'bg-green-500/10 text-brand-green border border-green-500/20' 
                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {clinic.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-brand-blue hover:text-blue-400 text-sm font-medium transition-colors">
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
