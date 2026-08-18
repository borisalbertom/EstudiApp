-- Distingue, dentro de los cursos sin certificacion (permite_individual = false),
-- entre "Pruebas" (duelos + practica individual libre, para estudiar en serio
-- de cara a un examen externo) y "Trivias" (solo duelos entre amigos, sin
-- practica individual, pensado para jugar por diversion).
alter table cursos add column permite_practica_individual boolean not null default true;

-- El curso de ejemplo "Frases y Modismos Chilenos (Duelos)" pasa a ser una
-- Trivia: es contenido para pasarla bien, no para estudiar en serio.
update cursos set permite_practica_individual = false
where nombre = 'Frases y Modismos Chilenos (Duelos)';
