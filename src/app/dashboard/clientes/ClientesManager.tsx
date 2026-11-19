'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/cliente'

export type Cliente = {
  id: string
  nombre: string
  rif_cedula: string
  direccion: string | null
  telefono: string | null
  email: string | null
}

const PREFIJOS_DOCUMENTO = ['V', 'E', 'J', 'P', 'G'] as const
const PREFIJOS_TELEFONO = ['0412', '0422', '0414', '0424', '0416', '0426'] as const

export default function ClientesManager({
  clientesIniciales,
}: {
  clientesIniciales: Cliente[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const [nombre, setNombre] = useState('')
  const [tipoDoc, setTipoDoc] = useState<string>('V')
  const [numeroDoc, setNumeroDoc] = useState('')
  const [direccion, setDireccion] = useState('')
  const [prefijoTel, setPrefijoTel] = useState<string>('0412')
  const [numeroTel, setNumeroTel] = useState('')
  const [email, setEmail] = useState('')

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(
    null
  )

  const limpiarFormulario = () => {
    setNombre('')
    setTipoDoc('V')
    setNumeroDoc('')
    setDireccion('')
    setPrefijoTel('0412')
    setNumeroTel('')
    setEmail('')
    setEditandoId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setMensaje(null)

    const rifCedulaFinal = `${tipoDoc}-${numeroDoc.trim()}`
    const telLimpio = numeroTel.replace(/\D/g, '')
    const telefonoFinal = telLimpio ? `${prefijoTel}-${telLimpio}` : null

    const datos = {
      nombre: nombre.trim(),
      rif_cedula: rifCedulaFinal,
      direccion: direccion.trim() || null,
      telefono: telefonoFinal,
      email: email.trim() || null,
    }

    const { error } = editandoId
      ? await supabase.from('clientes').update(datos).eq('id', editandoId)
      : await supabase.from('clientes').insert(datos)

    if (error) {
      setMensaje({
        tipo: 'error',
        texto:
          error.code === '23505'
            ? 'Ya existe un cliente registrado con ese RIF o cédula.'
            : `No se pudo guardar: ${error.message}`,
      })
    } else {
      setMensaje({
        tipo: 'ok',
        texto: editandoId
          ? 'Cliente actualizado correctamente.'
          : 'Cliente registrado correctamente.',
      })
      limpiarFormulario()
      router.refresh()
    }

    setCargando(false)
  }

  const handleEditar = (cli: Cliente) => {
    setEditandoId(cli.id)
    setNombre(cli.nombre)

    const [letra, ...restoDoc] = cli.rif_cedula.split('-')
    if (PREFIJOS_DOCUMENTO.includes(letra as (typeof PREFIJOS_DOCUMENTO)[number])) {
      setTipoDoc(letra)
      setNumeroDoc(restoDoc.join('-'))
    } else {
      setTipoDoc('V')
      setNumeroDoc(cli.rif_cedula)
    }

    if (cli.telefono) {
      const soloDigitos = cli.telefono.replace(/\D/g, '')
      const prefijoEncontrado = PREFIJOS_TELEFONO.find((p) =>
        soloDigitos.startsWith(p)
      )
      if (prefijoEncontrado) {
        setPrefijoTel(prefijoEncontrado)
        setNumeroTel(soloDigitos.slice(4))
      } else {
        setPrefijoTel('0412')
        setNumeroTel(soloDigitos)
      }
    } else {
      setPrefijoTel('0412')
      setNumeroTel('')
    }

    setDireccion(cli.direccion ?? '')
    setEmail(cli.email ?? '')
    setMensaje(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clientesFiltrados = clientesIniciales.filter((c) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.rif_cedula.toLowerCase().includes(q) ||
      (c.telefono ?? '').toLowerCase().includes(q)
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

      <form
        onSubmit={handleSubmit}
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4"
      >
        <h2 className="text-lg font-semibold">
          {editandoId ? 'Editar cliente' : 'Nuevo cliente'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nombre o Razón Social *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. María Pérez o Comercial Ejemplo C.A."
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              RIF / Cédula *{' '}
              <span className="text-xs text-zinc-500">
                (Ej. 12345678 o 12345678-9)
              </span>
            </label>
            <div className="flex gap-2">
              <select
                value={tipoDoc}
                onChange={(e) => setTipoDoc(e.target.value)}
                className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="V">V</option>
                <option value="E">E</option>
                <option value="J">J</option>
                <option value="P">P</option>
                <option value="G">G</option>
              </select>
              <input
                type="text"
                required
                maxLength={11}
                pattern="^[0-9]{6,9}(-[0-9])?$"
                title="Escribe de 6 a 9 dígitos (y opcionalmente -dígito verificador para RIF, ej: 12345678-9)"
                value={numeroDoc}
                onChange={(e) =>
                  setNumeroDoc(e.target.value.replace(/[^0-9-]/g, ''))
                }
                placeholder={tipoDoc === 'J' || tipoDoc === 'G' ? '12345678-9' : '12345678'}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <div className="flex gap-2">
              <select
                value={prefijoTel}
                onChange={(e) => setPrefijoTel(e.target.value)}
                className="px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500 text-sm"
              >
                {PREFIJOS_TELEFONO.map((prefijo) => (
                  <option key={prefijo} value={prefijo}>
                    {prefijo}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="numeric"
                maxLength={7}
                pattern="^([0-9]{7})?$"
                title="Escribe los 7 dígitos restantes del número o déjalo vacío"
                value={numeroTel}
                onChange={(e) =>
                  setNumeroTel(e.target.value.replace(/\D/g, '').slice(0, 7))
                }
                placeholder="1234567"
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Correo</label>
            <input
              type="email"
              maxLength={100}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@correo.com"
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Dirección</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Dirección fiscal o de domicilio"
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={cargando}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition disabled:opacity-50"
          >
            {cargando
              ? 'Guardando...'
              : editandoId
                ? 'Actualizar cliente'
                : 'Registrar cliente'}
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

      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, RIF/cédula o teléfono..."
          className="w-full max-w-sm px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-emerald-500"
        />
        <span className="text-xs text-zinc-400">
          {clientesFiltrados.length} cliente(s)
        </span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">RIF / Cédula</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Dirección</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {clientesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  No hay clientes registrados todavía.
                </td>
              </tr>
            ) : (
              clientesFiltrados.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-800/40">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.nombre}</div>
                    {c.email && (
                      <div className="text-xs text-zinc-500">{c.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                    {c.rif_cedula}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {c.telefono || '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {c.direccion || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleEditar(c)}
                      className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium transition"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}