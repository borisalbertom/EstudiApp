-- Material de estudio (PDFs, apuntes) subido por el admin del curso,
-- organizado por tema/módulo. Por ahora solo subir archivos — la
-- generación automática de preguntas a partir de este contenido
-- queda para más adelante.

create table materiales_tema (
  id uuid primary key default gen_random_uuid(),
  tema_id uuid not null references temas(id) on delete cascade,
  nombre_archivo text not null,
  url text not null,
  subido_por uuid not null references perfiles(id),
  creado_en timestamptz not null default now()
);

alter table materiales_tema enable row level security;

create policy "Ver materiales de estudio"
  on materiales_tema for select
  using (true);

create policy "Admins del curso suben materiales de estudio"
  on materiales_tema for insert
  with check (
    exists (
      select 1 from temas t join cursos c on c.id = t.curso_id
      where t.id = materiales_tema.tema_id
        and (
          es_super_admin()
          or (c.visibilidad = 'privado' and es_admin_de_organizacion(c.organizacion_id))
        )
    )
  );

create policy "Admins del curso borran materiales de estudio"
  on materiales_tema for delete
  using (
    exists (
      select 1 from temas t join cursos c on c.id = t.curso_id
      where t.id = materiales_tema.tema_id
        and (
          es_super_admin()
          or (c.visibilidad = 'privado' and es_admin_de_organizacion(c.organizacion_id))
        )
    )
  );

-- Bucket de Storage para los archivos. Público para lectura simple
-- (igual que "avatars"); la subida/borrado sí está restringida.
insert into storage.buckets (id, name, public)
values ('materiales', 'materiales', true)
on conflict (id) do nothing;

create policy "Ver archivos de materiales"
  on storage.objects for select
  using (bucket_id = 'materiales');

create policy "Admins del curso suben archivos de materiales"
  on storage.objects for insert
  with check (
    bucket_id = 'materiales'
    and exists (
      select 1 from temas t join cursos c on c.id = t.curso_id
      where t.id = (split_part(name, '/', 1))::uuid
        and (
          es_super_admin()
          or (c.visibilidad = 'privado' and es_admin_de_organizacion(c.organizacion_id))
        )
    )
  );

create policy "Admins del curso borran archivos de materiales"
  on storage.objects for delete
  using (
    bucket_id = 'materiales'
    and exists (
      select 1 from temas t join cursos c on c.id = t.curso_id
      where t.id = (split_part(name, '/', 1))::uuid
        and (
          es_super_admin()
          or (c.visibilidad = 'privado' and es_admin_de_organizacion(c.organizacion_id))
        )
    )
  );
