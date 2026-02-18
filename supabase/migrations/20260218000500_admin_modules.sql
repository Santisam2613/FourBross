ALTER TABLE public.gastos
ADD COLUMN IF NOT EXISTS categoria text,
ADD COLUMN IF NOT EXISTS descripcion text;

CREATE TABLE IF NOT EXISTS public.inventario_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id uuid NOT NULL REFERENCES public.sucursales (id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES public.productos (id) ON DELETE CASCADE,
  delta int NOT NULL,
  motivo text NOT NULL,
  usuario_id uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE RESTRICT,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventario_movimientos_sucursal_id_idx ON public.inventario_movimientos (sucursal_id);
CREATE INDEX IF NOT EXISTS inventario_movimientos_producto_id_idx ON public.inventario_movimientos (producto_id);
CREATE INDEX IF NOT EXISTS inventario_movimientos_creado_en_idx ON public.inventario_movimientos (creado_en);

ALTER TABLE public.inventario_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventario_movimientos_select_admin ON public.inventario_movimientos;
CREATE POLICY inventario_movimientos_select_admin
ON public.inventario_movimientos
FOR SELECT
TO authenticated
USING (public.es_admin());

DROP POLICY IF EXISTS inventario_movimientos_write_admin ON public.inventario_movimientos;
CREATE POLICY inventario_movimientos_write_admin
ON public.inventario_movimientos
FOR ALL
TO authenticated
USING (public.es_admin())
WITH CHECK (public.es_admin());

CREATE OR REPLACE FUNCTION public.ajustar_stock_producto(
  p_producto_id uuid,
  p_delta int,
  p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_rol public.rol_usuario;
  v_producto record;
  v_next_stock int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT u.rol INTO v_rol
  FROM public.usuarios u
  WHERE u.id = v_uid
  LIMIT 1;

  IF v_rol <> 'admin' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_delta = 0 THEN
    RAISE EXCEPTION 'Invalid delta';
  END IF;

  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RAISE EXCEPTION 'Missing motivo';
  END IF;

  SELECT * INTO v_producto FROM public.productos p WHERE p.id = p_producto_id LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  v_next_stock := COALESCE(v_producto.stock, 0) + p_delta;
  IF v_next_stock < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente';
  END IF;

  UPDATE public.productos
  SET stock = v_next_stock
  WHERE id = v_producto.id;

  INSERT INTO public.inventario_movimientos (sucursal_id, producto_id, delta, motivo, usuario_id)
  VALUES (v_producto.sucursal_id, v_producto.id, p_delta, p_motivo, v_uid);

  RETURN jsonb_build_object('productoId', v_producto.id, 'stock', v_next_stock);
END;
$$;

CREATE TABLE IF NOT EXISTS public.nomina_fija (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id uuid NOT NULL REFERENCES public.sucursales (id) ON DELETE CASCADE,
  empleado_nombre text NOT NULL,
  mes date NOT NULL,
  valor numeric(12,2) NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nomina_fija_sucursal_id_idx ON public.nomina_fija (sucursal_id);
CREATE INDEX IF NOT EXISTS nomina_fija_mes_idx ON public.nomina_fija (mes);

ALTER TABLE public.nomina_fija ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nomina_fija_select_admin ON public.nomina_fija;
CREATE POLICY nomina_fija_select_admin
ON public.nomina_fija
FOR SELECT
TO authenticated
USING (public.es_admin());

DROP POLICY IF EXISTS nomina_fija_write_admin ON public.nomina_fija;
CREATE POLICY nomina_fija_write_admin
ON public.nomina_fija
FOR ALL
TO authenticated
USING (public.es_admin())
WITH CHECK (public.es_admin());

CREATE TABLE IF NOT EXISTS public.pagos_barberos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbero_id uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  sucursal_id uuid NOT NULL REFERENCES public.sucursales (id) ON DELETE CASCADE,
  metodo_pago public.metodo_pago,
  valor numeric(12,2) NOT NULL,
  fecha date NOT NULL DEFAULT current_date,
  notas text,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pagos_barberos_barbero_id_idx ON public.pagos_barberos (barbero_id);
CREATE INDEX IF NOT EXISTS pagos_barberos_sucursal_id_idx ON public.pagos_barberos (sucursal_id);
CREATE INDEX IF NOT EXISTS pagos_barberos_fecha_idx ON public.pagos_barberos (fecha);

ALTER TABLE public.pagos_barberos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pagos_barberos_select_admin ON public.pagos_barberos;
CREATE POLICY pagos_barberos_select_admin
ON public.pagos_barberos
FOR SELECT
TO authenticated
USING (public.es_admin());

DROP POLICY IF EXISTS pagos_barberos_write_admin ON public.pagos_barberos;
CREATE POLICY pagos_barberos_write_admin
ON public.pagos_barberos
FOR ALL
TO authenticated
USING (public.es_admin())
WITH CHECK (public.es_admin());

CREATE TABLE IF NOT EXISTS public.cierres_mensuales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id uuid REFERENCES public.sucursales (id) ON DELETE CASCADE,
  mes date NOT NULL,
  ingresos numeric(12,2) NOT NULL DEFAULT 0,
  egresos numeric(12,2) NOT NULL DEFAULT 0,
  nomina_variable numeric(12,2) NOT NULL DEFAULT 0,
  nomina_fija numeric(12,2) NOT NULL DEFAULT 0,
  utilidad numeric(12,2) NOT NULL DEFAULT 0,
  creado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sucursal_id, mes)
);

CREATE INDEX IF NOT EXISTS cierres_mensuales_mes_idx ON public.cierres_mensuales (mes);
CREATE INDEX IF NOT EXISTS cierres_mensuales_sucursal_id_idx ON public.cierres_mensuales (sucursal_id);

ALTER TABLE public.cierres_mensuales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cierres_mensuales_select_admin ON public.cierres_mensuales;
CREATE POLICY cierres_mensuales_select_admin
ON public.cierres_mensuales
FOR SELECT
TO authenticated
USING (public.es_admin());

DROP POLICY IF EXISTS cierres_mensuales_write_admin ON public.cierres_mensuales;
CREATE POLICY cierres_mensuales_write_admin
ON public.cierres_mensuales
FOR ALL
TO authenticated
USING (public.es_admin())
WITH CHECK (public.es_admin());

CREATE TABLE IF NOT EXISTS public.repartos_socios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cierre_id uuid NOT NULL REFERENCES public.cierres_mensuales (id) ON DELETE CASCADE,
  socio_id uuid NOT NULL REFERENCES public.socios (id) ON DELETE RESTRICT,
  porcentaje numeric(5,2) NOT NULL,
  valor numeric(12,2) NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repartos_socios_cierre_id_idx ON public.repartos_socios (cierre_id);
CREATE INDEX IF NOT EXISTS repartos_socios_socio_id_idx ON public.repartos_socios (socio_id);

ALTER TABLE public.repartos_socios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS repartos_socios_select_admin ON public.repartos_socios;
CREATE POLICY repartos_socios_select_admin
ON public.repartos_socios
FOR SELECT
TO authenticated
USING (public.es_admin());

DROP POLICY IF EXISTS repartos_socios_write_admin ON public.repartos_socios;
CREATE POLICY repartos_socios_write_admin
ON public.repartos_socios
FOR ALL
TO authenticated
USING (public.es_admin())
WITH CHECK (public.es_admin());

CREATE OR REPLACE FUNCTION public.cerrar_mes(
  p_mes date,
  p_sucursal_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_rol public.rol_usuario;
  v_mes date;
  v_inicio timestamptz;
  v_fin timestamptz;
  v_ingresos numeric(12,2) := 0;
  v_egresos numeric(12,2) := 0;
  v_nomina_variable numeric(12,2) := 0;
  v_nomina_fija numeric(12,2) := 0;
  v_utilidad numeric(12,2) := 0;
  v_cierre_id uuid;
  v_total_pct numeric(12,2) := 0;
  v_socio record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT u.rol INTO v_rol
  FROM public.usuarios u
  WHERE u.id = v_uid
  LIMIT 1;

  IF v_rol <> 'admin' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_mes := date_trunc('month', p_mes)::date;
  v_inicio := (v_mes::timestamptz);
  v_fin := (v_mes + INTERVAL '1 month')::timestamptz;

  PERFORM public.calcular_nomina_barbero(v_mes);

  SELECT COALESCE(SUM(o.total), 0)
  INTO v_ingresos
  FROM public.ordenes o
  WHERE o.estado = 'pagado'
    AND o.inicio >= v_inicio
    AND o.inicio < v_fin
    AND (p_sucursal_id IS NULL OR o.sucursal_id = p_sucursal_id);

  SELECT COALESCE(SUM(g.valor), 0)
  INTO v_egresos
  FROM public.gastos g
  WHERE g.fecha >= v_mes
    AND g.fecha < (v_mes + INTERVAL '1 month')::date
    AND (p_sucursal_id IS NULL OR g.sucursal_id = p_sucursal_id);

  SELECT COALESCE(SUM(nb.valor_generado), 0)
  INTO v_nomina_variable
  FROM public.nomina_barberos nb
  JOIN public.ordenes o ON o.id = nb.orden_id
  WHERE o.estado = 'pagado'
    AND o.inicio >= v_inicio
    AND o.inicio < v_fin
    AND (p_sucursal_id IS NULL OR o.sucursal_id = p_sucursal_id);

  SELECT COALESCE(SUM(nf.valor), 0)
  INTO v_nomina_fija
  FROM public.nomina_fija nf
  WHERE nf.mes = v_mes
    AND (p_sucursal_id IS NULL OR nf.sucursal_id = p_sucursal_id);

  v_utilidad := v_ingresos - v_egresos - v_nomina_variable - v_nomina_fija;

  INSERT INTO public.cierres_mensuales (sucursal_id, mes, ingresos, egresos, nomina_variable, nomina_fija, utilidad)
  VALUES (p_sucursal_id, v_mes, v_ingresos, v_egresos, v_nomina_variable, v_nomina_fija, v_utilidad)
  ON CONFLICT (sucursal_id, mes)
  DO UPDATE SET ingresos = EXCLUDED.ingresos,
                egresos = EXCLUDED.egresos,
                nomina_variable = EXCLUDED.nomina_variable,
                nomina_fija = EXCLUDED.nomina_fija,
                utilidad = EXCLUDED.utilidad
  RETURNING id INTO v_cierre_id;

  DELETE FROM public.repartos_socios rs WHERE rs.cierre_id = v_cierre_id;

  SELECT COALESCE(SUM(s.porcentaje), 0)
  INTO v_total_pct
  FROM public.socios s
  WHERE s.activo = true;

  IF v_total_pct > 0 THEN
    FOR v_socio IN
      SELECT s.id, s.porcentaje
      FROM public.socios s
      WHERE s.activo = true
    LOOP
      INSERT INTO public.repartos_socios (cierre_id, socio_id, porcentaje, valor)
      VALUES (v_cierre_id, v_socio.id, v_socio.porcentaje, (v_utilidad * (v_socio.porcentaje / v_total_pct)));
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'cierreId', v_cierre_id,
    'mes', v_mes,
    'sucursalId', p_sucursal_id,
    'ingresos', v_ingresos,
    'egresos', v_egresos,
    'nominaVariable', v_nomina_variable,
    'nominaFija', v_nomina_fija,
    'utilidad', v_utilidad
  );
END;
$$;

GRANT ALL ON public.inventario_movimientos TO postgres, service_role;
GRANT ALL ON public.nomina_fija TO postgres, service_role;
GRANT ALL ON public.pagos_barberos TO postgres, service_role;
GRANT ALL ON public.cierres_mensuales TO postgres, service_role;
GRANT ALL ON public.repartos_socios TO postgres, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario_movimientos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nomina_fija TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagos_barberos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cierres_mensuales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repartos_socios TO authenticated;

GRANT EXECUTE ON FUNCTION public.ajustar_stock_producto(uuid, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cerrar_mes(date, uuid) TO authenticated;
