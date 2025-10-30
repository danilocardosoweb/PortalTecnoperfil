import React, { useEffect, useState } from 'react'
import bcrypt from 'bcryptjs'
import { supabase } from '../../supabase'

export type AuthUser = {
  id: string
  email: string
  fullName: string
  roleId: string | null
  roleName?: string | null
  isAdmin: boolean
}

type LoginModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: (user: AuthUser) => void
}

export function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setEmail('')
      setPassword('')
      setError('')
      setLoading(false)
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password.trim()
    if (!trimmedEmail || !trimmedPassword) {
      setError('Informe e-mail e senha.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_user_credentials', { p_email: trimmedEmail })

      if (fetchError) {
        console.error(fetchError)
        setError('Não foi possível validar o acesso. Tente novamente.')
        return
      }

      if (!data || data.length === 0) {
        setError('Usuário não encontrado.')
        return
      }

      const user = data[0]

      if (user.is_active === false) {
        setError('Usuário está inativo. Contate o administrador.')
        return
      }

      const hash = String(user.password_hash || '')
      const passwordOk = hash && bcrypt.compareSync(trimmedPassword, hash)
      if (!passwordOk) {
        setError('Senha incorreta.')
        return
      }
      const authPayload: AuthUser = {
        id: user.id,
        email: user.email,
        fullName: user.full_name || '',
        roleId: user.role_id || null,
        roleName: user.role_name ?? null,
        isAdmin: Boolean(user.is_admin)
      }

      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)

      onSuccess(authPayload)
    } catch (err) {
      console.error(err)
      setError('Ocorreu um erro ao efetuar login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-6 py-10 bg-black/70 backdrop-blur-sm">
      <button
        className="absolute top-6 right-6 glass-button glass-shine px-4 py-2 rounded-xl text-white"
        type="button"
        onClick={() => {
          if (!loading) {
            window.location.href = 'https://tecnoperfilaluminio.com.br/'
          }
        }}
        disabled={loading}
      >
        <i className="fas fa-times mr-2" /> Fechar
      </button>
      <div className="glass-panel max-w-md w-full rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center gap-3 mb-8 text-white text-center">
          <img src="/logo-tecno.png" alt="Tecnoperfil" className="h-16 w-auto" />
          <h1 className="text-2xl font-semibold drop-shadow-lg">Portal TecnoPerfil</h1>
          <p className="text-white/70 text-sm">Acesse para visualizar dashboards e gerenciamento.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1" htmlFor="login-email">E-mail corporativo</label>
            <input
              id="login-email"
              type="email"
              className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-accent-pink/60"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1" htmlFor="login-password">Senha</label>
            <input
              id="login-password"
              type="password"
              className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-accent-pink/60"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div className="bg-red-500/20 border border-red-400/50 text-red-200 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full glass-button glass-shine flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold disabled:opacity-60"
          >
            {loading && <i className="fas fa-spinner fa-spin" aria-hidden />}<span>{loading ? 'Entrando...' : 'Entrar'}</span>
          </button>
        </form>
        <p className="text-xs text-white/60 mt-6 text-center">
          Acesso restrito. Em caso de dúvidas, contate o administrador TecnoPerfil.
        </p>
      </div>
    </div>
  )
}
