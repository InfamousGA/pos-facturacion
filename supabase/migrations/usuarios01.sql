-- 001_modulo1.sql
-- Tabla: perfiles (1 a 1 con auth.users de Supabase)
CREATE TABLE perfiles (
id
UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
nombre_completo TEXT NOT NULL,
email
TEXT,
-- copia para listar usuarios
cedula
VARCHAR(12),
rol
VARCHAR(20) NOT NULL DEFAULT 'cajero'
CHECK (rol IN ('administrador', 'cajero')),
activo
BOOLEAN NOT NULL DEFAULT true,
created_at
TIMESTAMPTZ DEFAULT now()
);
-- Tabla: configuracion_negocio (UNA sola fila)
CREATE TABLE configuracion_negocio (
id
UUID PRIMARY KEY DEFAULT gen_random_uuid(),
razon_social
TEXT NOT NULL,rif
VARCHAR(15) NOT NULL CHECK (rif ~ '^[VEJPG]-[0-9]{8}-[0-9]$'), -- J-12345678-9
direccion_fiscal TEXT NOT NULL,
telefono
VARCHAR(20),
logo_url
TEXT,
porcentaje_iva
DECIMAL(5,2) NOT NULL DEFAULT 16.00,
secuencia_factura INTEGER NOT NULL DEFAULT 1,
secuencia_control INTEGER NOT NULL DEFAULT 1,
updated_at
TIMESTAMPTZ DEFAULT now()
);
-- Garantiza que nunca exista una segunda fila
CREATE UNIQUE INDEX config_una_sola_fila ON configuracion_negocio ((true));
INSERT INTO configuracion_negocio (razon_social, rif, direccion_fiscal)
VALUES ('MI NEGOCIO, C.A.', 'J-00000000-0', 'Caracas, Venezuela');


-- En el registro, envíen los datos extra así:
-- supabase.auth.signUp({ email, password,
-- options: { data: { nombre_completo, cedula } } })
CREATE OR REPLACE FUNCTION public.crear_perfil()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
INSERT INTO public.perfiles (id, nombre_completo, email, cedula)
VALUES (NEW.id,
COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email),
NEW.email,
NEW.raw_user_meta_data->>'cedula');
RETURN NEW;
END; $$;
CREATE TRIGGER al_crear_usuario
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.crear_perfil();



-- ¿El usuario actual es administrador activo?
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
SELECT EXISTS (
SELECT 1 FROM perfiles
WHERE id = auth.uid() AND rol = 'administrador' AND activo
);
$$;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver perfil propio o admin" ON perfiles FOR SELECT TO authenticated
USING (id = auth.uid() OR es_admin());
CREATE POLICY "editar perfil propio o admin" ON perfiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR es_admin());-- Sin esto, un cajero podría ponerse rol = 'administrador' editando su perfil
CREATE OR REPLACE FUNCTION public.proteger_rol()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF auth.uid() IS NOT NULL AND NOT es_admin()
AND (NEW.rol IS DISTINCT FROM OLD.rol OR NEW.activo IS DISTINCT FROM OLD.activo) THEN
RAISE EXCEPTION 'Solo un administrador puede cambiar el rol o el estado';
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER proteger_rol BEFORE UPDATE ON perfiles
FOR EACH ROW EXECUTE FUNCTION proteger_rol();
ALTER TABLE configuracion_negocio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "todos leen la config" ON configuracion_negocio FOR SELECT TO authenticated
USING (true);
CREATE POLICY "admin edita la config" ON configuracion_negocio FOR UPDATE TO authenticated
USING (es_admin());
-- PRIMER ADMINISTRADOR: regístrense en la app y luego ejecuten en el SQL Editor
UPDATE perfiles SET rol = 'administrador' WHERE email = 'correo-del-admin@ejemplo.com';
