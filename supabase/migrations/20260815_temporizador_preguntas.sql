-- Tiempo límite por pregunta, configurable por curso (0 = sin límite).
alter table cursos add column if not exists tiempo_por_pregunta integer not null default 0;
