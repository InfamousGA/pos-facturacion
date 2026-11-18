'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/cliente'

type ConfigNegocio = {
  id: string
  razon_social: string
  rif: string
  direccion_fiscal: string
  telefono: string | null
  logo_url: string | null
  porcentaje_iva: number
  secuencia_factura: number
  secuencia_control: number
}

export default function ConfigForm({
  configInicial,
}: {
  configInicial: ConfigNegocio | null
}) {
  const router = useRouter()
  const supabase = createClient()

  const [razonSocial, setRazonSocial] = useState(configInicial?.razon_social ?? '')
  const [rif, setRif] = useState(configInicial?.rif ?? '')
  const [direccionFiscal, setDireccionFiscal] = useState(
    configInicial?.direccion_fiscal ?? ''
  )
  const [telefono, setTelefono] = useState(configInicial?.telefono ?? '')
  const [logoUrl, setLogoUrl] = useState(configInicial?.logo_url ?? '')
  const [porcentajeIva, setPorcentajeIva] = useState(
    configInicial?.porcentaje_iva ?? 16
  )
  const [secuenciaFactura, setSecuenciaFactura] = useState(
    configInicial?.secuencia_factura ?? 1
  )
  const [secuenciaControl, setSecuenciaControl] = useState(
    configInicial?.secuencia_control ?? 1
  )

  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(
    null
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setMensaje(null)

    const datos = {
      razon_social: razonSocial.trim(),
      rif: rif.trim().toUpperCase(),
      direccion_fiscal: direccionFiscal.trim(),
      telefono: telefono.trim() || null,
      logo_url: logoUrl.trim() || null,
      porcentaje_iva: Number(porcentajeIva),
      secuencia_factura: Number(secuenciaFactura),
      secuencia_control: Number(secuenciaControl),
      updated_at: new Date().toISOString(),
    }

    const { error } = configInicial?.id
      ? await supabase
          .from('configuracion_negocio')
          .update(datos)
          .eq('id', configInicial.id)
      : await supabase.from('configuracion_negocio').insert(datos)

    if (error) {
      setMensaje({
        tipo: 'error',
        texto: `No se pudo guardar: ${error.message}`,
      })
    } else {
      setMensaje({
        tipo: 'ok',
        texto: 'Configuración del negocio guardada correctamente.',
      })
      router.refresh()
    }

    setCargando(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5"
    >
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Razón social *</label>
          <input
            type="text"
            required
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
            placeholder="Ej. Inversiones Mi Negocio C.A."
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            RIF * <span className="text-xs text-zinc-500">(Ej. J-12345678-9)</span>
          </label>
          <input
            type="text"
            required
            pattern="^[VEJPG]-[0-9]{8}-[0-9]$"
            title="Formato requerido: una letra (V, E, J, P o G), guion, 8 números, guion y 1 número. Ej: J-12345678-9"
            value={rif}
            onChange={(e) => setRif(e.target.value.toUpperCase())}
            placeholder="J-12345678-9"
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Dirección fiscal *</label>
        <textarea
          required
          rows={2}
          value={direccionFiscal}
          onChange={(e) => setDireccionFiscal(e.target.value)}
          placeholder="Dirección completa del establecimiento"
          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Teléfono</label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej. 0414-1234567"
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">URL del Logo</label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-zinc-800">
        <div>
          <label className="block text-sm font-medium mb-1">IVA (%) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            required
            value={porcentajeIva}
            onChange={(e) => setPorcentajeIva(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Secuencia Factura *</label>
          <input
            type="number"
            min="1"
            required
            value={secuenciaFactura}
            onChange={(e) => setSecuenciaFactura(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Secuencia Control *</label>
          <input
            type="number"
            min="1"
            required
            value={secuenciaControl}
            onChange={(e) => setSecuenciaControl(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={cargando}
          className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-medium text-sm transition disabled:opacity-50"
        >
          {cargando ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </form>
  )
}