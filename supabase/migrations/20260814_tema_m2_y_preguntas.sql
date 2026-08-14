-- Crea el módulo "Competencia Matemática M2" (optativo, contenido más
-- avanzado que M1: funciones cuadráticas/logarítmicas, progresiones,
-- probabilidad y estadística) con 5 preguntas de ejemplo, y reordena
-- los temas de PAES 2027 para que M1 y M2 queden agrupados.

with nuevo_tema as (
  insert into temas (curso_id, nombre, orden)
  values ('e35fb486-7339-4544-990e-6eda17d9e6b6', 'Competencia Matemática M2', 3)
  returning id
)
insert into preguntas (tema_id, enunciado, alternativas, correcta, dificultad, creada_por, activa)
select
  nuevo_tema.id,
  q.enunciado,
  q.alternativas,
  q.correcta,
  q.dificultad::dificultad_pregunta,
  '04952ed1-21d3-46cc-a262-92e12644e0b3',
  true
from nuevo_tema, (values
  ('¿Cuál es el vértice de la parábola y = x² - 4x + 3?',
   '["(2, -1)", "(-2, -1)", "(2, 1)", "(0, 3)"]'::jsonb, 0, 'facil'),
  ('Si log₂(x) = 5, ¿cuál es el valor de x?',
   '["10", "16", "32", "25"]'::jsonb, 2, 'facil'),
  ('En una progresión aritmética donde a₁ = 3 y d = 4, ¿cuál es el décimo término (a₁₀)?',
   '["36", "39", "40", "43"]'::jsonb, 1, 'media'),
  ('Se lanza un dado dos veces. ¿Cuál es la probabilidad de obtener suma igual a 7?',
   '["1/6", "1/12", "1/36", "1/9"]'::jsonb, 0, 'media'),
  ('La media de 5 números es 12. Al agregar un sexto número la nueva media pasa a ser 14. ¿Cuál es el valor del número agregado?',
   '["14", "20", "24", "28"]'::jsonb, 2, 'dificil')
) as q(enunciado, alternativas, correcta, dificultad);

-- Reordenar: Competencia Lectora, M1, M2, Historia, Ciencias
update temas set orden = 1 where id = 'ddf21225-ce01-4765-9b60-af9a58f50154'; -- Competencia Lectora
update temas set orden = 2 where id = '38739805-0d32-4226-abaf-8caf023e9c24'; -- Competencia Matemática M1
update temas set orden = 4 where id = '31b7d13a-d87d-47eb-9a39-87be2f6eadf0'; -- Historia y Cs. Sociales
update temas set orden = 5 where id = 'd4bea252-524e-4886-9f63-9a1b075d28f5'; -- Ciencias
