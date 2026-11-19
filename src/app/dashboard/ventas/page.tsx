import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import VentasList from './VentasList'

async function VentasContent() {
  await connection()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: ventas } = await supabase
    .from('ventas')
    .select(
      'id, numero_factura, numero_control, cliente_nombre, cliente_rif, metodo_pago, estado, total, created_at'
    )
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Historial de Ventas</h1>
          <p className="text-sm text-zinc-400">
            Consulta y reimprime las facturas emitidas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/pos"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition"
          >
            + Nueva venta
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
          >
            ← Volver al panel
          </Link>
        </div>
      </div>

      <VentasList ventas={ventas ?? []} />
    </div>
  )
}

export default function VentasPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <Suspense
        fallback={
          <div className="max-w-6xl mx-auto text-zinc-400">
            Cargando historial de ventas...
          </div>
        }
      >
        <VentasContent />
      </Suspense>
    </main>
  )
}