-- 002_modulo2.sql
CREATE TABLE categorias (
id
UUID PRIMARY KEY DEFAULT gen_random_uuid(),
nombre
TEXT NOT NULL UNIQUE,
descripcion TEXT,
created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE productos (
id
UUID PRIMARY KEY DEFAULT gen_random_uuid(),
codigo
VARCHAR(20) NOT NULL UNIQUE,
-- SKU
nombre
TEXT NOT NULL,
descripcion
TEXT,
precio_unitario DECIMAL(12,2) NOT NULL CHECK (precio_unitario > 0),
stock
INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
categoria_id
UUID REFERENCES categorias(id) ON DELETE SET NULL,
imagen_url
TEXT,
activo
BOOLEAN NOT NULL DEFAULT true,
created_at
TIMESTAMPTZ DEFAULT now(),
updated_at
TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leer categorias" ON categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin gestiona categorias" ON categorias FOR ALL TO authenticated
USING (es_admin()) WITH CHECK (es_admin());
CREATE POLICY "leer productos" ON productos FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin gestiona productos" ON productos FOR ALL TO authenticated
USING (es_admin()) WITH CHECK (es_admin());-- Storage: bucket PÚBLICO "imagenes" (lectura libre, escritura solo admin)
CREATE POLICY "admin sube imagenes" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'imagenes' AND public.es_admin());
CREATE POLICY "admin cambia imagenes" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'imagenes' AND public.es_admin());
CREATE POLICY "admin borra imagenes" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'imagenes' AND public.es_admin());
