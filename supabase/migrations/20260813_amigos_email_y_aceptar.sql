-- Búsqueda de amigos por email + flujo de aceptar/rechazar solicitudes.
-- Correr en el SQL Editor de Supabase.

-- 1) perfiles no tenía email propio (vivía solo en auth.users)
alter table perfiles add column if not exists email text;

update perfiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- 2) amistades no tenía política de UPDATE, así que nadie podía
-- aceptar ni rechazar una solicitud recibida.
create policy "Responder solicitud de amistad"
  on amistades for update
  using (auth.uid() = usuario_b)
  with check (auth.uid() = usuario_b);
