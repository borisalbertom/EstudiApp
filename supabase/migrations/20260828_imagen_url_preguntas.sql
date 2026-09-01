-- Imagen opcional por pregunta (diagramas, tablas, gráficos — ej. PAES
-- Competencia Matemática M1). Reutiliza el mismo patrón de Storage que
-- materiales de estudio, pero en su propio bucket y con permisos que
-- también cubren a un creador autogestionado (no solo admins), igual que
-- ya permite la policy de preguntas.

alter table preguntas add column if not exists imagen_url text;

insert into storage.buckets (id, name, public)
values ('preguntas-imagenes', 'preguntas-imagenes', true)
on conflict (id) do nothing;

create policy "Ver imagenes de preguntas"
  on storage.objects for select
  using (bucket_id = 'preguntas-imagenes');

create policy "Creadores suben imagenes de preguntas"
  on storage.objects for insert
  with check (
    bucket_id = 'preguntas-imagenes'
    and exists (
      select 1 from temas t join cursos c on c.id = t.curso_id
      where t.id = (split_part(name, '/', 1))::uuid
        and (
          es_super_admin()
          or (c.visibilidad = 'privado' and es_admin_de_organizacion(c.organizacion_id))
          or (c.creado_por = auth.uid() and c.organizacion_id is null and c.permite_individual = false)
        )
    )
  );

create policy "Creadores borran imagenes de preguntas"
  on storage.objects for delete
  using (
    bucket_id = 'preguntas-imagenes'
    and exists (
      select 1 from temas t join cursos c on c.id = t.curso_id
      where t.id = (split_part(name, '/', 1))::uuid
        and (
          es_super_admin()
          or (c.visibilidad = 'privado' and es_admin_de_organizacion(c.organizacion_id))
          or (c.creado_por = auth.uid() and c.organizacion_id is null and c.permite_individual = false)
        )
    )
  );
