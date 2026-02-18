CREATE OR REPLACE FUNCTION public.actualizar_orden_comercial(
  p_orden_id uuid,
  p_estado public.estado_orden DEFAULT NULL,
  p_inicio timestamptz DEFAULT NULL,
  p_fin timestamptz DEFAULT NULL,
  p_barbero_id uuid DEFAULT NULL,
  p_clear_barbero boolean DEFAULT false,
  p_notas text DEFAULT NULL,
  p_items jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_rol public.rol_usuario;
  v_sucursal uuid;
  v_orden record;
  v_item jsonb;
  v_tipo text;
  v_referencia uuid;
  v_cantidad int;
  v_precio numeric(12,2);
  v_total numeric(12,2) := 0;
  v_has_service boolean := false;
  v_new_barbero uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT u.rol, u.sucursal_id
  INTO v_rol, v_sucursal
  FROM public.usuarios u
  WHERE u.id = v_uid
  LIMIT 1;

  IF v_rol NOT IN ('admin', 'comercial') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT *
  INTO v_orden
  FROM public.ordenes o
  WHERE o.id = p_orden_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden no encontrada';
  END IF;

  IF v_rol = 'comercial' AND v_sucursal IS NOT NULL AND v_orden.sucursal_id <> v_sucursal THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_new_barbero := CASE
    WHEN p_clear_barbero THEN NULL
    WHEN p_barbero_id IS NOT NULL THEN p_barbero_id
    ELSE v_orden.barbero_id
  END;

  IF p_items IS NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.orden_detalle od
      WHERE od.orden_id = v_orden.id
        AND od.tipo = 'servicio'
    )
    INTO v_has_service;
  END IF;

  IF p_items IS NOT NULL THEN
    DELETE FROM public.orden_detalle od WHERE od.orden_id = v_orden.id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) LOOP
      v_tipo := COALESCE(v_item->>'tipo', '');
      v_referencia := NULLIF(v_item->>'referencia_id', '')::uuid;
      v_cantidad := GREATEST(COALESCE(NULLIF(v_item->>'cantidad', '')::int, 1), 1);

      IF v_referencia IS NULL THEN
        RAISE EXCEPTION 'Invalid referencia_id';
      END IF;

      v_precio := NULL;
      IF v_item ? 'precio_unitario' THEN
        v_precio := NULLIF(v_item->>'precio_unitario', '')::numeric;
      END IF;

      IF v_precio IS NULL THEN
        IF v_tipo = 'servicio' THEN
          SELECT s.precio INTO v_precio
          FROM public.servicios s
          WHERE s.id = v_referencia
            AND s.sucursal_id = v_orden.sucursal_id
            AND s.activo = true
          LIMIT 1;
        ELSIF v_tipo = 'producto' THEN
          SELECT p.precio INTO v_precio
          FROM public.productos p
          WHERE p.id = v_referencia
            AND p.sucursal_id = v_orden.sucursal_id
            AND p.activo = true
          LIMIT 1;
        ELSE
          RAISE EXCEPTION 'Invalid tipo';
        END IF;
      END IF;

      IF v_precio IS NULL THEN
        RAISE EXCEPTION 'Invalid referencia_id';
      END IF;

      IF v_tipo = 'servicio' THEN
        v_has_service := true;
      END IF;

      INSERT INTO public.orden_detalle (orden_id, tipo, referencia_id, cantidad, precio_unitario)
      VALUES (v_orden.id, v_tipo::public.tipo_detalle, v_referencia, v_cantidad, v_precio);

      v_total := v_total + (v_precio * v_cantidad);
    END LOOP;

    UPDATE public.ordenes
    SET total = v_total,
        actualizado_en = now()
    WHERE id = v_orden.id;
  END IF;

  IF v_has_service AND v_new_barbero IS NULL THEN
    RAISE EXCEPTION 'Missing barbero_id';
  END IF;

  UPDATE public.ordenes
  SET estado = COALESCE(p_estado, estado),
      inicio = COALESCE(p_inicio, inicio),
      fin = COALESCE(p_fin, fin),
      barbero_id = v_new_barbero,
      notas = p_notas,
      actualizado_en = now()
  WHERE id = v_orden.id;

  RETURN jsonb_build_object('ordenId', v_orden.id);
END;
$$;
