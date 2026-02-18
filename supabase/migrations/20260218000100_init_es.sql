BEGIN;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_usuario') THEN
    CREATE TYPE public.rol_usuario AS ENUM ('admin', 'cliente', 'barbero', 'comercial');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_sucursal') THEN
    CREATE TYPE public.estado_sucursal AS ENUM ('activo', 'desactivado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_orden') THEN
    CREATE TYPE public.estado_orden AS ENUM ('agendado', 'cancelado', 'proceso', 'completado', 'pagado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metodo_pago') THEN
    CREATE TYPE public.metodo_pago AS ENUM ('nequi', 'efectivo');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_detalle') THEN
    CREATE TYPE public.tipo_detalle AS ENUM ('servicio', 'producto');
  END IF;
END $$;

CREATE TABLE public.sucursales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  ciudad text NOT NULL,
  pais text NOT NULL,
  direccion text NOT NULL,
  imagen text,
  estado public.estado_sucursal NOT NULL DEFAULT 'activo',
  horario_apertura jsonb NOT NULL DEFAULT '{}'::jsonb,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sucursales_estado_idx ON public.sucursales (estado);

CREATE TABLE public.usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT '',
  telefono text,
  correo text UNIQUE,
  rol public.rol_usuario NOT NULL DEFAULT 'cliente',
  sucursal_id uuid REFERENCES public.sucursales (id),
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_telefono_chk CHECK (telefono IS NULL OR telefono ~ '^\+57[0-9]{10}$')
);

CREATE UNIQUE INDEX usuarios_correo_lower_uidx ON public.usuarios (lower(correo));
CREATE INDEX usuarios_rol_idx ON public.usuarios (rol);
CREATE INDEX usuarios_sucursal_id_idx ON public.usuarios (sucursal_id);

CREATE TABLE public.servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id uuid NOT NULL REFERENCES public.sucursales (id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text,
  precio numeric(12,2) NOT NULL DEFAULT 0,
  imagen text,
  tiempo_servicio int NOT NULL DEFAULT 30,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX servicios_sucursal_id_idx ON public.servicios (sucursal_id);
CREATE INDEX servicios_activo_idx ON public.servicios (activo);

CREATE TABLE public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id uuid NOT NULL REFERENCES public.sucursales (id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text,
  precio numeric(12,2) NOT NULL DEFAULT 0,
  imagen text,
  stock int NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX productos_sucursal_id_idx ON public.productos (sucursal_id);
CREATE INDEX productos_activo_idx ON public.productos (activo);

CREATE TABLE public.ordenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios (id),
  sucursal_id uuid NOT NULL REFERENCES public.sucursales (id),
  barbero_id uuid REFERENCES public.usuarios (id),
  estado public.estado_orden NOT NULL DEFAULT 'agendado',
  inicio timestamptz NOT NULL,
  fin timestamptz NOT NULL,
  fecha_servicio date GENERATED ALWAYS AS ((inicio AT TIME ZONE 'UTC')::date) STORED,
  hora_servicio time GENERATED ALWAYS AS ((inicio AT TIME ZONE 'UTC')::time) STORED,
  metodo_pago public.metodo_pago,
  total numeric(12,2) NOT NULL DEFAULT 0,
  notas text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ordenes_rango_chk CHECK (fin > inicio)
);

ALTER TABLE public.ordenes
ADD COLUMN IF NOT EXISTS franja tstzrange
GENERATED ALWAYS AS (tstzrange(inicio, fin, '[)')) STORED;

ALTER TABLE public.ordenes
DROP CONSTRAINT IF EXISTS ordenes_sin_solapamiento_excl;

ALTER TABLE public.ordenes
ADD CONSTRAINT ordenes_sin_solapamiento_excl
EXCLUDE USING gist (barbero_id WITH =, franja WITH &&)
WHERE (barbero_id IS NOT NULL AND estado IN ('agendado', 'proceso'));

CREATE INDEX ordenes_usuario_id_idx ON public.ordenes (usuario_id);
CREATE INDEX ordenes_barbero_id_idx ON public.ordenes (barbero_id);
CREATE INDEX ordenes_sucursal_id_idx ON public.ordenes (sucursal_id);
CREATE INDEX ordenes_inicio_idx ON public.ordenes (inicio);
CREATE INDEX ordenes_estado_idx ON public.ordenes (estado);

CREATE TABLE public.orden_detalle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL REFERENCES public.ordenes (id) ON DELETE CASCADE,
  tipo public.tipo_detalle NOT NULL,
  referencia_id uuid NOT NULL,
  cantidad int NOT NULL DEFAULT 1,
  precio_unitario numeric(12,2) NOT NULL DEFAULT 0,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orden_detalle_cantidad_chk CHECK (cantidad > 0)
);

CREATE INDEX orden_detalle_orden_id_idx ON public.orden_detalle (orden_id);
CREATE INDEX orden_detalle_tipo_ref_idx ON public.orden_detalle (tipo, referencia_id);

CREATE TABLE public.ganadores_servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL UNIQUE REFERENCES public.usuarios (id) ON DELETE CASCADE,
  servicios_completados int NOT NULL DEFAULT 0,
  disponible boolean NOT NULL DEFAULT false,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ganadores_mensuales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  mes date NOT NULL,
  reclamado boolean NOT NULL DEFAULT false,
  creado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, mes)
);

CREATE INDEX ganadores_mensuales_mes_idx ON public.ganadores_mensuales (mes);

CREATE TABLE public.configuracion_global (
  id boolean PRIMARY KEY DEFAULT true CHECK (id IS TRUE),
  porcentaje_barbero numeric(5,2) NOT NULL DEFAULT 50,
  creado_en timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.configuracion_global (id, porcentaje_barbero)
VALUES (true, 50)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.nomina_barberos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbero_id uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  orden_id uuid NOT NULL REFERENCES public.ordenes (id) ON DELETE CASCADE,
  porcentaje numeric(5,2) NOT NULL,
  valor_generado numeric(12,2) NOT NULL,
  pagado boolean NOT NULL DEFAULT false,
  creado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (barbero_id, orden_id)
);

CREATE INDEX nomina_barberos_barbero_id_idx ON public.nomina_barberos (barbero_id);
CREATE INDEX nomina_barberos_pagado_idx ON public.nomina_barberos (pagado);

CREATE TABLE public.gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id uuid NOT NULL REFERENCES public.sucursales (id) ON DELETE CASCADE,
  concepto text NOT NULL,
  valor numeric(12,2) NOT NULL,
  fecha date NOT NULL DEFAULT current_date,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gastos_sucursal_id_idx ON public.gastos (sucursal_id);
CREATE INDEX gastos_fecha_idx ON public.gastos (fecha);

CREATE TABLE public.socios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  porcentaje numeric(5,2) NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.rol_actual()
RETURNS public.rol_usuario
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.rol
  FROM public.usuarios u
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.sucursal_actual()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.sucursal_id
  FROM public.usuarios u
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.rol_actual() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.es_comercial()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.rol_actual() = 'comercial';
$$;

CREATE OR REPLACE FUNCTION public.es_barbero()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.rol_actual() = 'barbero';
$$;

CREATE OR REPLACE FUNCTION public.es_cliente()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.rol_actual() = 'cliente';
$$;

CREATE OR REPLACE FUNCTION public.crear_usuario_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, nombre, telefono, correo, rol, activo)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nombre', ''), ''),
    NULLIF(NEW.raw_user_meta_data->>'telefono', ''),
    NEW.email,
    'cliente',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.ganadores_servicios (usuario_id)
  VALUES (NEW.id)
  ON CONFLICT (usuario_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.crear_usuario_auth();

ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orden_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ganadores_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ganadores_mensuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomina_barberos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_global ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sucursales_select_public ON public.sucursales;
CREATE POLICY sucursales_select_public
ON public.sucursales
FOR SELECT
TO anon, authenticated
USING (estado = 'activo');

DROP POLICY IF EXISTS sucursales_write_admin ON public.sucursales;
CREATE POLICY sucursales_write_admin
ON public.sucursales
FOR ALL
TO authenticated
USING (public.es_admin())
WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS usuarios_select ON public.usuarios;
CREATE POLICY usuarios_select
ON public.usuarios
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.es_admin()
  OR (public.es_comercial() AND rol = 'cliente')
  OR (
    public.es_barbero()
    AND rol = 'cliente'
    AND EXISTS (
      SELECT 1
      FROM public.ordenes o
      WHERE o.barbero_id = auth.uid()
        AND o.usuario_id = public.usuarios.id
    )
  )
);

DROP POLICY IF EXISTS usuarios_update ON public.usuarios;
CREATE POLICY usuarios_update
ON public.usuarios
FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.es_admin())
WITH CHECK (id = auth.uid() OR public.es_admin());

DROP POLICY IF EXISTS usuarios_insert_admin ON public.usuarios;
CREATE POLICY usuarios_insert_admin
ON public.usuarios
FOR INSERT
TO authenticated
WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS servicios_select_public ON public.servicios;
CREATE POLICY servicios_select_public
ON public.servicios
FOR SELECT
TO anon, authenticated
USING (activo = true);

DROP POLICY IF EXISTS servicios_write_admin ON public.servicios;
CREATE POLICY servicios_write_admin
ON public.servicios
FOR ALL
TO authenticated
USING (public.es_admin())
WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS productos_select_public ON public.productos;
CREATE POLICY productos_select_public
ON public.productos
FOR SELECT
TO anon, authenticated
USING (activo = true);

DROP POLICY IF EXISTS productos_write_admin ON public.productos;
CREATE POLICY productos_write_admin
ON public.productos
FOR ALL
TO authenticated
USING (public.es_admin())
WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS ordenes_select ON public.ordenes;
CREATE POLICY ordenes_select
ON public.ordenes
FOR SELECT
TO authenticated
USING (
  public.es_admin()
  OR (public.es_cliente() AND usuario_id = auth.uid())
  OR (public.es_barbero() AND barbero_id = auth.uid())
  OR (public.es_comercial() AND (public.sucursal_actual() IS NULL OR sucursal_id = public.sucursal_actual()))
);

DROP POLICY IF EXISTS ordenes_insert ON public.ordenes;
CREATE POLICY ordenes_insert
ON public.ordenes
FOR INSERT
TO authenticated
WITH CHECK (
  public.es_admin()
  OR (public.es_cliente() AND usuario_id = auth.uid())
  OR public.es_comercial()
);

DROP POLICY IF EXISTS ordenes_update ON public.ordenes;
CREATE POLICY ordenes_update
ON public.ordenes
FOR UPDATE
TO authenticated
USING (
  public.es_admin()
  OR (public.es_cliente() AND usuario_id = auth.uid())
  OR (public.es_barbero() AND barbero_id = auth.uid())
  OR public.es_comercial()
)
WITH CHECK (
  public.es_admin()
  OR (public.es_cliente() AND usuario_id = auth.uid())
  OR (public.es_barbero() AND barbero_id = auth.uid())
  OR public.es_comercial()
);

DROP POLICY IF EXISTS orden_detalle_select ON public.orden_detalle;
CREATE POLICY orden_detalle_select
ON public.orden_detalle
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ordenes o
    WHERE o.id = orden_id
      AND (
        public.es_admin()
        OR (public.es_cliente() AND o.usuario_id = auth.uid())
        OR (public.es_barbero() AND o.barbero_id = auth.uid())
        OR public.es_comercial()
      )
  )
);

DROP POLICY IF EXISTS orden_detalle_insert ON public.orden_detalle;
CREATE POLICY orden_detalle_insert
ON public.orden_detalle
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.ordenes o
    WHERE o.id = orden_id
      AND (
        public.es_admin()
        OR public.es_comercial()
        OR (public.es_cliente() AND o.usuario_id = auth.uid() AND o.estado = 'agendado')
      )
  )
);

DROP POLICY IF EXISTS ganadores_servicios_select ON public.ganadores_servicios;
CREATE POLICY ganadores_servicios_select
ON public.ganadores_servicios
FOR SELECT
TO authenticated
USING (usuario_id = auth.uid() OR public.es_admin() OR public.es_comercial());

DROP POLICY IF EXISTS ganadores_mensuales_select ON public.ganadores_mensuales;
CREATE POLICY ganadores_mensuales_select
ON public.ganadores_mensuales
FOR SELECT
TO authenticated
USING (public.es_admin() OR public.es_comercial() OR usuario_id = auth.uid());

DROP POLICY IF EXISTS configuracion_global_select_admin ON public.configuracion_global;
CREATE POLICY configuracion_global_select_admin
ON public.configuracion_global
FOR SELECT
TO authenticated
USING (public.es_admin());

DROP POLICY IF EXISTS configuracion_global_write_admin ON public.configuracion_global;
CREATE POLICY configuracion_global_write_admin
ON public.configuracion_global
FOR UPDATE
TO authenticated
USING (public.es_admin())
WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS nomina_barberos_select ON public.nomina_barberos;
CREATE POLICY nomina_barberos_select
ON public.nomina_barberos
FOR SELECT
TO authenticated
USING (public.es_admin() OR barbero_id = auth.uid());

DROP POLICY IF EXISTS gastos_select ON public.gastos;
CREATE POLICY gastos_select
ON public.gastos
FOR SELECT
TO authenticated
USING (public.es_admin() OR public.es_comercial());

DROP POLICY IF EXISTS gastos_write_admin ON public.gastos;
CREATE POLICY gastos_write_admin
ON public.gastos
FOR ALL
TO authenticated
USING (public.es_admin())
WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS socios_select_admin ON public.socios;
CREATE POLICY socios_select_admin
ON public.socios
FOR SELECT
TO authenticated
USING (public.es_admin());

DROP POLICY IF EXISTS socios_write_admin ON public.socios;
CREATE POLICY socios_write_admin
ON public.socios
FOR ALL
TO authenticated
USING (public.es_admin())
WITH CHECK (public.es_admin());

CREATE OR REPLACE FUNCTION public.crear_orden(
  p_sucursal_id uuid,
  p_barbero_id uuid,
  p_inicio timestamptz,
  p_fin timestamptz,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_notas text DEFAULT NULL,
  p_usuario_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol public.rol_usuario;
  v_uid uuid;
  v_usuario_id uuid;
  v_total numeric(12,2) := 0;
  v_orden_id uuid;
  v_item jsonb;
  v_tipo text;
  v_referencia uuid;
  v_cantidad int;
  v_precio numeric(12,2);
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT u.rol INTO v_rol FROM public.usuarios u WHERE u.id = v_uid LIMIT 1;
  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_rol = 'cliente' THEN
    v_usuario_id := v_uid;
  ELSIF v_rol IN ('admin', 'comercial') THEN
    IF p_usuario_id IS NULL THEN
      RAISE EXCEPTION 'Missing usuario_id';
    END IF;
    v_usuario_id := p_usuario_id;
  ELSE
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.ordenes (usuario_id, sucursal_id, barbero_id, estado, inicio, fin, total, notas, actualizado_en)
  VALUES (v_usuario_id, p_sucursal_id, p_barbero_id, 'agendado', p_inicio, p_fin, 0, p_notas, now())
  RETURNING id INTO v_orden_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) LOOP
    v_tipo := COALESCE(v_item->>'tipo', '');
    v_referencia := NULLIF(v_item->>'referencia_id', '')::uuid;
    v_cantidad := GREATEST(COALESCE(NULLIF(v_item->>'cantidad', '')::int, 1), 1);

    IF v_referencia IS NULL THEN
      RAISE EXCEPTION 'Invalid referencia_id';
    END IF;

    IF v_tipo = 'servicio' THEN
      SELECT s.precio INTO v_precio
      FROM public.servicios s
      WHERE s.id = v_referencia
        AND s.sucursal_id = p_sucursal_id
        AND s.activo = true
      LIMIT 1;
    ELSIF v_tipo = 'producto' THEN
      SELECT p.precio INTO v_precio
      FROM public.productos p
      WHERE p.id = v_referencia
        AND p.sucursal_id = p_sucursal_id
        AND p.activo = true
      LIMIT 1;
    ELSE
      RAISE EXCEPTION 'Invalid tipo';
    END IF;

    IF v_precio IS NULL THEN
      RAISE EXCEPTION 'Invalid referencia_id';
    END IF;

    INSERT INTO public.orden_detalle (orden_id, tipo, referencia_id, cantidad, precio_unitario)
    VALUES (v_orden_id, v_tipo::public.tipo_detalle, v_referencia, v_cantidad, v_precio);

    v_total := v_total + (v_precio * v_cantidad);
  END LOOP;

  UPDATE public.ordenes
  SET total = v_total, actualizado_en = now()
  WHERE id = v_orden_id;

  RETURN v_orden_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.completar_servicio(p_orden_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_rol public.rol_usuario;
  v_orden record;
  v_cantidad_servicios int := 0;
  v_actual int := 0;
  v_disponible boolean := false;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT u.rol INTO v_rol FROM public.usuarios u WHERE u.id = v_uid LIMIT 1;
  IF v_rol NOT IN ('admin', 'barbero') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_orden FROM public.ordenes o WHERE o.id = p_orden_id LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden no encontrada';
  END IF;

  IF v_rol <> 'admin' AND v_orden.barbero_id <> v_uid THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_orden.estado = 'cancelado' THEN
    RAISE EXCEPTION 'Orden cancelada';
  END IF;

  IF v_orden.estado IN ('completado', 'pagado') THEN
    RETURN jsonb_build_object('ordenId', v_orden.id, 'estado', v_orden.estado);
  END IF;

  UPDATE public.ordenes
  SET estado = 'completado', actualizado_en = now()
  WHERE id = v_orden.id;

  SELECT COALESCE(SUM(od.cantidad), 0)::int INTO v_cantidad_servicios
  FROM public.orden_detalle od
  WHERE od.orden_id = v_orden.id
    AND od.tipo = 'servicio';

  SELECT gs.servicios_completados, gs.disponible
  INTO v_actual, v_disponible
  FROM public.ganadores_servicios gs
  WHERE gs.usuario_id = v_orden.usuario_id;

  v_actual := COALESCE(v_actual, 0) + v_cantidad_servicios;
  IF v_actual >= 10 THEN
    v_disponible := true;
    v_actual := v_actual % 10;
  END IF;

  UPDATE public.ganadores_servicios
  SET servicios_completados = v_actual,
      disponible = v_disponible
  WHERE usuario_id = v_orden.usuario_id;

  RETURN jsonb_build_object(
    'ordenId', v_orden.id,
    'estado', 'completado',
    'serviciosAgregados', v_cantidad_servicios,
    'fidelidad', jsonb_build_object('serviciosCompletados', v_actual, 'disponible', v_disponible)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sorteo_mensual_28()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mes date;
  v_ganador uuid;
BEGIN
  v_mes := date_trunc('month', now() AT TIME ZONE 'UTC')::date;

  SELECT o.usuario_id
  INTO v_ganador
  FROM public.ordenes o
  WHERE o.estado IN ('completado', 'pagado')
    AND o.inicio >= v_mes
    AND o.inicio < (v_mes + INTERVAL '1 month')
  ORDER BY random()
  LIMIT 1;

  IF v_ganador IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'ganadorId', NULL, 'mes', v_mes);
  END IF;

  INSERT INTO public.ganadores_mensuales (usuario_id, mes)
  VALUES (v_ganador, v_mes)
  ON CONFLICT (usuario_id, mes) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'ganadorId', v_ganador, 'mes', v_mes);
END;
$$;

CREATE OR REPLACE FUNCTION public.calcular_nomina_barbero(p_mes date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_porcentaje numeric(5,2);
  v_inicio timestamptz;
  v_fin timestamptz;
BEGIN
  SELECT cg.porcentaje_barbero INTO v_porcentaje
  FROM public.configuracion_global cg
  WHERE cg.id = true;

  v_inicio := (date_trunc('month', p_mes)::date)::timestamptz;
  v_fin := (v_inicio + INTERVAL '1 month');

  INSERT INTO public.nomina_barberos (barbero_id, orden_id, porcentaje, valor_generado)
  SELECT
    o.barbero_id,
    o.id,
    v_porcentaje,
    (o.total * (v_porcentaje / 100.0))
  FROM public.ordenes o
  WHERE o.estado = 'pagado'
    AND o.barbero_id IS NOT NULL
    AND o.inicio >= v_inicio
    AND o.inicio < v_fin
  ON CONFLICT (barbero_id, orden_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'mes', p_mes, 'porcentaje', v_porcentaje);
END;
$$;

COMMIT;
