-- Un intento de "modo examen" abarca varios temas del curso, así que
-- tema_id deja de ser obligatorio (null = examen de todo el curso).
alter table intentos_individuales alter column tema_id drop not null;
