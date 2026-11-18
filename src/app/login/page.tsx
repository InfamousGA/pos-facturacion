'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/cliente'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCargando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Correo o contraseña incorrectos.')
      setCargando(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Iniciar sesión</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Ingresa tus credenciales para entrar al POS
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-medium transition disabled:opacity-50"
          >
            {cargando ? 'Ingresando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-400">
          ¿No tienes cuenta?{' '}
          <Link href="/registro" className="text-emerald-400 hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </main>
  )
}