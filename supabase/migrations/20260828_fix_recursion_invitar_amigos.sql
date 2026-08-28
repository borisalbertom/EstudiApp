-- La migración anterior (20260828_invitar_amigos_curso_privado.sql) causaba
-- recursión infinita (42P17): la policy de SELECT en "cursos" consultaba
-- "inscripciones_curso", cuya propia policy volvía a consultar "cursos",
-- en un ciclo. Es el mismo problema ya resuelto una vez en
-- 20260816_fix_recursion_rls.sql — misma solución: mover el chequeo a
-- funciones SECURITY DEFINER, que no aplican RLS internamente y cortan
-- el ciclo.

drop policy if exists "Ver cursos donde estoy inscrito" on cursos;
drop policy if exists "Creadores invitan amigos a sus pruebas y trivias" on inscripciones_curso;

create or replace function tengo_inscripcion_en(curso_id_param uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from inscripciones_curso i
    where i.curso_id = curso_id_param and i.usuario_id = auth.uid()
  );
$$;

create or replace function es_creador_de_curso_personal(curso_id_param uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from cursos c
    where c.id = curso_id_param
      and c.creado_por = auth.uid()
      and c.organizacion_id is null
  );
$$;

create policy "Ver cursos donde estoy inscrito"
  on cursos for select
  using (tengo_inscripcion_en(id));

create policy "Creadores invitan amigos a sus pruebas y trivias"
  on inscripciones_curso for all
  using (es_creador_de_curso_personal(curso_id))
  with check (es_creador_de_curso_personal(curso_id));
