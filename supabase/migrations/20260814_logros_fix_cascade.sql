-- Dos arreglos:
-- 1) Borrar un logro del catálogo fallaba si alguien ya lo había obtenido
--    (violación de FK). Se agrega ON DELETE CASCADE.
-- 2) logros_usuario no tenía política de admin, así que un DELETE desde
--    el panel /admin/logros no borraba nada (RLS lo bloqueaba en
--    silencio, sin error) — por eso el "Borrar" ahí no funcionaba.

alter table logros_usuario drop constraint if exists logros_usuario_logro_id_fkey;
alter table logros_usuario
  add constraint logros_usuario_logro_id_fkey
  foreign key (logro_id) references logros(id) on delete cascade;

create policy "Admins gestionan logros_usuario"
  on logros_usuario for all
  using (exists (select 1 from perfiles p where p.id = auth.uid() and p.es_admin_plataforma))
  with check (exists (select 1 from perfiles p where p.id = auth.uid() and p.es_admin_plataforma));
