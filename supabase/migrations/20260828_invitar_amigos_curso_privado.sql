-- Hasta ahora "privado" solo existía para cursos de una organización
-- (acceso masivo por dominio, asignado por un admin). Esto agrega un segundo
-- tipo de privado: una Prueba o Trivia autogestionada (sin organización)
-- donde el propio creador invita amigos puntuales, uno por uno.

-- Sin esto, un curso privado sin organización solo era visible para su
-- creador (vía "Usuarios gestionan sus pruebas y trivias"). Un amigo
-- invitado necesita poder leer el curso una vez tiene una inscripción.
create policy "Ver cursos donde estoy inscrito"
  on cursos for select
  using (
    exists (
      select 1 from inscripciones_curso i
      where i.curso_id = cursos.id and i.usuario_id = auth.uid()
    )
  );

-- Análogo a "Admins asignan inscripciones de su organizacion", pero para
-- el creador de una Prueba/Trivia personal (organizacion_id nulo) invitando
-- amigos en vez de un admin asignando a miembros de la empresa.
create policy "Creadores invitan amigos a sus pruebas y trivias"
  on inscripciones_curso for all
  using (
    exists (
      select 1 from cursos c
      where c.id = inscripciones_curso.curso_id
      and c.creado_por = auth.uid()
      and c.organizacion_id is null
    )
  )
  with check (
    exists (
      select 1 from cursos c
      where c.id = inscripciones_curso.curso_id
      and c.creado_por = auth.uid()
      and c.organizacion_id is null
    )
  );
