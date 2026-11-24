-- 004_modulo4.sql
CREATE OR REPLACE FUNCTION public.anular_venta(p_venta_id UUID, p_motivo TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
IF NOT es_admin() THEN RAISE EXCEPTION 'Solo un administrador puede anular'; END IF;
IF coalesce(trim(p_motivo), '') = '' THEN RAISE EXCEPTION 'Indique el motivo'; END IF;
UPDATE ventas
SET estado = 'anulada', anulada_por = auth.uid(), anulada_at = now(),
motivo_anulacion = p_motivo
WHERE id = p_venta_id AND estado = 'completada';
IF NOT FOUND THEN RAISE EXCEPTION 'La venta no existe o ya está anulada'; END IF;
-- Devuelve el stock (se agrupa por si un producto aparece en dos líneas)
UPDATE productos p SET stock = p.stock + d.unidades, updated_at = now()
FROM (SELECT producto_id, SUM(cantidad) AS unidades FROM detalle_ventas
WHERE venta_id = p_venta_id GROUP BY producto_id) d
WHERE p.id = d.producto_id;
END; $$;
REVOKE EXECUTE ON FUNCTION anular_venta FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION anular_venta TO authenticated; 


-- Ventas por día en hora de Venezuela; respeta el RLS (security_invoker)
CREATE OR REPLACE VIEW ventas_por_dia WITH (security_invoker = true) AS
SELECT (created_at AT TIME ZONE 'America/Caracas')::date AS dia,
COUNT(*)
AS facturas,
SUM(subtotal) AS base_imponible,
SUM(monto_iva) AS iva,
SUM(total)
AS total
FROM ventas
WHERE estado = 'completada'
-- las anuladas no suman
GROUP BY 1;
-- Top 5 productos de un rango de fechas
CREATE OR REPLACE FUNCTION top_productos(p_desde DATE, p_hasta DATE)
RETURNS TABLE (nombre TEXT, unidades BIGINT, monto NUMERIC)
LANGUAGE sql STABLE AS $$
SELECT MAX(d.nombre_producto), SUM(d.cantidad), SUM(d.subtotal)
FROM detalle_ventas d JOIN ventas v ON v.id = d.venta_id
WHERE v.estado = 'completada'
AND (v.created_at AT TIME ZONE 'America/Caracas')::date BETWEEN p_desde AND p_hasta
GROUP BY d.producto_id
ORDER BY 2 DESC
LIMIT 5;
$$;


-- funcion  anular la venta como tal

CREATE OR REPLACE FUNCTION public.anular_venta(
  p_venta_id UUID,
  p_motivo TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_venta ventas%ROWTYPE;
  v_det RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT es_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede anular facturas';
  END IF;

  IF p_motivo IS NULL OR length(trim(p_motivo)) < 3 THEN
    RAISE EXCEPTION 'Debes escribir un motivo de anulación';
  END IF;

  -- FOR UPDATE evita que se anule dos veces al mismo tiempo y duplique el stock
  SELECT * INTO v_venta FROM ventas WHERE id = p_venta_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;

  IF v_venta.estado = 'anulada' THEN
    RAISE EXCEPTION 'Esta factura ya fue anulada';
  END IF;

  -- Devolver el stock a cada producto vendido
  FOR v_det IN
    SELECT producto_id, cantidad
    FROM detalle_ventas
    WHERE venta_id = p_venta_id AND producto_id IS NOT NULL
  LOOP
    UPDATE productos
    SET stock = stock + v_det.cantidad,
        updated_at = now()
    WHERE id = v_det.producto_id;
  END LOOP;

  -- Marcar la venta como anulada
  UPDATE ventas
  SET estado = 'anulada',
      anulada_por = auth.uid(),
      anulada_at = now(),
      motivo_anulacion = trim(p_motivo)
  WHERE id = p_venta_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anular_venta FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anular_venta TO authenticated;