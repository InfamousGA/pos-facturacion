import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PosTerminal from './PosTerminal'

async function PosContent() {
  await connection()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: productos }, { data: clientes }, { data: config }] =
    await Promise.all([
      supabase
        .from('productos')
        .select('id, codigo, nombre, precio_unitario, stock, imagen_url')
        .eq('activo', true)
        .order('nombre', { ascending: true }),
      supabase
        .from('clientes')
        .select('id, nombre, rif_cedula')
        .order('nombre', { ascending: true }),
      supabase
        .from('configuracion_negocio')
        .select('id, porcentaje_iva')
        .limit(1)
        .maybeSingle(),
    ])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Punto de Venta (POS)</h1>
          <p className="text-sm text-zinc-400">
            Selecciona productos, elige el cliente y emite la factura
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
        >
          ← Volver al panel
        </Link>
      </div>

      <PosTerminal
        productos={productos ?? []}
        clientes={clientes ?? []}
        porcentajeIva={Number(config?.porcentaje_iva ?? 16)}
        configLista={Boolean(config?.id)}
      />
    </div>
  )
}

export default function PosPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-8">
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto text-zinc-400">
            Cargando punto de venta...
          </div>
        }
      >
        <PosContent />
      </Suspense>
    </main>
  )
}