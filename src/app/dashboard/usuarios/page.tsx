import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

async function UsuariosContent() {
  await connection()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Verificar que el usuario actual sea administrador
  const { data: miPerfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (miPerfil?.rol !== 'administrador') {
    redirect('/dashboard')
  }

  // Cargar todos los usuarios registrados
  const { data: usuarios } = await supabase
    .from('perfiles')
    .select('id, nombre_completo, cedula, email, rol')
    .order('nombre_completo', { ascending: true })

  async function cambiarRol(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const nuevoRol = formData.get('rol') as string

    const supabase = await createClient()
    await supabase.from('perfiles').update({ rol: nuevoRol }).eq('id', id)

    revalidatePath('/dashboard/usuarios')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
          <p className="text-sm text-zinc-400">
            Administra los roles y accesos del personal
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
        >
          ← Volver al panel
        </Link>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Cédula</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {usuarios?.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-800/40">
                <td className="px-4 py-3 font-medium">
                  {u.nombre_completo || 'Sin nombre'}
                </td>
                <td className="px-4 py-3 text-zinc-400">{u.cedula || '—'}</td>
                <td className="px-4 py-3 text-zinc-400">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                      u.rol === 'administrador'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {u.rol}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.id === user.id ? (
                    <span className="text-xs text-zinc-500">Tu cuenta</span>
                  ) : (
                    <form action={cambiarRol} className="inline-flex gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <select
                        name="rol"
                        defaultValue={u.rol}
                        className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs"
                      >
                        <option value="cajero">Cajero</option>
                        <option value="administrador">Administrador</option>
                      </select>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-medium transition"
                      >
                        Guardar
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function UsuariosPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <Suspense
        fallback={
          <div className="max-w-4xl mx-auto text-zinc-400">
            Cargando usuarios...
          </div>
        }
      >
        <UsuariosContent />
      </Suspense>
    </main>
  )
}