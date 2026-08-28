-- La trivia "Frases y Modismos Chilenos (Duelos)" tenía 14 preguntas por
-- tema (8 del curso original + 6 agregadas después, copiadas al crear la
-- trivia). Se agregan 6 nuevas por tema para llegar a 20. Usa el conteo
-- actual de cada tema (no un número fijo) para no pasarse de 20 si alguno
-- ya tenía más, y para no fallar si el conteo real es distinto al esperado.
--
-- Nota: los 6 nuevos de "Dichos y comparaciones chilenas" se hicieron en
-- formato "¿qué significa...?" en vez de "completa la frase" — son dichos
-- chilenos reales y bien conocidos, pero no quise inventar variantes nuevas
-- del estilo "Más ___ que ___" sin estar seguro de la versión exacta que
-- circula. Si alguno no suena natural, se edita fácil desde Administrar.

with curso_trivia as (
  select id from cursos where nombre = 'Frases y Modismos Chilenos (Duelos)' limit 1
),
temas_curso as (
  select t.id, t.nombre
  from temas t, curso_trivia c
  where t.curso_id = c.id
),
conteo_actual as (
  select tc.id as tema_id, count(p.id) as actuales
  from temas_curso tc
  left join preguntas p on p.tema_id = tc.id
  group by tc.id
),
candidatas as (
  select
    tc.id as tema_id,
    q.enunciado, q.alternativas, q.correcta, q.dificultad,
    row_number() over (partition by tc.id order by q.orden) as rn
  from temas_curso tc
  join (values
    ('Dichos y comparaciones chilenas', 1, '¿Qué significa quedar "como el gato"?',
     '["Quedar en una situación vergonzosa o mal parado", "Quedar feliz y satisfecho", "Ganar mucho dinero sin esfuerzo", "Quedarse dormido de inmediato"]'::jsonb, 0, 'media'),
    ('Dichos y comparaciones chilenas', 2, '¿Qué significa "hacer una vaca"?',
     '["Juntar dinero entre varias personas para algo en común", "Faltar a una reunión sin avisar", "Comprar un animal de granja", "Organizar una fiesta sorpresa"]'::jsonb, 0, 'facil'),
    ('Dichos y comparaciones chilenas', 3, '¿Qué significa "no estar ni ahí" con algo?',
     '["No importarle nada a alguien", "Estar muy interesado en algo", "Estar perdido geográficamente", "Estar completamente de acuerdo"]'::jsonb, 0, 'facil'),
    ('Dichos y comparaciones chilenas', 4, '¿Qué significa "hacer perro muerto"?',
     '["Irse de un lugar sin pagar el consumo", "Fingir estar enfermo para faltar", "Dormir todo el día", "Hacerle una broma pesada a alguien"]'::jsonb, 0, 'media'),
    ('Dichos y comparaciones chilenas', 5, '¿Qué significa "pasarlo chancho"?',
     '["Pasarlo muy bien y disfrutar mucho", "Pasarlo muy mal", "Comer en exceso en una comida", "Llegar tarde a todos lados"]'::jsonb, 0, 'facil'),
    ('Dichos y comparaciones chilenas', 6, '¿Qué significa que en algún lugar "quedó la crema"?',
     '["Que quedó todo en caos o desorden", "Que salió todo perfecto", "Que se acabó la comida", "Que ganó el mejor equipo"]'::jsonb, 0, 'media'),

    ('Modismos del día a día', 1, '¿Qué es un "pololo" o una "polola"?',
     '["El novio o la novia de alguien", "Un tipo de pan chileno", "Un amigo cercano", "Un vecino nuevo"]'::jsonb, 0, 'facil'),
    ('Modismos del día a día', 2, '¿Qué es una "guagua"?',
     '["Un bebé", "Un tipo de bus", "Una mascota pequeña", "Una fiesta familiar"]'::jsonb, 0, 'facil'),
    ('Modismos del día a día', 3, '¿Qué significa que hay "taco" en la calle?',
     '["Congestión de tránsito", "Un accidente grave", "Una feria libre", "Un corte de luz"]'::jsonb, 0, 'facil'),
    ('Modismos del día a día', 4, '¿A quién se le dice coloquialmente "paco"?',
     '["A un carabinero (policía)", "A un profesor", "A un vecino molesto", "A un jefe exigente"]'::jsonb, 0, 'facil'),
    ('Modismos del día a día', 5, '¿Qué significa "la pega"?',
     '["El trabajo", "Una fiesta", "Una comida típica", "Un problema grave"]'::jsonb, 0, 'facil'),
    ('Modismos del día a día', 6, '¿Qué significa que te digan "ponte pilas"?',
     '["Que estés atento o alerta", "Que compres baterías", "Que te vayas a dormir", "Que hagas silencio"]'::jsonb, 0, 'media'),

    ('Frases virales de redes sociales', 1, '¿Qué es un "cachureo"?',
     '["Un objeto viejo o de poco valor guardado en casa", "Un baile de moda", "Un tipo de comida callejera", "Un juego de mesa"]'::jsonb, 0, 'media'),
    ('Frases virales de redes sociales', 2, '¿Qué significa "andar leseando"?',
     '["Estar bromeando o jugando, sin tomar algo en serio", "Estar muy concentrado trabajando", "Estar enojado con alguien", "Estar durmiendo"]'::jsonb, 0, 'facil'),
    ('Frases virales de redes sociales', 3, '¿Qué significa "sacar la voz"?',
     '["Protestar o hablar en defensa de algo o alguien", "Quedarse afónico", "Cantar en un karaoke", "Hacer un anuncio oficial"]'::jsonb, 0, 'media'),
    ('Frases virales de redes sociales', 4, '¿Qué significa estar "curado/a"?',
     '["Estar ebrio o borracho", "Estar recuperado de una enfermedad", "Estar muy sano", "Estar aburrido"]'::jsonb, 0, 'facil'),
    ('Frases virales de redes sociales', 5, '¿Qué es un "combo"?',
     '["Un golpe dado con el puño", "Una promoción de comida", "Un grupo cercano de amigos", "Un tipo de baile"]'::jsonb, 0, 'facil'),
    ('Frases virales de redes sociales', 6, '¿Qué significa "andar con mala pata"?',
     '["Tener mala suerte", "Caminar cojeando", "Estar de mal humor", "Llegar tarde siempre"]'::jsonb, 0, 'facil')
  ) as q(tema_nombre, orden, enunciado, alternativas, correcta, dificultad)
  on tc.nombre = q.tema_nombre
)
insert into preguntas (tema_id, enunciado, alternativas, correcta, dificultad, creada_por, activa)
select
  c.tema_id, c.enunciado, c.alternativas, c.correcta, c.dificultad::dificultad_pregunta,
  '04952ed1-21d3-46cc-a262-92e12644e0b3', true
from candidatas c
join conteo_actual ca on ca.tema_id = c.tema_id
where c.rn <= (20 - ca.actuales);
