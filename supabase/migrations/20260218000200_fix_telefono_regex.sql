BEGIN;

ALTER TABLE public.usuarios
DROP CONSTRAINT IF EXISTS usuarios_telefono_chk;

ALTER TABLE public.usuarios
ADD CONSTRAINT usuarios_telefono_chk
CHECK (telefono IS NULL OR telefono ~ '^\+57[0-9]{10}$');

COMMIT;
