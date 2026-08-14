-- Hace configurable por curso cuántas preguntas se hacen por intento
-- (duelo o práctica individual). El % para aprobar ya existía
-- (porcentaje_certificacion) pero no tenía valor por defecto ni se
-- podía editar desde el admin; se le agrega un default razonable.

alter table cursos add column if not exists cantidad_preguntas integer not null default 5;
alter table cursos alter column porcentaje_certificacion set default 70;
