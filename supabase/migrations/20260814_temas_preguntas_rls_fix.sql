-- temas y preguntas no tenían política de SELECT, así que aunque los
-- datos existen (PAES 2027, 5 temas, 25 preguntas) nadie los podía leer.
-- Se hacen visibles exactamente cuando el curso al que pertenecen ya es
-- visible para el usuario (reusa las políticas de "cursos" vía subquery).

create policy "Ver temas de cursos visibles"
  on temas for select
  using (
    exists (select 1 from cursos c where c.id = temas.curso_id)
  );

create policy "Ver preguntas de cursos visibles"
  on preguntas for select
  using (
    exists (
      select 1 from temas t
      join cursos c on c.id = t.curso_id
      where t.id = preguntas.tema_id
    )
  );
