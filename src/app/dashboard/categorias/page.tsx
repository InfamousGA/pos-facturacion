import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CategoriasManager from './CategoriasManager'

async function CategoriasContent() {
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

  const { data: categorias } = await supabase
    .from('categorias')
    .select('id, nombre, descripcion')
    .order('nombre', { ascending: true })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorías</h1>
          <p className="text-sm text-zinc-400">
            Organiza tus productos por grupos
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
        >
          ← Volver al panel
        </Link>
      </div>

      <CategoriasManager
        categoriasIniciales={categorias ?? []}
        esAdmin={perfil?.rol === 'administrador'}
      />
    </div>
  )
}

export default function CategoriasPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <Suspense
        fallback={
          <div className="max-w-4xl mx-auto text-zinc-400">
            Cargando categorías...
          </div>
        }
      >
        <CategoriasContent />
      </Suspense>
    </main>
  )
}