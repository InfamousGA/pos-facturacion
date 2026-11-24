'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/cliente'

export type VentaPorDia = {
  dia: string
  facturas: number
  base_imponible: number
  iva: number
  total: number
}

export type TopProducto = {
  nombre: string
  unidades: number
  monto: number
}

function fechaVenezuelaISO(fecha: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha)
}

export default function ReportesView({
  ventasIniciales,
  topInicial,
  desdeInicial,
  hastaInicial,
}: {
  ventasIniciales: VentaPorDia[]
  topInicial: TopProducto[]
  desdeInicial: string
  hastaInicial: string
}) {
  const supabase = createClient()

  const [desde, setDesde] = useState(desdeInicial)
  const [hasta, setHasta] = useState(hastaInicial)
  const [ventasPorDia, setVentasPorDia] = useState<VentaPorDia[]>(ventasIniciales)
  const [topProductos, setTopProductos] = useState<TopProducto[]>(topInicial)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const consultarRango = async (nuevaDesde: string, nuevaHasta: string) => {
    setCargando(true)
    setError(null)

    const [resDias, resTop] = await Promise.all([
      supabase
        .from('ventas_por_dia')
        .select('dia, facturas, base_imponible, iva, total')
        .gte('dia', nuevaDesde)
        .lte('dia', nuevaHasta)
        .order('dia', { ascending: false }),
      supabase.rpc('top_productos', {
        p_desde: nuevaDesde,
        p_hasta: nuevaHasta,
      }),
    ])

    if (resDias.error || resTop.error) {
      setError(
        resDias.error?.message ||
          resTop.error?.message ||
          'No se pudieron cargar los reportes.'
      )
    } else {
      setVentasPorDia((resDias.data as VentaPorDia[]) ?? [])
      setTopProductos((resTop.data as TopProducto[]) ?? [])
    }

    setCargando(false)
  }

  const handleFiltrar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!desde || !hasta) return
    consultarRango(desde, hasta)
  }

  const aplicarRangoRapido = (tipo: 'hoy' | '7dias' | 'mes') => {
    const ahora = new Date()
    const hoyStr = fechaVenezuelaISO(ahora)
    let inicioStr = hoyStr

    if (tipo === '7dias') {
      const hace7 = new Date(ahora)
      hace7.setDate(hace7.getDate() - 6)
      inicioStr = fechaVenezuelaISO(hace7)
    } else if (tipo === 'mes') {
      inicioStr = `${hoyStr.slice(0, 8)}01`
    }

    setDesde(inicioStr)
    setHasta(hoyStr)
    consultarRango(inicioStr, hoyStr)
  }

  const totalFacturas = ventasPorDia.reduce(
    (acc, v) => acc + Number(v.facturas),
    0
  )
  const totalBase = ventasPorDia.reduce(
    (acc, v) => acc + Number(v.base_imponible),
    0
  )
  const totalIva = ventasPorDia.reduce((acc, v) => acc + Number(v.iva), 0)
  const totalGeneral = ventasPorDia.reduce((acc, v) => acc + Number(v.total), 0)

  const maxUnidades = Math.max(
    ...topProductos.map((p) => Number(p.unidades)),
    1
  )

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleFiltrar}
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-end justify-between gap-4 print:hidden"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Desde</label>
            <input
              type="date"
              required
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Hasta</label>
            <input
              type="date"
              required
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition disabled:opacity-50"
          >
            {cargando ? 'Consultando...' : 'Aplicar filtro'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => aplicarRangoRapido('hoy')}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium transition"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => aplicarRangoRapido('7dias')}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium transition"
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            onClick={() => aplicarRangoRapido('mes')}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium transition"
          >
            Este mes
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium transition"
          >
            Imprimir
          </button>
        </div>
      </form>

      {error && (
        <div className="p-3 rounded-lg text-sm border bg-red-500/10 border-red-500/40 text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-400">
            Total vendido
          </p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            ${totalGeneral.toFixed(2)}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-400">
            Facturas completadas
          </p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">
            {totalFacturas}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-400">
            Base imponible
          </p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">
            ${totalBase.toFixed(2)}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-400">
            IVA recaudado
          </p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">
            ${totalIva.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Top 5 productos</h2>
            <p className="text-xs text-zinc-400">
              Más vendidos del {desde} al {hasta}
            </p>
          </div>

          {topProductos.length === 0 ? (
            <p className="text-sm text-zinc-500 py-8 text-center">
              Sin ventas en este rango de fechas.
            </p>
          ) : (
            <div className="space-y-4">
              {topProductos.map((prod, idx) => {
                const porcentaje = Math.round(
                  (Number(prod.unidades) / maxUnidades) * 100
                )
                return (
                  <div key={`${prod.nombre}-${idx}`} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm gap-2">
                      <span className="font-medium truncate">
                        {idx + 1}. {prod.nombre}
                      </span>
                      <span className="text-xs text-zinc-400 shrink-0">
                        {Number(prod.unidades)} und ·{' '}
                        <span className="text-emerald-400 font-semibold">
                          ${Number(prod.monto).toFixed(2)}
                        </span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-950 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-zinc-800">
            <h2 className="text-lg font-semibold">Ventas por día</h2>
            <p className="text-xs text-zinc-400">
              Solo incluye facturas completadas (hora de Venezuela)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-center">Facturas</th>
                  <th className="px-4 py-3 text-right">Base Imp.</th>
                  <th className="px-4 py-3 text-right">IVA</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {ventasPorDia.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-zinc-500"
                    >
                      No hay ventas registradas en este período.
                    </td>
                  </tr>
                ) : (
                  ventasPorDia.map((v) => (
                    <tr key={v.dia} className="hover:bg-zinc-800/40">
                      <td className="px-4 py-3 font-mono text-xs text-zinc-200">
                        {v.dia}
                      </td>
                      <td className="px-4 py-3 text-center text-zinc-300">
                        {Number(v.facturas)}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-400">
                        ${Number(v.base_imponible).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-400">
                        ${Number(v.iva).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                        ${Number(v.total).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}