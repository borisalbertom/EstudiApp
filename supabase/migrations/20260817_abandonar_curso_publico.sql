-- Permite a un usuario borrar su propia inscripcion solo en cursos publicos
-- (los privados/asignados por un admin no se pueden abandonar por cuenta propia).
create policy "Abandonar cursos publicos"
  on inscripciones_curso for delete
  using (
    auth.uid() = usuario_id
    and exists (select 1 from cursos c where c.id = curso_id and c.visibilidad = 'publico')
  );
