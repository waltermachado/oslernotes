import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, Send } from 'lucide-react'

import { supabase } from '../lib/supabase'

function isValidEmail(email: string) {
  if (!email) return false
  if (email.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!isValidEmail(normalizedEmail)) {
      setError('Informe um e-mail válido.')
      return
    }

    setSubmitting(true)
    try {
      // Usa o Supabase Auth nativo para envio do e-mail de recuperação
      // O link de redefinição aponta para /reset-password na URL atual do app
      const redirectTo = `${window.location.origin}/reset-password`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo }
      )

      if (resetError) {
        setError('Falha ao enviar o e-mail. Tente novamente.')
        return
      }

      // Sempre mostra mensagem genérica por segurança (não revela se o e-mail existe)
      setMessage('Se existir uma conta para este e-mail, você receberá um link de recuperação em alguns minutos.')
    } catch {
      setError('Falha de conexão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
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
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">Recuperar senha</h1>
            <p className="text-gray-400 text-sm">Informe seu e-mail. Se houver conta, enviaremos um link.</p>
          </div>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 bg-emerald-500/10 border border-emerald-500/50 text-emerald-300 text-sm p-3 rounded-lg">
              {message}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu e-mail"
                className="w-full pl-11 pr-4 py-3 bg-dark-input border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
                autoComplete="email"
                required
                disabled={submitting}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-blue hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enviar link de recuperação</span>
                  <Send className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
