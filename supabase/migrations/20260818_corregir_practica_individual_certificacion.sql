-- Corrige cursos cuya combinación de flags quedó en un estado que ya no es
-- alcanzable desde el panel Admin actual: un curso "Certificación"
-- (permite_individual = true) nunca debería tener permite_practica_individual
-- = true, porque el selector "Tipo de curso" en AdminCurso.jsx / AdminCursos.jsx
-- siempre fija permite_practica_individual = false para ese tipo (Certificación
-- = solo material + duelos como gamificación + examen final, sin practicar solo).
--
-- Algunos cursos quedaron con permite_practica_individual = true de todas
-- formas: los creados antes de que existiera esta columna (default true al
-- agregarla) y que nunca se volvieron a guardar desde el selector de tipo.
-- Ejemplo real: "Frases y Modismos Chilenos" — iba a convertirse en Trivia,
-- pero esa migración buscaba el nombre viejo "...(Duelos)" y ya se había
-- renombrado, así que nunca se aplicó.

update cursos
set permite_practica_individual = false
where permite_individual = true
  and permite_practica_individual = true;
