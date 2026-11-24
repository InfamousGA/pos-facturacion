import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ReportesView, { TopProducto, VentaPorDia } from './ReportesView'

function hoyVenezuelaISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

async function ReportesContent() {
  await connection()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const hasta = hoyVenezuelaISO()
  const desde = `${hasta.slice(0, 8)}01`

  const [{ data: ventasPorDia }, { data: topProductos }] = await Promise.all([
    supabase
      .from('ventas_por_dia')
      .select('dia, facturas, base_imponible, iva, total')
      .gte('dia', desde)
      .lte('dia', hasta)
      .order('dia', { ascending: false }),
    supabase.rpc('top_productos', {
      p_desde: desde,
      p_hasta: hasta,
    }),
  ])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Reportes de Ventas</h1>
          <p className="text-sm text-zinc-400">
            Resumen diario, impuestos y productos más vendidos
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
        >
          ← Volver al panel
        </Link>
      </div>

      <ReportesView
        ventasIniciales={(ventasPorDia as VentaPorDia[]) ?? []}
        topInicial={(topProductos as TopProducto[]) ?? []}
        desdeInicial={desde}
        hastaInicial={hasta}
      />
    </div>
  )
}

export default function ReportesPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-8">
      <Suspense
        fallback={
          <div className="max-w-6xl mx-auto text-zinc-400">
            Cargando reportes...
          </div>
        }
      >
        <ReportesContent />
      </Suspense>
    </main>
  )
}