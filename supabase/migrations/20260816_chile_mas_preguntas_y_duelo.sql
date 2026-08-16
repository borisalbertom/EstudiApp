-- 1) Suma 18 preguntas nuevas (6 por tema) al curso "Frases y Modismos
--    Chilenos" para engrosar el banco de examen.
-- 2) Duplica ese curso en modo "Retos" (duelos entre amigos), con sus
--    3 temas y todas las preguntas (originales + nuevas) copiadas.

insert into preguntas (tema_id, enunciado, alternativas, correcta, dificultad, creada_por, activa)
select t.id, q.enunciado, q.alternativas, q.correcta, q.dificultad::dificultad_pregunta,
  '04952ed1-21d3-46cc-a262-92e12644e0b3', true
from temas t
join (values
  ('Dichos y comparaciones chilenas', 'Completa la frase: "Más perdido que huevo de Pascua en ___"',
   '["Navidad", "Semana Santa", "Verano", "Invierno"]'::jsonb, 1, 'media'),
  ('Dichos y comparaciones chilenas', 'Completa la frase: "Más fresco que ___" (fresco = sinvergüenza)',
   '["tomate", "pepino", "lechuga", "zanahoria"]'::jsonb, 2, 'facil'),
  ('Dichos y comparaciones chilenas', 'Completa la frase: "Más caliente que sopaipilla recién ___"',
   '["comida", "fría", "sacada", "dorada"]'::jsonb, 2, 'media'),
  ('Dichos y comparaciones chilenas', 'Completa la frase: "Más pillo que gato de ___"',
   '["casa", "barco", "campo", "ciudad"]'::jsonb, 1, 'dificil'),
  ('Dichos y comparaciones chilenas', 'Completa la frase: "Más lento que carreta en ___"',
   '["bajada", "curva", "subida", "recta"]'::jsonb, 2, 'media'),
  ('Dichos y comparaciones chilenas', 'Completa la frase: "Más caro que remedio de ___"',
   '["hospital", "clínica", "farmacia", "botica"]'::jsonb, 2, 'facil'),

  ('Modismos del día a día', '¿Qué significa "cachar" algo?',
   '["Pelear", "Entender o darse cuenta", "Correr", "Dormir"]'::jsonb, 1, 'facil'),
  ('Modismos del día a día', '¿Qué significa estar "picado/a"?',
   '["Estar feliz", "Estar molesto u ofendido", "Estar cansado", "Estar con hambre"]'::jsonb, 1, 'media'),
  ('Modismos del día a día', '¿Qué significa "tirar la talla"?',
   '["Decir la verdad", "Hacer una broma o chiste", "Contar un secreto", "Pedir perdón"]'::jsonb, 1, 'media'),
  ('Modismos del día a día', '¿Qué significa "andar volado/a"?',
   '["Estar apurado", "Estar distraído, pensando en otra cosa", "Estar feliz", "Estar enojado"]'::jsonb, 1, 'facil'),
  ('Modismos del día a día', '¿Qué significa "hacerse el/la gil"?',
   '["Ser muy inteligente", "Ayudar a alguien", "Fingir que no entiende algo", "Reírse fuerte"]'::jsonb, 2, 'media'),
  ('Modismos del día a día', '¿Qué significa "andar salado/a"?',
   '["Tener mucha suerte", "Estar con hambre", "Tener mala suerte", "Estar cansado"]'::jsonb, 2, 'dificil'),

  ('Frases virales de redes sociales', '¿Qué significa "sipo"?',
   '["No", "Tal vez", "Sí", "Nunca"]'::jsonb, 2, 'facil'),
  ('Frases virales de redes sociales', '¿Qué significa que algo sea "la raja"?',
   '["Que es terrible", "Que es aburrido", "Que es excelente", "Que es caro"]'::jsonb, 2, 'facil'),
  ('Frases virales de redes sociales', '¿Qué significa "andar figureando"?',
   '["Estar triste", "Presumir o llamar la atención", "Estudiar mucho", "Trabajar duro"]'::jsonb, 1, 'dificil'),
  ('Frases virales de redes sociales', '¿Qué significa que "quedó el condoro"?',
   '["Que todo salió bien", "Que ocurrió un error grande", "Que llegó tarde", "Que ganó un premio"]'::jsonb, 1, 'dificil'),
  ('Frases virales de redes sociales', '¿Qué significa "quedar la escoba"?',
   '["Que quedó ordenado", "Que quedó muy mal o descontrolada", "Que quedó limpio", "Que quedó fácil"]'::jsonb, 1, 'media'),
  ('Frases virales de redes sociales', '¿Qué significa "andar con la caña"?',
   '["Estar feliz", "Tener resaca por el alcohol del día anterior", "Estar con hambre", "Estar cansado por trabajar"]'::jsonb, 1, 'facil')
) as q(tema_nombre, enunciado, alternativas, correcta, dificultad)
  on q.tema_nombre = t.nombre
where t.curso_id = '2706e658-69fe-4204-ae5f-8c287faa1811';

with duelo_curso as (
  insert into cursos (
    nombre, descripcion, visibilidad, creado_por,
    permite_duelos, permite_individual, mostrar_ranking,
    cantidad_preguntas, tiempo_por_pregunta
  )
  values (
    'Frases y Modismos Chilenos (Duelos)',
    'Retá a un amigo a demostrar quién sabe más de dichos, modismos y frases virales chilenas.',
    'publico',
    '04952ed1-21d3-46cc-a262-92e12644e0b3',
    true, false, true,
    10, 60
  )
  returning id
),
duelo_temas as (
  insert into temas (curso_id, nombre, orden)
  select duelo_curso.id, t.nombre, t.orden
  from duelo_curso, (values
    ('Dichos y comparaciones chilenas', 1),
    ('Modismos del día a día', 2),
    ('Frases virales de redes sociales', 3)
  ) as t(nombre, orden)
  returning id, nombre
)
insert into preguntas (tema_id, enunciado, alternativas, correcta, dificultad, creada_por, activa)
select dt.id, p.enunciado, p.alternativas, p.correcta, p.dificultad, p.creada_por, p.activa
from preguntas p
join temas origen on origen.id = p.tema_id
join duelo_temas dt on dt.nombre = origen.nombre
where origen.curso_id = '2706e658-69fe-4204-ae5f-8c287faa1811';
