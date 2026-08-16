-- Un usuario puede solicitar más plazo en un curso con examen que ya
-- venció (fecha_fin pasada). El admin del curso (super admin o admin
-- de la organización dueña) la ve y la marca como resuelta —
-- típicamente después de extender fecha_fin desde el panel del curso.

create table solicitudes_plazo (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  usuario_id uuid not null references perfiles(id) on delete cascade,
  mensaje text,
  estado text not null default 'pendiente',
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz,
  resuelto_por uuid references perfiles(id)
);

alter table solicitudes_plazo enable row level security;

create policy "Usuarios crean sus solicitudes de plazo"
  on solicitudes_plazo for insert
  with check (usuario_id = auth.uid());

create policy "Usuarios ven sus solicitudes de plazo"
  on solicitudes_plazo for select
  using (usuario_id = auth.uid());

create policy "Admins del curso ven y resuelven solicitudes de plazo"
  on solicitudes_plazo for all
  using (
    es_super_admin()
    or exists (
      select 1 from cursos c
      where c.id = solicitudes_plazo.curso_id
        and c.visibilidad = 'privado'
        and es_admin_de_organizacion(c.organizacion_id)
    )
  )
  with check (
    es_super_admin()
    or exists (
      select 1 from cursos c
      where c.id = solicitudes_plazo.curso_id
        and c.visibilidad = 'privado'
        and es_admin_de_organizacion(c.organizacion_id)
    )
  );
