'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/cliente'

export type ProductoPos = {
  id: string
  codigo: string
  nombre: string
  precio_unitario: number
  stock: number
  imagen_url: string | null
}

export type ClientePos = {
  id: string
  nombre: string
  rif_cedula: string
}

type ItemCarrito = {
  producto: ProductoPos
  cantidad: number
}

const METODOS_PAGO = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'pago_movil', etiqueta: 'Pago Móvil' },
  { valor: 'punto_de_venta', etiqueta: 'Punto de Venta' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
] as const

export default function PosTerminal({
  productos,
  porcentajeIva,
  configLista,
}: {
  productos: ProductoPos[]
  clientes?: ClientePos[]
  porcentajeIva: number
  configLista: boolean
}) {
  const router = useRouter()
  const supabase = createClient()

  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])

  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [resultadosClientes, setResultadosClientes] = useState<ClientePos[]>([])
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClientePos | null>(null)

  const [metodoPago, setMetodoPago] = useState<string>('efectivo')
  const [observaciones, setObservaciones] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(
    null
  )

  useEffect(() => {
    const q = busquedaCliente.trim()
    if (q.length < 2 || clienteSeleccionado) {
      setResultadosClientes([])
      setBuscandoCliente(false)
      return
    }

    let activo = true
    setBuscandoCliente(true)

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('clientes')
        .select('id, nombre, rif_cedula')
        .or(`rif_cedula.ilike.%${q}%,nombre.ilike.%${q}%`)
        .order('nombre', { ascending: true })
        .limit(8)

      if (activo) {
        setResultadosClientes(data ?? [])
        setBuscandoCliente(false)
      }
    }, 250)

    return () => {
      activo = false
      clearTimeout(timer)
    }
  }, [busquedaCliente, clienteSeleccionado, supabase])

  const seleccionarCliente = (cli: ClientePos) => {
    setClienteSeleccionado(cli)
    setBusquedaCliente('')
    setResultadosClientes([])
    setMensaje(null)
  }

  const limpiarCliente = () => {
    setClienteSeleccionado(null)
    setBusquedaCliente('')
    setResultadosClientes([])
  }

  const productosFiltrados = productos.filter((p) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.codigo.toLowerCase().includes(q)
    )
  })

  const agregarAlCarrito = (producto: ProductoPos) => {
    if (producto.stock <= 0) return
    setMensaje(null)

    setCarrito((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id)
      if (existente) {
        if (existente.cantidad >= producto.stock) return prev
        return prev.map((i) =>
          i.producto.id === producto.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        )
      }
      return [...prev, { producto, cantidad: 1 }]
    })
  }

  const cambiarCantidad = (productoId: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.producto.id !== productoId) return item
          const nuevaCantidad = item.cantidad + delta
          if (nuevaCantidad > item.producto.stock) return item
          return { ...item, cantidad: nuevaCantidad }
        })
        .filter((item) => item.cantidad > 0)
    )
  }

  const quitarDelCarrito = (productoId: string) => {
    setCarrito((prev) => prev.filter((item) => item.producto.id !== productoId))
  }

  const subtotal = carrito.reduce(
    (acc, item) => acc + Number(item.producto.precio_unitario) * item.cantidad,
    0
  )
  const montoIva = Number(((subtotal * porcentajeIva) / 100).toFixed(2))
  const total = Number((subtotal + montoIva).toFixed(2))

  const handleCobrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensaje(null)

    if (!configLista) {
      setMensaje({
        tipo: 'error',
        texto: 'Debes configurar los datos del negocio antes de emitir facturas.',
      })
      return
    }

    if (!clienteSeleccionado) {
      setMensaje({
        tipo: 'error',
        texto: 'Busca y selecciona un cliente para emitir la factura.',
      })
      return
    }

    if (carrito.length === 0) {
      setMensaje({
        tipo: 'error',
        texto: 'Agrega al menos un producto al carrito.',
      })
      return
    }

    setCargando(true)

    const itemsPayload = carrito.map((item) => ({
      producto_id: item.producto.id,
      cantidad: item.cantidad,
    }))

    const { error } = await supabase.rpc('registrar_venta', {
      p_cliente_id: clienteSeleccionado.id,
      p_metodo_pago: metodoPago,
      p_items: itemsPayload,
      p_observaciones: observaciones.trim() || null,
    })

    if (error) {
      setMensaje({
        tipo: 'error',
        texto: `Error al registrar venta: ${error.message}`,
      })
    } else {
      setCarrito([])
      setObservaciones('')
      limpiarCliente()
      setMensaje({
        tipo: 'ok',
        texto: 'Venta registrada con éxito. El stock fue actualizado.',
      })
      router.refresh()
    }

    setCargando(false)
  }

  return (
    <div className="space-y-4">
      {!configLista && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-300 text-sm">
          Aún no has guardado la configuración fiscal del negocio.{' '}
          <Link href="/dashboard/configuracion" className="underline font-semibold">
            Configúrala aquí
          </Link>{' '}
          antes de facturar.
        </div>
      )}

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 space-y-4">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto por nombre o código SKU..."
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-emerald-500"
          />

          {productosFiltrados.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
              No se encontraron productos activos.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {productosFiltrados.map((p) => {
                const enCarrito =
                  carrito.find((i) => i.producto.id === p.id)?.cantidad ?? 0
                const sinStock = p.stock <= 0
                const alLimite = enCarrito >= p.stock

                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={sinStock || alLimite}
                    onClick={() => agregarAlCarrito(p)}
                    className="text-left bg-zinc-900 border border-zinc-800 hover:border-emerald-500/60 rounded-xl p-3 transition flex flex-col justify-between gap-3 disabled:opacity-50 disabled:hover:border-zinc-800"
                  >
                    <div className="flex items-start gap-3">
                      {p.imagen_url ? (
                        <img
                          src={p.imagen_url}
                          alt={p.nombre}
                          className="w-12 h-12 rounded-lg object-cover border border-zinc-800 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 shrink-0">
                          Sin img
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {p.nombre}
                        </div>
                        <div className="font-mono text-xs text-zinc-500">
                          {p.codigo}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                      <span className="font-bold text-emerald-400">
                        ${Number(p.precio_unitario).toFixed(2)}
                      </span>
                      <span
                        className={`text-xs ${
                          sinStock ? 'text-red-400' : 'text-zinc-400'
                        }`}
                      >
                        Stock: {p.stock}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <form
          onSubmit={handleCobrar}
          className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 sticky top-6"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-lg font-semibold">Carrito de compra</h2>
            {carrito.length > 0 && (
              <button
                type="button"
                onClick={() => setCarrito([])}
                className="text-xs text-zinc-400 hover:text-red-400 transition"
              >
                Vaciar
              </button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Cliente *</label>
              <Link
                href="/dashboard/clientes"
                className="text-xs text-emerald-400 hover:underline"
              >
                + Nuevo cliente
              </Link>
            </div>

            {clienteSeleccionado ? (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-emerald-300 truncate">
                    {clienteSeleccionado.nombre}
                  </div>
                  <div className="font-mono text-xs text-emerald-400/80">
                    {clienteSeleccionado.rif_cedula}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={limpiarCliente}
                  className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 shrink-0 transition"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  placeholder="Buscar por cédula, RIF o nombre (ej. 12345678)..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-emerald-500"
                />

                {busquedaCliente.trim().length >= 2 && (
                  <div className="mt-1 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800 max-h-52 overflow-y-auto">
                    {buscandoCliente ? (
                      <div className="px-3 py-2.5 text-xs text-zinc-400">
                        Buscando...
                      </div>
                    ) : resultadosClientes.length === 0 ? (
                      <div className="px-3 py-2.5 text-xs text-zinc-500">
                        No se encontró ningún cliente con ese dato.
                      </div>
                    ) : (
                      resultadosClientes.map((cli) => (
                        <button
                          key={cli.id}
                          type="button"
                          onClick={() => seleccionarCliente(cli)}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-800/80 transition flex items-center justify-between gap-2"
                        >
                          <span className="text-sm font-medium truncate">
                            {cli.nombre}
                          </span>
                          <span className="font-mono text-xs text-emerald-400 shrink-0">
                            {cli.rif_cedula}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {carrito.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8 border border-dashed border-zinc-800 rounded-lg">
                Haz clic en los productos para agregarlos al carrito.
              </p>
            ) : (
              carrito.map((item) => (
                <div
                  key={item.producto.id}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {item.producto.nombre}
                    </div>
                    <div className="text-xs text-zinc-400">
                      ${Number(item.producto.precio_unitario).toFixed(2)} c/u
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(item.producto.id, -1)}
                      className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-sm font-bold"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {item.cantidad}
                    </span>
                    <button
                      type="button"
                      disabled={item.cantidad >= item.producto.stock}
                      onClick={() => cambiarCantidad(item.producto.id, 1)}
                      className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-sm font-bold disabled:opacity-40"
                    >
                      +
                    </button>
                    <span className="w-16 text-right text-sm font-semibold">
                      $
                      {(
                        Number(item.producto.precio_unitario) * item.cantidad
                      ).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => quitarDelCarrito(item.producto.id)}
                      className="text-xs text-red-400 hover:text-red-300 px-1"
                      title="Quitar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
            <div>
              <label className="block text-sm font-medium mb-1">
                Método de pago *
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-emerald-500"
              >
                {METODOS_PAGO.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Observaciones
              </label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej. Referencia #1234"
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>IVA ({porcentajeIva}%)</span>
              <span>${montoIva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-zinc-100 pt-2 border-t border-zinc-800">
              <span>Total a pagar</span>
              <span className="text-emerald-400">${total.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={
              cargando || carrito.length === 0 || !clienteSeleccionado || !configLista
            }
            className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold transition disabled:opacity-50"
          >
            {cargando ? 'Procesando venta...' : 'Emitir factura'}
          </button>
        </form>
      </div>
    </div>
  )
}