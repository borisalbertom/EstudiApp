create table inscripciones_curso (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  usuario_id uuid not null references perfiles(id) on delete cascade,
  estado text not null default 'inscrito' check (estado in ('inscrito', 'asignado')),
  asignado_por uuid references perfiles(id),
  visto boolean not null default true,
  creado_en timestamptz not null default now(),
  unique (curso_id, usuario_id)
);

create index idx_inscripciones_usuario on inscripciones_curso(usuario_id);
create index idx_inscripciones_curso on inscripciones_curso(curso_id);

alter table inscripciones_curso enable row level security;

create policy "Ver mis inscripciones"
  on inscripciones_curso for select
  using (auth.uid() = usuario_id);

create policy "Inscribirse a cursos publicos"
  on inscripciones_curso for insert
  with check (
    auth.uid() = usuario_id
    and estado = 'inscrito'
    and exists (select 1 from cursos c where c.id = curso_id and c.visibilidad = 'publico')
  );

create policy "Marcar inscripcion como vista"
  on inscripciones_curso for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create policy "Admins asignan inscripciones de su organizacion"
  on inscripciones_curso for all
  using (
    es_super_admin()
    or exists (
      select 1 from cursos c
      where c.id = inscripciones_curso.curso_id
      and c.organizacion_id is not null
      and es_admin_de_organizacion(c.organizacion_id)
    )
  )
  with check (
    es_super_admin()
    or exists (
      select 1 from cursos c
      where c.id = inscripciones_curso.curso_id
      and c.organizacion_id is not null
      and es_admin_de_organizacion(c.organizacion_id)
    )
  );

-- Backfill: hoy cualquier usuario ve automaticamente los cursos publicos y los
-- privados de su organizacion, sin inscripcion explicita. Para que nadie pierda
-- acceso el dia que esto se publique, se crea la inscripcion retroactiva segun
-- el acceso que ya tenian.
insert into inscripciones_curso (curso_id, usuario_id, estado, visto)
select c.id, p.id, 'inscrito', true
from cursos c
cross join perfiles p
where c.visibilidad = 'publico'
on conflict (curso_id, usuario_id) do nothing;

insert into inscripciones_curso (curso_id, usuario_id, estado, visto)
select c.id, m.usuario_id, 'asignado', true
from cursos c
join miembros_organizacion m on m.organizacion_id = c.organizacion_id
where c.visibilidad = 'privado'
on conflict (curso_id, usuario_id) do nothing;
