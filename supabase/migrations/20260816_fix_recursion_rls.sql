-- FIX URGENTE: las políticas de "Org admins gestionan miembros de su
-- organizacion" (en miembros_organizacion) y "Super admins gestionan
-- perfiles" (en perfiles) se referencian a sí mismas dentro de su
-- propia condición, lo que Postgres detecta como recursión infinita
-- (42P17) — esto rompía la lectura de "cursos" para TODOS los
-- usuarios, no solo admins.
--
-- Solución estándar: mover el chequeo a funciones SECURITY DEFINER,
-- que se ejecutan sin aplicar RLS internamente y así cortan el ciclo.

drop policy if exists "Org admins gestionan miembros de su organizacion" on miembros_organizacion;
drop policy if exists "Org admins gestionan cursos de su organizacion" on cursos;
drop policy if exists "Org admins gestionan temas de su organizacion" on temas;
drop policy if exists "Org admins gestionan preguntas de su organizacion" on preguntas;
drop policy if exists "Super admins gestionan perfiles" on perfiles;

create or replace function es_admin_de_organizacion(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from miembros_organizacion m
    where m.usuario_id = auth.uid()
      and m.organizacion_id = org_id
      and m.rol = 'admin_curso'
  );
$$;

create or replace function es_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select p.es_admin_plataforma from perfiles p where p.id = auth.uid()), false);
$$;

create policy "Org admins gestionan miembros de su organizacion"
  on miembros_organizacion for all
  using (es_admin_de_organizacion(organizacion_id))
  with check (es_admin_de_organizacion(organizacion_id));

create policy "Org admins gestionan cursos de su organizacion"
  on cursos for all
  using (visibilidad = 'privado' and es_admin_de_organizacion(organizacion_id))
  with check (visibilidad = 'privado' and es_admin_de_organizacion(organizacion_id));

create policy "Org admins gestionan temas de su organizacion"
  on temas for all
  using (
    exists (
      select 1 from cursos c
      where c.id = temas.curso_id
        and c.visibilidad = 'privado'
        and es_admin_de_organizacion(c.organizacion_id)
    )
  )
  with check (
    exists (
      select 1 from cursos c
      where c.id = temas.curso_id
        and c.visibilidad = 'privado'
        and es_admin_de_organizacion(c.organizacion_id)
    )
  );

create policy "Org admins gestionan preguntas de su organizacion"
  on preguntas for all
  using (
    exists (
      select 1 from temas t
      join cursos c on c.id = t.curso_id
      where t.id = preguntas.tema_id
        and c.visibilidad = 'privado'
        and es_admin_de_organizacion(c.organizacion_id)
    )
  )
  with check (
    exists (
      select 1 from temas t
      join cursos c on c.id = t.curso_id
      where t.id = preguntas.tema_id
        and c.visibilidad = 'privado'
        and es_admin_de_organizacion(c.organizacion_id)
    )
  );

create policy "Super admins gestionan perfiles"
  on perfiles for update
  using (es_super_admin())
  with check (es_super_admin());
