-- Curso de ejemplo en modo "Certificación" (no teníamos ninguno):
-- dichos, modismos y frases virales chilenas, con examen de 10
-- preguntas mezcladas entre los 3 temas, 60s por pregunta y 70%
-- para aprobar.

with nuevo_curso as (
  insert into cursos (
    nombre, descripcion, visibilidad, creado_por,
    permite_duelos, permite_individual, mostrar_ranking,
    cantidad_preguntas, porcentaje_certificacion, tiempo_por_pregunta
  )
  values (
    'Frases y Modismos Chilenos',
    'Completa dichos, modismos y frases virales bien chilenas. ¿Cachai o quedaste plateado?',
    'publico',
    '04952ed1-21d3-46cc-a262-92e12644e0b3',
    false, true, true,
    10, 70, 60
  )
  returning id
),
temas_nuevos as (
  insert into temas (curso_id, nombre, orden)
  select nuevo_curso.id, t.nombre, t.orden
  from nuevo_curso, (values
    ('Dichos y comparaciones chilenas', 1),
    ('Modismos del día a día', 2),
    ('Frases virales de redes sociales', 3)
  ) as t(nombre, orden)
  returning id, nombre
)
insert into preguntas (tema_id, enunciado, alternativas, correcta, dificultad, creada_por, activa)
select
  temas_nuevos.id,
  q.enunciado,
  q.alternativas,
  q.correcta,
  q.dificultad::dificultad_pregunta,
  '04952ed1-21d3-46cc-a262-92e12644e0b3',
  true
from temas_nuevos
join (values
  ('Dichos y comparaciones chilenas', 'Completa la frase: "Más solo que el ___"',
   '["uno", "cero", "perro", "gato"]'::jsonb, 0, 'facil'),
  ('Dichos y comparaciones chilenas', 'Completa la frase: "Más falso que moneda de ___"',
   '["cinco", "tres", "diez", "uno"]'::jsonb, 1, 'media'),
  ('Dichos y comparaciones chilenas', 'Completa la frase: "Más perdido que el teniente ___"',
   '["Prat", "Ibáñez", "Bello", "Rojas"]'::jsonb, 2, 'media'),
  ('Dichos y comparaciones chilenas', 'Completa la frase: "Más raro que perro ___"',
   '["azul", "verde", "morado", "rosado"]'::jsonb, 1, 'facil'),
  ('Dichos y comparaciones chilenas', 'Completa la frase: "Más apretado que zapato ___"',
   '["ruso", "nuevo", "chino", "ajeno"]'::jsonb, 2, 'media'),
  ('Dichos y comparaciones chilenas', 'Completa la frase: "Más asustado que gato en ___"',
   '["tabla", "techo", "auto", "jaula"]'::jsonb, 0, 'media'),
  ('Dichos y comparaciones chilenas', 'Completa la frase: "Más colgado que ___"',
   '["cuadro", "cortina", "espejo", "reloj"]'::jsonb, 1, 'dificil'),
  ('Dichos y comparaciones chilenas', 'Completa la frase: "Más viejo que el hilo ___"',
   '["café", "blanco", "negro", "gris"]'::jsonb, 2, 'facil'),

  ('Modismos del día a día', '¿Qué significa "andar pato"?',
   '["Caminar despacio", "No tener plata", "Tener mucha suerte", "Estar apurado"]'::jsonb, 1, 'facil'),
  ('Modismos del día a día', '¿Qué significa "al tiro"?',
   '["Más tarde", "Nunca", "De inmediato", "Tal vez"]'::jsonb, 2, 'facil'),
  ('Modismos del día a día', '¿Qué significa que algo esté "fome"?',
   '["Divertido", "Aburrido", "Rápido", "Caro"]'::jsonb, 1, 'facil'),
  ('Modismos del día a día', '¿Qué significa "bacán"?',
   '["Malo", "Triste", "Genial", "Feo"]'::jsonb, 2, 'facil'),
  ('Modismos del día a día', '¿Qué significa "sacar la vuelta"?',
   '["Dar un paseo", "Evitar el trabajo", "Perderse", "Volver rápido"]'::jsonb, 1, 'media'),
  ('Modismos del día a día', '¿Qué significa "irse al chancho"?',
   '["Ir al campo", "Comer mucho", "Exagerar o pasarse", "Dormir temprano"]'::jsonb, 2, 'media'),
  ('Modismos del día a día', '¿Qué significa estar "chato" de algo?',
   '["Estar feliz", "Estar confundido", "Estar tranquilo", "Estar harto"]'::jsonb, 3, 'media'),
  ('Modismos del día a día', '¿Qué significa "andar con el moño torcido"?',
   '["Estar peinado", "Estar de mal humor", "Estar apurado", "Estar perdido"]'::jsonb, 1, 'dificil'),

  ('Frases virales de redes sociales', '¿Qué significa "carrete"?',
   '["Trabajo", "Fiesta o junta", "Comida", "Viaje"]'::jsonb, 1, 'facil'),
  ('Frases virales de redes sociales', '¿Qué significa que alguien sea "chanta"?',
   '["Persona alegre", "Persona rica", "Persona poco confiable", "Persona tímida"]'::jsonb, 2, 'media'),
  ('Frases virales de redes sociales', '¿Qué significa que algo esté "cuático"?',
   '["Aburrido", "Silencioso", "Exagerado o intenso", "Ordenado"]'::jsonb, 2, 'facil'),
  ('Frases virales de redes sociales', '¿Qué significa hacer algo "al lote"?',
   '["Con mucho cuidado", "Sin cuidado ni orden", "En grupo", "A escondidas"]'::jsonb, 1, 'media'),
  ('Frases virales de redes sociales', '¿Qué significa "la firme"?',
   '["Una mentira", "Un secreto", "La verdad, en serio", "Una broma"]'::jsonb, 2, 'facil'),
  ('Frases virales de redes sociales', 'Completa la frase: "Ya fue, no hay ___ que hacer"',
   '["algo", "nada", "mucho", "poco"]'::jsonb, 1, 'facil'),
  ('Frases virales de redes sociales', '¿Qué significa "andar en la volá"?',
   '["Estar apurado", "Estar distraído, en otra cosa", "Estar feliz", "Estar dormido"]'::jsonb, 1, 'media'),
  ('Frases virales de redes sociales', '¿Qué significa quedar "plateado/a"?',
   '["Quedar rico", "Quedar cansado", "Quedar sorprendido o en shock", "Quedar dormido"]'::jsonb, 2, 'dificil')
) as q(tema_nombre, enunciado, alternativas, correcta, dificultad)
  on q.tema_nombre = temas_nuevos.nombre;
