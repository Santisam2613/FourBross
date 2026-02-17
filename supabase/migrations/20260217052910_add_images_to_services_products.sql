
-- Agregar columna image_url a services
alter table public.services
add column if not exists image_url text;

-- Agregar columna image_url a products
alter table public.products
add column if not exists image_url text;

-- Actualizar servicios de prueba con imágenes
update public.services
set image_url = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1600&auto=format&fit=crop'
where name = 'Corte Clásico';

update public.services
set image_url = 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=1600&auto=format&fit=crop'
where name = 'Barba Express';

-- Actualizar productos de prueba con imágenes
update public.products
set image_url = 'https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?q=80&w=1600&auto=format&fit=crop'
where name = 'Cera Mate';

update public.products
set image_url = 'https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?q=80&w=1600&auto=format&fit=crop'
where name = 'Aceite para Barba';
