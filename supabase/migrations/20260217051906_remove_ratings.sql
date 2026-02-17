
-- Eliminar tabla de testimonios (si existe)
drop table if exists public.testimonials;

-- Eliminar columnas de rating en caso de que existieran en otras tablas
-- (basado en la estructura actual, no parecen existir en services/products, pero por si acaso)
-- alter table public.services drop column if exists rating;
-- alter table public.products drop column if exists rating;
