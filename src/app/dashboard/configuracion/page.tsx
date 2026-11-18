import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ConfigForm from './ConfigForm'

async function ConfiguracionContent() {
  await connection()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'administrador') {
    redirect('/dashboard')
  }

  const { data: config } = await supabase
    .from('configuracion_negocio')
    .select('*')
    .limit(1)
    .maybeSingle()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración del Negocio</h1>
          <p className="text-sm text-zinc-400">
            Datos fiscales e impuestos para la emisión de facturas
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
        >
          ← Volver al panel
        </Link>
      </div>

      <ConfigForm configInicial={config} />
    </div>
  )
}

export default function ConfiguracionPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <Suspense
        fallback={
          <div className="max-w-3xl mx-auto text-zinc-400">
            Cargando configuración...
          </div>
        }
      >
        <ConfiguracionContent />
      </Suspense>
    </main>
  )
}