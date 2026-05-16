import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react'

import { supabase } from '../lib/supabase'

function validatePasswordPair(password: string, confirm: string) {
  if (!password) return 'Informe a nova senha.'
  if (password.length < 10) return 'A senha deve ter no mínimo 10 caracteres.'
  if (password !== confirm) return 'A confirmação não confere.'
  return ''
}

export default function ResetPassword() {
  const navigate = useNavigate()

  // O Supabase redireciona para /reset-password#access_token=...&type=recovery
  // O supabase-js detecta automaticamente o token na URL e cria uma sessão temporária.
  const [ready, setReady] = useState(false)
  const [tokenError, setTokenError] = useState('')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Aguarda o supabase-js processar o hash da URL e estabelecer a sessão de recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Sessão de recuperação estabelecida — pode prosseguir
        setReady(true)
        setTokenError('')
      } else if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        // Se não houve PASSWORD_RECOVERY, o link é inválido/expirado
        if (!ready) {
          setTokenError('Link inválido ou expirado. Solicite um novo.')
        }
      }
    })

    // Timeout: se depois de 5s não chegou nenhum evento de recovery, o link é inválido
    const timeout = setTimeout(() => {
      setReady((current) => {
        if (!current) setTokenError('Link inválido ou expirado. Solicite um novo.')
        return current
      })
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const local = validatePasswordPair(password, confirm)
    if (local) {
      setError(local)
      return
    }

    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message || 'Não foi possível redefinir a senha. Tente novamente.')
        return
      }
      setSuccess(true)
    } catch {
      setError('Falha de conexão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  // Aguardando verificação do token na URL
  if (!ready && !tokenError) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-dark-card rounded-2xl shadow-xl border border-gray-800/50 p-8">
          <div className="text-gray-200 font-medium">Validando link…</div>
          <div className="mt-3 h-2 bg-white/10 rounded animate-pulse" />
          <div className="mt-2 h-2 bg-white/10 rounded animate-pulse w-2/3" />
        </div>
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200">
              <ArrowLeft className="h-4 w-4" />
              Voltar para login
            </Link>
          </div>

          <div className="bg-dark-card rounded-2xl shadow-xl border border-gray-800/50 p-8">
            <h1 className="text-2xl font-bold text-white mb-2">Redefinir senha</h1>
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg mb-5">
              {tokenError}
            </div>
            <Link
              to="/forgot-password"
              className="w-full inline-flex items-center justify-center bg-brand-blue hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Solicitar novo link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-dark-card rounded-2xl shadow-xl border border-gray-800/50 p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Senha atualizada</h1>
          <p className="text-gray-400 text-sm mb-6">Sua senha foi redefinida com sucesso.</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full bg-brand-blue hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Ir para login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200">
            <ArrowLeft className="h-4 w-4" />
            Voltar para login
          </Link>
        </div>

        <div className="bg-dark-card rounded-2xl shadow-xl border border-gray-800/50 p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Redefinir senha</h1>
          <p className="text-gray-400 text-sm mb-6">Defina uma nova senha para sua conta.</p>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nova senha"
                className="w-full pl-11 pr-12 py-3 bg-dark-input border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
                autoComplete="new-password"
                required
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirmar nova senha"
                className="w-full pl-11 pr-4 py-3 bg-dark-input border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
                autoComplete="new-password"
                required
                disabled={saving}
              />
            </div>

            <div className="text-xs text-gray-500">Mínimo 10 caracteres.</div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-brand-blue hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Salvar nova senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export { validatePasswordPair }
