-- Permite que un curso configure si los duelos se restringen a un tema
-- específico (comportamiento actual) o mezclan preguntas de todos sus
-- temas (útil en cursos donde los temas son solo categorías de
-- contenido, no habilidades separadas — ej. "Frases y Modismos
-- Chilenos"). tema_id pasa a ser opcional: null = duelo de todo el curso.

alter table duelos alter column tema_id drop not null;

alter table cursos add column duelo_todo_curso boolean not null default false;

update cursos set duelo_todo_curso = true
where nombre = 'Frases y Modismos Chilenos (Duelos)';
