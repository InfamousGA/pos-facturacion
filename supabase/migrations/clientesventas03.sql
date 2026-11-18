-- 003_modulo3.sql
CREATE TABLE clientes (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
nombre TEXT NOT NULL,
rif_cedula VARCHAR(15) NOT NULL UNIQUE
CHECK (rif_cedula ~ '^[VEJPG]-[0-9]{6,9}(-[0-9])?$'), -- V-12345678 / J-12345678-9
direccion TEXT,
telefono VARCHAR(20),
email VARCHAR(100),
created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE ventas (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
numero_factura VARCHAR(20) NOT NULL UNIQUE, -- FAC-000001
numero_control VARCHAR(20) NOT NULL UNIQUE, -- 00-000001
cliente_id UUID NOT NULL REFERENCES clientes(id),
cliente_nombre TEXT NOT NULL, -- snapshot del cliente
cliente_rif VARCHAR(15) NOT NULL, -- snapshot
cliente_direccion TEXT, -- snapshot
vendedor_id UUID NOT NULL REFERENCES perfiles(id),
subtotal DECIMAL(12,2) NOT NULL, -- base imponible
porcentaje_iva DECIMAL(5,2) NOT NULL DEFAULT 16.00,
monto_iva DECIMAL(12,2) NOT NULL,
total DECIMAL(12,2) NOT NULL,
metodo_pago VARCHAR(30) NOT NULL CHECK (
metodo_pago IN ('efectivo','transferencia','pago_movil','punto_de_venta')),
estado VARCHAR(20) NOT NULL DEFAULT 'completada'
CHECK (estado IN ('completada', 'anulada')),
observaciones TEXT,
anulada_por UUID REFERENCES perfiles(id),
anulada_at TIMESTAMPTZ,
motivo_anulacion TEXT,
created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE detalle_ventas (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE RESTRICT, -- antes CASCADE
producto_id UUID REFERENCES productos(id),
nombre_producto TEXT NOT NULL, -- snapshot del nombre
precio_unitario DECIMAL(12,2) NOT NULL, -- snapshot del precio
cantidad INTEGER NOT NULL CHECK (cantidad > 0),
subtotal DECIMAL(12,2) NOT NULL,
created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_ventas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leer clientes" ON clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "crear clientes" ON clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "editar clientes" ON clientes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ver ventas" ON ventas FOR SELECT TO authenticated
USING (vendedor_id = auth.uid() OR es_admin());
CREATE POLICY "ver detalle" ON detalle_ventas FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM ventas v WHERE v.id = venta_id
AND (v.vendedor_id = auth.uid() OR es_admin())));
-- A propósito NO hay políticas INSERT/UPDATE/DELETE en ventas ni en detalle_ventas:
-- solo escriben las funciones registrar_venta y anular_venta.


-- 003_modulo3.sql (continuación)
CREATE OR REPLACE FUNCTION public.registrar_venta(
p_cliente_id
UUID,
p_metodo_pago
TEXT,
p_items
JSONB,
-- [{"producto_id":"...","cantidad":2}, ...]
p_observaciones TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
v_cfg
configuracion_negocio%ROWTYPE;
v_cli
clientes%ROWTYPE;v_prod
productos%ROWTYPE;
v_item
JSONB;
v_cant
INTEGER;
v_linea
DECIMAL(12,2);
v_subtotal DECIMAL(12,2) := 0;
v_iva
DECIMAL(12,2);
v_venta_id UUID;
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
RAISE EXCEPTION 'El carrito está vacío';
END IF;
-- FOR UPDATE bloquea la fila: la otra caja espera y recibe el número siguiente
SELECT * INTO v_cfg FROM configuracion_negocio LIMIT 1 FOR UPDATE;
SELECT * INTO v_cli FROM clientes WHERE id = p_cliente_id;
IF NOT FOUND THEN RAISE EXCEPTION 'Cliente no encontrado'; END IF;
INSERT INTO ventas (numero_factura, numero_control, cliente_id, cliente_nombre,
cliente_rif, cliente_direccion, vendedor_id, subtotal,
porcentaje_iva, monto_iva, total, metodo_pago, observaciones)
VALUES ('FAC-' || lpad(v_cfg.secuencia_factura::text, 6, '0'),
'00-' || lpad(v_cfg.secuencia_control::text, 6, '0'),
v_cli.id, v_cli.nombre, v_cli.rif_cedula, v_cli.direccion, auth.uid(),
0, v_cfg.porcentaje_iva, 0, 0, p_metodo_pago, p_observaciones)
RETURNING id INTO v_venta_id;
FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
v_cant := (v_item->>'cantidad')::INTEGER;
SELECT * INTO v_prod FROM productos
WHERE id = (v_item->>'producto_id')::UUID AND activo FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Producto no disponible'; END IF;
IF v_cant IS NULL OR v_cant <= 0 OR v_prod.stock < v_cant THEN
RAISE EXCEPTION 'Stock insuficiente para %', v_prod.nombre;
END IF;
v_linea := round(v_prod.precio_unitario * v_cant, 2); -- precio desde la BD
UPDATE productos SET stock = stock - v_cant, updated_at = now() WHERE id = v_prod.id;
INSERT INTO detalle_ventas (venta_id, producto_id, nombre_producto,
precio_unitario, cantidad, subtotal)
VALUES (v_venta_id, v_prod.id, v_prod.nombre, v_prod.precio_unitario, v_cant, v_linea);
v_subtotal := v_subtotal + v_linea;
END LOOP;
v_iva := round(v_subtotal * v_cfg.porcentaje_iva / 100, 2);
UPDATE ventas SET subtotal = v_subtotal, monto_iva = v_iva, total = v_subtotal + v_iva
WHERE id = v_venta_id;
UPDATE configuracion_negocio
SET secuencia_factura = secuencia_factura + 1,
secuencia_control = secuencia_control + 1, updated_at = now()
WHERE id = v_cfg.id;
RETURN v_venta_id;
END; $$;
REVOKE EXECUTE ON FUNCTION registrar_venta FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION registrar_venta TO authenticated;
