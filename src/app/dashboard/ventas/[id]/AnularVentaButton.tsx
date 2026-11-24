'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/cliente'

export default function AnularVentaButton({
  ventaId,
  numeroFactura,
}: {
  ventaId: string
  numeroFactura: string
}) {
  const router = useRouter()
  const supabase = createClient()

  const [abierto, setAbierto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnular = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCargando(true)

    const { error: rpcError } = await supabase.rpc('anular_venta', {
      p_venta_id: ventaId,
      p_motivo: motivo.trim(),
    })

    if (rpcError) {
      setError(rpcError.message)
      setCargando(false)
      return
    }

    setAbierto(false)
    setMotivo('')
    setCargando(false)
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null)
          setAbierto(true)
        }}
        className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 text-sm font-medium transition"
      >
        Anular factura
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-red-400">
                Anular {numeroFactura}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Esta acción no se puede deshacer. Los productos volverán al
                inventario y la factura dejará de sumar en los reportes.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg text-xs border bg-red-500/10 border-red-500/40 text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleAnular} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Motivo de anulación *
                </label>
                <textarea
                  required
                  minLength={3}
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej. Error en cantidad facturada o devolución del cliente"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={cargando}
                  onClick={() => setAbierto(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando || motivo.trim().length < 3}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition disabled:opacity-50"
                >
                  {cargando ? 'Anulando...' : 'Confirmar anulación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}