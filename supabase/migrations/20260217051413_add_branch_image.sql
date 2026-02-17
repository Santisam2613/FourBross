
-- Agregar columna image_url a la tabla branches
alter table public.branches
add column if not exists image_url text;

-- Actualizar la sucursal de Bogotá con una imagen por defecto
update public.branches
set image_url = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1600&auto=format&fit=crop'
where name like '%Bogota%' or city = 'Bogotá';
