-- Pruebas y Trivias pasan a poder crearlas cualquier usuario registrado,
-- no solo admins — Cursos (Certificación) sigue siendo exclusivo de admins.
-- Se modelan igual que un curso público sin organización, creado por el
-- propio usuario. Las políticas de "with check" impiden que alguien use
-- este camino para crear/convertir algo en Certificación o asignárselo a
-- una organización a la que no pertenece.

create policy "Usuarios gestionan sus pruebas y trivias"
  on cursos for all
  using (creado_por = auth.uid() and organizacion_id is null and permite_individual = false)
  with check (creado_por = auth.uid() and organizacion_id is null and permite_individual = false);

create policy "Usuarios gestionan temas de sus pruebas y trivias"
  on temas for all
  using (exists (
    select 1 from cursos c
    where c.id = temas.curso_id
    and c.creado_por = auth.uid()
    and c.organizacion_id is null
    and c.permite_individual = false
  ))
  with check (exists (
    select 1 from cursos c
    where c.id = temas.curso_id
    and c.creado_por = auth.uid()
    and c.organizacion_id is null
    and c.permite_individual = false
  ));

create policy "Usuarios gestionan preguntas de sus pruebas y trivias"
  on preguntas for all
  using (exists (
    select 1 from temas t
    join cursos c on c.id = t.curso_id
    where t.id = preguntas.tema_id
    and c.creado_por = auth.uid()
    and c.organizacion_id is null
    and c.permite_individual = false
  ))
  with check (exists (
    select 1 from temas t
    join cursos c on c.id = t.curso_id
    where t.id = preguntas.tema_id
    and c.creado_por = auth.uid()
    and c.organizacion_id is null
    and c.permite_individual = false
  ));
