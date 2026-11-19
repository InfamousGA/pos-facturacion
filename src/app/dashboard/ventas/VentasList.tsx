'use client'

import { useState } from 'react'
import Link from 'next/link'

export type VentaResumen = {
  id: string
  numero_factura: string
  numero_control: string
  cliente_nombre: string
  cliente_rif: string
  metodo_pago: string
  estado: string
  total: number
  created_at: string
}

const ETIQUETAS_PAGO: Record<string, string> = {
  efectivo: 'Efectivo',
  pago_movil: 'Pago Móvil',
  punto_de_venta: 'Punto de Venta',
  transferencia: 'Transferencia',
}

export default function VentasList({ ventas }: { ventas: VentaResumen[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'completada' | 'anulada'>('todas')

  const ventasFiltradas = ventas.filter((v) => {
    if (filtroEstado !== 'todas' && v.estado !== filtroEstado) return false
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return (
      v.numero_factura.toLowerCase().includes(q) ||
      v.numero_control.toLowerCase().includes(q) ||
      v.cliente_nombre.toLowerCase().includes(q) ||
      v.cliente_rif.toLowerCase().includes(q)
    )
  })

  const totalCompletadas = ventasFiltradas
    .filter((v) => v.estado === 'completada')
    .reduce((acc, v) => acc + Number(v.total), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por N° factura, control, cliente o RIF..."
            className="w-full max-w-sm px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-emerald-500"
          />

          <select
            value={filtroEstado}
            onChange={(e) =>
              setFiltroEstado(e.target.value as 'todas' | 'completada' | 'anulada')
            }
            className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="todas">Todos los estados</option>
            <option value="completada">Completadas</option>
            <option value="anulada">Anuladas</option>
          </select>
        </div>

        <div className="text-sm text-zinc-400">
          {ventasFiltradas.length} factura(s) · Total válido:{' '}
          <span className="text-emerald-400 font-semibold">
            ${totalCompletadas.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="px-4 py-3">Factura / Control</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {ventasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No hay ventas registradas que coincidan.
                </td>
              </tr>
            ) : (
              ventasFiltradas.map((v) => (
                <tr key={v.id} className="hover:bg-zinc-800/40">
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold text-zinc-100">
                      {v.numero_factura}
                    </div>
                    <div className="font-mono text-xs text-zinc-500">
                      Ctrl: {v.numero_control}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                    {new Date(v.created_at).toLocaleString('es-VE', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{v.cliente_nombre}</div>
                    <div className="font-mono text-xs text-zinc-500">
                      {v.cliente_rif}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {ETIQUETAS_PAGO[v.metodo_pago] ?? v.metodo_pago}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                        v.estado === 'completada'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {v.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    ${Number(v.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/ventas/${v.id}`}
                      className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium transition inline-block"
                    >
                      Ver factura
                    </Link>
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