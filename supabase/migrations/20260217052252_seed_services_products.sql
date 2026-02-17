
-- Insertar servicios de prueba para Bogotá (o cualquier sucursal activa)
with target_branch as (
  select id from public.branches where name like '%Bogota%' or city = 'Bogotá' limit 1
)
insert into public.services (branch_id, name, description, duration_minutes, price_cents, is_active)
select 
  tb.id,
  'Corte Clásico',
  'Corte de cabello tradicional con tijera y máquina.',
  45,
  2500000, -- $25,000 COP (en centavos si usas COP, o ajusta según tu moneda)
  true
from target_branch tb
union all
select 
  tb.id,
  'Barba Express',
  'Perfilado y arreglo de barba rápido.',
  30,
  1500000,
  true
from target_branch tb
on conflict do nothing;

-- Insertar productos de prueba para Bogotá
with target_branch as (
  select id from public.branches where name like '%Bogota%' or city = 'Bogotá' limit 1
)
insert into public.products (branch_id, name, sku, description, price_cents, is_active)
select 
  tb.id,
  'Cera Mate',
  'WAX-001',
  'Cera de fijación fuerte y acabado mate.',
  3500000,
  true
from target_branch tb
union all
select 
  tb.id,
  'Aceite para Barba',
  'OIL-001',
  'Hidratación profunda para tu barba.',
  4000000,
  true
from target_branch tb
on conflict do nothing;
