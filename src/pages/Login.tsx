import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BrandLogo from '../components/brand/BrandLogo'

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
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <BrandLogo className="h-[60px] w-auto max-w-[200px] mb-4" />
          <h1 className="font-normal text-ink-900 mb-1" style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', lineHeight: 1 }}>Osler Notes</h1>
          <h2 className="text-gold-500 font-sans font-bold text-xs tracking-[0.22em] uppercase mb-3">Health System</h2>
          <p className="text-ink-500 text-sm text-center">Portal Seguro para Profissionais de Saúde</p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl shadow-xl border border-cream-300/50 p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-400 text-sm p-3 rounded-lg text-center">
                {error}
              </div>
            )}

            {/* Email Input */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-ink-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail ou CPF"
                  className="w-full pl-11 pr-4 py-3 bg-sunken border border-cream-300 rounded-xl text-ink-900 placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-navy-400/40 focus:border-navy-400 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-ink-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                  className="w-full pl-11 pr-12 py-3 bg-sunken border border-cream-300 rounded-xl text-ink-900 placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-navy-400/40 focus:border-navy-400 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-ink-500 hover:text-ink-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input type="checkbox" className="rounded border-cream-300 bg-sunken text-navy-500 focus:ring-navy-400/40" />
                <span className="text-ink-500 group-hover:text-ink-700 transition-colors">Lembrar de mim</span>
              </label>
              <Link to="/forgot-password" className="text-navy-500 hover:text-blue-400 transition-colors">
                Esqueceu a senha?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-navy-500 hover:bg-navy-600 text-cream-50 font-medium py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
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
          <div className="mt-8 pt-6 border-t border-cream-300/50 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-ink-500">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="h-4 w-4 text-sage-400" />
              <span>Autenticação 2FA ativa</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-cream-300 rounded-full" />
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="h-4 w-4 text-sage-400" />
              <span>Em conformidade LGPD / HIPAA</span>
            </div>
          </div>
        </div>

        {/* Page Footer */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-ink-500 uppercase tracking-widest">
            © {new Date().getFullYear()} OSLER NOTES. TODOS OS DIREITOS RESERVADOS.
          </p>
        </div>
      </div>
    </div>
  );
}
