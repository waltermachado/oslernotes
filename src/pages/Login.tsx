import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      navigate('/dashboard');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro inesperado ao conectar. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 overflow-hidden">
            {/* Fallback to text if logo.png is missing */}
            <img src="/logo.png" alt="Osler Logo" className="w-12 h-12 object-contain" onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<span class="text-brand-blue font-bold text-xl">O</span>';
            }} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">OSLER</h1>
          <h2 className="text-brand-green font-medium text-sm tracking-[0.2em] mb-3">HEALTH SYSTEM</h2>
          <p className="text-gray-400 text-sm text-center">Portal Seguro para Profissionais de Saúde</p>
        </div>

        {/* Card */}
        <div className="bg-dark-card rounded-2xl shadow-xl border border-gray-800/50 p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-center">
                {error}
              </div>
            )}

            {/* Email Input */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail ou CPF"
                  className="w-full pl-11 pr-4 py-3 bg-dark-input border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                  className="w-full pl-11 pr-12 py-3 bg-dark-input border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input type="checkbox" className="rounded border-gray-700 bg-dark-input text-brand-blue focus:ring-brand-blue/50" />
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors">Lembrar de mim</span>
              </label>
              <Link to="/forgot-password" className="text-brand-blue hover:text-blue-400 transition-colors">
                Esqueceu a senha?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-blue hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer Badges */}
          <div className="mt-8 pt-6 border-t border-gray-800/50 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-gray-400">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="h-4 w-4 text-brand-green" />
              <span>Autenticação 2FA ativa</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-gray-700 rounded-full" />
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="h-4 w-4 text-brand-green" />
              <span>Em conformidade LGPD / HIPAA</span>
            </div>
          </div>
        </div>

        {/* Page Footer */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">
            © {new Date().getFullYear()} OSLER HEALTH SYSTEM. TODOS OS DIREITOS RESERVADOS.
          </p>
        </div>
      </div>
    </div>
  );
}
