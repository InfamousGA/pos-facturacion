import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

async function DashboardContent() {
  await connection()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre_completo, cedula, rol')
    .eq('id', user.id)
    .single()

  async function cerrarSesion() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="max-w-5xl mx-auto bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">
          Hola, {perfil?.nombre_completo ?? user.email}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Rol actual:{' '}
          <span className="text-emerald-400 font-semibold uppercase">
            {perfil?.rol ?? 'sin rol'}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/pos"
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold transition"
        >
          Punto de Venta
        </Link>

        <Link
          href="/dashboard/ventas"
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
        >
          Ventas
        </Link>

        <Link
          href="/dashboard/reportes"
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
        >
          Reportes
        </Link>

        <Link
          href="/dashboard/clientes"
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
        >
          Clientes
        </Link>

        <Link
          href="/dashboard/productos"
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
        >
          Productos
        </Link>

        <Link
          href="/dashboard/categorias"
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
        >
          Categorías
        </Link>

        {perfil?.rol === 'administrador' && (
          <>
            <Link
              href="/dashboard/usuarios"
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
            >
              Usuarios
            </Link>
            <Link
              href="/dashboard/configuracion"
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
            >
              Configuración
            </Link>
          </>
        )}

        <form action={cerrarSesion}>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto text-zinc-400">
            Cargando panel...
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </main>
  )
}