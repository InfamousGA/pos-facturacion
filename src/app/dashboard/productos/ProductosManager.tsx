'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/cliente'

export type CategoriaSimple = {
  id: string
  nombre: string
}

export type Producto = {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  precio_unitario: number
  stock: number
  categoria_id: string | null
  imagen_url: string | null
  activo: boolean
}

export default function ProductosManager({
  productosIniciales,
  categorias,
  esAdmin,
}: {
  productosIniciales: Producto[]
  categorias: CategoriaSimple[]
  esAdmin: boolean
}) {
  const router = useRouter()
  const supabase = createClient()

  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precioUnitario, setPrecioUnitario] = useState('')
  const [stock, setStock] = useState('0')
  const [categoriaId, setCategoriaId] = useState('')
  const [activo, setActivo] = useState(true)
  const [imagenUrlActual, setImagenUrlActual] = useState<string | null>(null)
  const [archivoImagen, setArchivoImagen] = useState<File | null>(null)

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(
    null
  )

  const limpiarFormulario = () => {
    setCodigo('')
    setNombre('')
    setDescripcion('')
    setPrecioUnitario('')
    setStock('0')
    setCategoriaId('')
    setActivo(true)
    setImagenUrlActual(null)
    setArchivoImagen(null)
    setEditandoId(null)
    const inputArchivo = document.getElementById('input-imagen-producto') as HTMLInputElement | null
    if (inputArchivo) inputArchivo.value = ''
  }

  const subirImagen = async (archivo: File): Promise<string | null> => {
    const ext = archivo.name.split('.').pop() || 'png'
    const nombreArchivo = `productos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage
      .from('imagenes')
      .upload(nombreArchivo, archivo, { upsert: false })

    if (error) {
      throw new Error(`Error al subir imagen: ${error.message}`)
    }

    const { data } = supabase.storage.from('imagenes').getPublicUrl(nombreArchivo)
    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setMensaje(null)

    try {
      let urlFinal = imagenUrlActual

      if (archivoImagen) {
        urlFinal = await subirImagen(archivoImagen)
      }

      const datos = {
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        precio_unitario: Number(precioUnitario),
        stock: Number(stock),
        categoria_id: categoriaId || null,
        imagen_url: urlFinal,
        activo,
        updated_at: new Date().toISOString(),
      }

      const { error } = editandoId
        ? await supabase.from('productos').update(datos).eq('id', editandoId)
        : await supabase.from('productos').insert(datos)

      if (error) {
        setMensaje({
          tipo: 'error',
          texto:
            error.code === '23505'
              ? 'Ya existe un producto con ese código SKU.'
              : `No se pudo guardar: ${error.message}`,
        })
      } else {
        setMensaje({
          tipo: 'ok',
          texto: editandoId
            ? 'Producto actualizado correctamente.'
            : 'Producto creado correctamente.',
        })
        limpiarFormulario()
        router.refresh()
      }
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Ocurrió un error inesperado.',
      })
    } finally {
      setCargando(false)
    }
  }

  const handleEditar = (prod: Producto) => {
    setEditandoId(prod.id)
    setCodigo(prod.codigo)
    setNombre(prod.nombre)
    setDescripcion(prod.descripcion ?? '')
    setPrecioUnitario(String(prod.precio_unitario))
    setStock(String(prod.stock))
    setCategoriaId(prod.categoria_id ?? '')
    setActivo(prod.activo)
    setImagenUrlActual(prod.imagen_url)
    setArchivoImagen(null)
    setMensaje(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEliminar = async (id: string, nombreProd: string) => {
    const confirmar = window.confirm(`¿Eliminar el producto "${nombreProd}"?`)
    if (!confirmar) return

    setMensaje(null)
    const { error } = await supabase.from('productos').delete().eq('id', id)

    if (error) {
      setMensaje({ tipo: 'error', texto: `No se pudo eliminar: ${error.message}` })
    } else {
      setMensaje({ tipo: 'ok', texto: 'Producto eliminado.' })
      if (editandoId === id) limpiarFormulario()
      router.refresh()
    }
  }

  const nombreCategoria = (id: string | null) => {
    if (!id) return 'Sin categoría'
    return categorias.find((c) => c.id === id)?.nombre ?? 'Sin categoría'
  }

  const productosFiltrados = productosIniciales.filter((p) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.codigo.toLowerCase().includes(q)
    )
  })

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
            {editandoId ? 'Editar producto' : 'Nuevo producto'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Código (SKU) *</label>
              <input
                type="text"
                required
                maxLength={20}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ej. AGU-001"
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Recarga Botellón 19L"
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Precio unitario *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Stock *</label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Categoría</label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-sm font-medium mb-1">
                Imagen del producto
              </label>
              <input
                id="input-imagen-producto"
                type="file"
                accept="image/*"
                onChange={(e) => setArchivoImagen(e.target.files?.[0] ?? null)}
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-950 accent-emerald-500"
              />
              <span>Producto activo para la venta</span>
            </label>

            <div className="flex items-center gap-3">
              {editandoId && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={cargando}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition disabled:opacity-50"
              >
                {cargando
                  ? 'Guardando...'
                  : editandoId
                    ? 'Actualizar producto'
                    : 'Crear producto'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o código SKU..."
          className="w-full max-w-sm px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-emerald-500"
        />
        <span className="text-xs text-zinc-400">
          {productosFiltrados.length} producto(s)
        </span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3 text-right">Precio</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3">Estado</th>
              {esAdmin && <th className="px-4 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {productosFiltrados.length === 0 ? (
              <tr>
                <td
                  colSpan={esAdmin ? 7 : 6}
                  className="px-4 py-6 text-center text-zinc-500"
                >
                  No hay productos que coincidan.
                </td>
              </tr>
            ) : (
              productosFiltrados.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.imagen_url ? (
                        <img
                          src={p.imagen_url}
                          alt={p.nombre}
                          className="w-10 h-10 rounded-lg object-cover border border-zinc-800 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-xs text-zinc-500 shrink-0">
                          Sin img
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{p.nombre}</div>
                        {p.descripcion && (
                          <div className="text-xs text-zinc-500 line-clamp-1">
                            {p.descripcion}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                    {p.codigo}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {nombreCategoria(p.categoria_id)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    ${Number(p.precio_unitario).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        p.stock === 0 ? 'text-red-400 font-semibold' : 'text-zinc-200'
                      }
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        p.activo
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {esAdmin && (
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEditar(p)}
                        className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium transition"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminar(p.id, p.nombre)}
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