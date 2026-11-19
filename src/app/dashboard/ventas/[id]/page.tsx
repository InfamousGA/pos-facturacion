import { Suspense } from 'react'
import { redirect, notFound } from 'next/navigation'
import { connection } from 'next/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PrintButton from './PrintButton'

const ETIQUETAS_PAGO: Record<string, string> = {
  efectivo: 'Efectivo',
  pago_movil: 'Pago Móvil',
  punto_de_venta: 'Punto de Venta',
  transferencia: 'Transferencia',
}

async function VentaDetalleContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await connection()
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: venta }, { data: detalles }, { data: config }] =
    await Promise.all([
      supabase.from('ventas').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('detalle_ventas')
        .select('id, nombre_producto, precio_unitario, cantidad, subtotal')
        .eq('venta_id', id)
        .order('created_at', { ascending: true }),
      supabase.from('configuracion_negocio').select('*').limit(1).maybeSingle(),
    ])

  if (!venta) notFound()

  const { data: vendedor } = await supabase
    .from('perfiles')
    .select('nombre_completo')
    .eq('id', venta.vendedor_id)
    .maybeSingle()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/dashboard/ventas"
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
        >
          ← Volver a ventas
        </Link>
        <PrintButton />
      </div>

      <article className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 md:p-8 space-y-6 print:bg-white print:text-black print:border-zinc-300 print:rounded-none print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-5 print:border-zinc-300">
          <div className="flex items-start gap-4">
            {config?.logo_url && (
              <img
                src={config.logo_url}
                alt={config.razon_social}
                className="w-16 h-16 object-contain rounded-lg bg-white p-1 border border-zinc-800 print:border-zinc-300"
              />
            )}
            <div className="space-y-0.5">
              <h1 className="text-xl font-bold">
                {config?.razon_social ?? 'Mi Negocio'}
              </h1>
              {config?.rif && (
                <p className="text-xs font-mono text-zinc-400 print:text-zinc-600">
                  RIF: {config.rif}
                </p>
              )}
              {config?.direccion_fiscal && (
                <p className="text-xs text-zinc-400 print:text-zinc-600 max-w-sm">
                  {config.direccion_fiscal}
                </p>
              )}
              {config?.telefono && (
                <p className="text-xs text-zinc-400 print:text-zinc-600">
                  Tel: {config.telefono}
                </p>
              )}
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-xs uppercase tracking-wider text-zinc-400 print:text-zinc-600">
              Factura
            </div>
            <div className="text-xl font-mono font-bold">
              {venta.numero_factura}
            </div>
            <div className="text-xs font-mono text-zinc-400 print:text-zinc-600">
              Control: {venta.numero_control}
            </div>
            <div className="text-xs text-zinc-400 print:text-zinc-600">
              {new Date(venta.created_at).toLocaleString('es-VE', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </div>
            {venta.estado === 'anulada' && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-bold uppercase print:text-red-700 print:border print:border-red-700">
                ANULADA
              </span>
            )}
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-b border-zinc-800 pb-5 print:border-zinc-300">
          <div className="space-y-1">
            <div className="text-xs uppercase text-zinc-500">Cliente</div>
            <div className="font-semibold">{venta.cliente_nombre}</div>
            <div className="font-mono text-xs text-zinc-400 print:text-zinc-600">
              RIF / Cédula: {venta.cliente_rif}
            </div>
            {venta.cliente_direccion && (
              <div className="text-xs text-zinc-400 print:text-zinc-600">
                {venta.cliente_direccion}
              </div>
            )}
          </div>

          <div className="space-y-1 sm:text-right">
            <div className="text-xs uppercase text-zinc-500">Detalles</div>
            <div>
              Método de pago:{' '}
              <span className="font-medium">
                {ETIQUETAS_PAGO[venta.metodo_pago] ?? venta.metodo_pago}
              </span>
            </div>
            <div className="text-xs text-zinc-400 print:text-zinc-600">
              Atendido por: {vendedor?.nombre_completo ?? 'Usuario'}
            </div>
            {venta.observaciones && (
              <div className="text-xs text-zinc-400 print:text-zinc-600">
                Obs: {venta.observaciones}
              </div>
            )}
          </div>
        </section>

        <section className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 text-zinc-400 print:border-zinc-300 print:text-zinc-700">
              <tr>
                <th className="py-2">Descripción</th>
                <th className="py-2 text-center">Cant.</th>
                <th className="py-2 text-right">Precio Unit.</th>
                <th className="py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70 print:divide-zinc-200">
              {detalles?.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5 font-medium">{item.nombre_producto}</td>
                  <td className="py-2.5 text-center">{item.cantidad}</td>
                  <td className="py-2.5 text-right">
                    ${Number(item.precio_unitario).toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right font-medium">
                    ${Number(item.subtotal).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="flex justify-end pt-4 border-t border-zinc-800 print:border-zinc-300">
          <div className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-400 print:text-zinc-700">
              <span>Base imponible (Subtotal)</span>
              <span>${Number(venta.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400 print:text-zinc-700">
              <span>IVA ({Number(venta.porcentaje_iva)}%)</span>
              <span>${Number(venta.monto_iva).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-zinc-800 print:border-zinc-300">
              <span>Total</span>
              <span className="text-emerald-400 print:text-black">
                ${Number(venta.total).toFixed(2)}
              </span>
            </div>
          </div>
        </footer>

        {venta.estado === 'anulada' && venta.motivo_anulacion && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-xs text-red-400 print:text-red-700 print:border-red-400">
            <strong>Motivo de anulación:</strong> {venta.motivo_anulacion}
          </div>
        )}
      </article>
    </div>
  )
}

export default function VentaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-8 print:bg-white print:p-0">
      <Suspense
        fallback={
          <div className="max-w-3xl mx-auto text-zinc-400">
            Cargando factura...
          </div>
        }
      >
        <VentaDetalleContent params={params} />
      </Suspense>
    </main>
  )
}