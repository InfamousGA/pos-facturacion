'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/cliente'

export type Categoria = {
  id: string
  nombre: string
  descripcion: string | null
}

export default function CategoriasManager({
  categoriasIniciales,
  esAdmin,
}: {
  categoriasIniciales: Categoria[]
  esAdmin: boolean
}) {
  const router = useRouter()
  const supabase = createClient()

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(
    null
  )

  const limpiarFormulario = () => {
    setNombre('')
    setDescripcion('')
    setEditandoId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setMensaje(null)

    const datos = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
    }

    const { error } = editandoId
      ? await supabase.from('categorias').update(datos).eq('id', editandoId)
      : await supabase.from('categorias').insert(datos)

    if (error) {
      setMensaje({
        tipo: 'error',
        texto:
          error.code === '23505'
            ? 'Ya existe una categoría con ese nombre.'
            : `Error al guardar: ${error.message}`,
      })
    } else {
      setMensaje({
        tipo: 'ok',
        texto: editandoId
          ? 'Categoría actualizada correctamente.'
          : 'Categoría creada correctamente.',
      })
      limpiarFormulario()
      router.refresh()
    }

    setCargando(false)
  }

  const handleEditar = (cat: Categoria) => {
    setEditandoId(cat.id)
    setNombre(cat.nombre)
    setDescripcion(cat.descripcion ?? '')
    setMensaje(null)
  }

  const handleEliminar = async (id: string, nombreCat: string) => {
    const confirmar = window.confirm(
      `¿Eliminar la categoría "${nombreCat}"? Los productos asociados quedarán sin categoría.`
    )
    if (!confirmar) return

    setMensaje(null)
    const { error } = await supabase.from('categorias').delete().eq('id', id)

    if (error) {
      setMensaje({ tipo: 'error', texto: `No se pudo eliminar: ${error.message}` })
    } else {
      setMensaje({ tipo: 'ok', texto: 'Categoría eliminada.' })
      if (editandoId === id) limpiarFormulario()
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {mensaje && (
        <div
          className={`p-3 rounded-lg text-sm border ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
              : 'bg-red-500/10 border-red-500/40 text-red-400'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {esAdmin && (
        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4"
        >
          <h2 className="text-lg font-semibold">
            {editandoId ? 'Editar categoría' : 'Nueva categoría'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Bebidas, Limpieza, Agua purificada"
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción opcional"
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={cargando}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition disabled:opacity-50"
            >
              {cargando
                ? 'Guardando...'
                : editandoId
                  ? 'Actualizar categoría'
                  : 'Crear categoría'}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Descripción</th>
              {esAdmin && <th className="px-4 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {categoriasIniciales.length === 0 ? (
              <tr>
                <td
                  colSpan={esAdmin ? 3 : 2}
                  className="px-4 py-6 text-center text-zinc-500"
                >
                  No hay categorías registradas todavía.
                </td>
              </tr>
            ) : (
              categoriasIniciales.map((cat) => (
                <tr key={cat.id} className="hover:bg-zinc-800/40">
                  <td className="px-4 py-3 font-medium">{cat.nombre}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {cat.descripcion || '—'}
                  </td>
                  {esAdmin && (
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEditar(cat)}
                        className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium transition"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminar(cat.id, cat.nombre)}
                        className="px-3 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-medium transition"
                      >
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}