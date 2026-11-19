import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProductosManager from './ProductosManager'

async function ProductosContent() {
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

  const [{ data: productos }, { data: categorias }] = await Promise.all([
    supabase
      .from('productos')
      .select(
        'id, codigo, nombre, descripcion, precio_unitario, stock, categoria_id, imagen_url, activo'
      )
      .order('nombre', { ascending: true }),
    supabase
      .from('categorias')
      .select('id, nombre')
      .order('nombre', { ascending: true }),
  ])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos e Inventario</h1>
          <p className="text-sm text-zinc-400">
            Administra el catálogo, precios y existencias
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
        >
          ← Volver al panel
        </Link>
      </div>

      <ProductosManager
        productosIniciales={productos ?? []}
        categorias={categorias ?? []}
        esAdmin={perfil?.rol === 'administrador'}
      />
    </div>
  )
}

export default function ProductosPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <Suspense
        fallback={
          <div className="max-w-6xl mx-auto text-zinc-400">
            Cargando productos...
          </div>
        }
      >
        <ProductosContent />
      </Suspense>
    </main>
  )
}