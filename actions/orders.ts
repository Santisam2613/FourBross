"use server";

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CreateOrderItem =
  | { type: 'service'; serviceId: string; quantity?: number }
  | { type: 'product'; productId: string; quantity?: number };

export type CreateOrderInput = {
  branchId: string;
  staffId?: string | null;
  startAt?: string;
  endAt?: string;
  notes?: string;
  clientId?: string;
  items?: CreateOrderItem[];
};

async function callEdgeFunction<T>(name: string, payload: unknown) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.functions.invoke(name, { body: payload as any });
  if (error) throw new Error(error.message);
  return data as T;
}

export async function createOrder(input: CreateOrderInput) {
  const supabase = await createSupabaseServerClient();

  const items = input.items ?? [];
  if (!input.branchId) throw new Error('Missing branchId');
  if (items.length === 0) throw new Error('Missing items');

  const hasService = items.some((it) => it.type === 'service');
  let staffId = input.staffId ?? null;
  let startAt = input.startAt;
  let endAt = input.endAt;

  if (hasService) {
    if (!staffId || !startAt || !endAt) throw new Error('Missing required fields');
  } else {
    staffId = null;
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 1000);
    startAt = start.toISOString();
    endAt = end.toISOString();
  }

  const rpcItems = items.map((item) => {
    const cantidad = Math.max(1, item.quantity ?? 1);
    if (item.type === 'service') {
      return { tipo: 'servicio', referencia_id: item.serviceId, cantidad };
    }
    return { tipo: 'producto', referencia_id: item.productId, cantidad };
  });

  const { data, error } = await supabase.rpc('crear_orden', {
    p_sucursal_id: input.branchId,
    p_barbero_id: staffId,
    p_inicio: startAt,
    p_fin: endAt,
    p_items: rpcItems,
    p_notas: input.notes ?? null,
    p_usuario_id: input.clientId ?? null,
  });

  if (error) {
    if (error.message.includes('Forbidden')) throw new Error(error.message);
    if (error.message.includes('Unauthorized')) throw new Error(error.message);
    if (error.message.toLowerCase().includes('solap')) throw new Error('Barbero no disponible para esa hora');
    throw new Error(error.message);
  }

  return String(data);
}

export async function completeService(orderId: string) {
  const data = await callEdgeFunction<{
    ordenId: string;
    estado: 'completado' | 'pagado' | 'cancelado' | 'agendado' | 'proceso';
    serviciosAgregados?: number;
    fidelidad?: { serviciosCompletados: number; disponible: boolean };
  }>('complete-service', { orderId });
  return data;
}

export async function listMyOrders() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('ordenes')
    .select('id, estado, inicio, fin, sucursal_id, barbero_id, creado_en, total')
    .order('inicio', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getOrderById(orderId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('ordenes')
    .select(
      'id, estado, inicio, fin, sucursal_id, barbero_id, usuario_id, notas, metodo_pago, total, creado_en'
    )
    .eq('id', orderId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listOrderItems(orderId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('orden_detalle')
    .select('id, tipo, referencia_id, cantidad, precio_unitario')
    .eq('orden_id', orderId);

  if (error) throw new Error(error.message);
  return data ?? [];
}
