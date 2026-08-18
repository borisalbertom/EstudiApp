-- Curso de ejemplo tipo "Certificación" sobre la propia plataforma, para
-- probar cómo un estudiante ve contenido + examen. Se inscribe directo al
-- usuario indicado (mismo id usado en el curso "Frases y Modismos Chilenos").

with nuevo_curso as (
  insert into cursos (
    nombre, descripcion, visibilidad, creado_por,
    permite_duelos, permite_individual, mostrar_ranking,
    cantidad_preguntas, porcentaje_certificacion, tiempo_por_pregunta
  )
  values (
    'Cómo funciona EstudiApp',
    'Un curso de ejemplo sobre esta misma plataforma: modos de juego, cursos, progreso y logros.',
    'publico',
    '04952ed1-21d3-46cc-a262-92e12644e0b3',
    false, true, true,
    8, 70, 45
  )
  returning id
),
temas_nuevos as (
  insert into temas (curso_id, nombre, orden)
  select nuevo_curso.id, t.nombre, t.orden
  from nuevo_curso, (values
    ('Modos de juego', 1),
    ('Cursos y progreso', 2)
  ) as t(nombre, orden)
  returning id, nombre
),
preguntas_nuevas as (
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
    ('Modos de juego', '¿Qué es un "duelo" en EstudiApp?',
     '["Un reto asíncrono contra un amigo con las mismas preguntas", "Una clase en vivo", "Un examen sin nota", "Un chat grupal"]'::jsonb, 0, 'facil'),
    ('Modos de juego', '¿Qué modo te deja practicar solo, sin rival, dentro de un contenido específico?',
     '["Duelo", "Práctica individual", "Ranking", "Logros"]'::jsonb, 1, 'facil'),
    ('Modos de juego', '¿Qué hace el botón "Simular examen"?',
     '["Genera una prueba con preguntas de todos los contenidos del curso", "Borra tus respuestas anteriores", "Crea un nuevo curso", "Invita a un amigo"]'::jsonb, 0, 'media'),
    ('Modos de juego', 'Si abandonas un duelo antes de terminarlo, ¿qué pasa?',
     '["Queda pausado para siempre", "Tu rival gana automáticamente", "Se reinicia desde cero", "No pasa nada"]'::jsonb, 1, 'media'),
    ('Modos de juego', '¿Qué es la "racha" que aparece en Inicio?',
     '["Los días seguidos que has estado activo en la app", "El puntaje de tu último duelo", "La cantidad de amigos que tienes", "El tiempo que llevas en un examen"]'::jsonb, 0, 'facil'),
    ('Modos de juego', '¿Dónde ves un contador de "aciertos en vivo" mientras juegas?',
     '["Solo en duelos", "En duelos, práctica individual y examen", "Solo en el examen", "En ningún lado"]'::jsonb, 1, 'dificil'),

    ('Cursos y progreso', '¿Cuál es la diferencia entre un curso tipo "Retos" y uno "Certificación"?',
     '["Retos permite duelos entre amigos; Certificación permite rendir examen individual con nota", "Son exactamente lo mismo", "Retos es de pago y Certificación es gratis", "Certificación no tiene preguntas"]'::jsonb, 0, 'media'),
    ('Cursos y progreso', 'Si un curso tiene material de estudio cargado, ¿qué debes hacer antes de poder rendir el examen?',
     '["Nada, el examen siempre está disponible", "Revisar todo el material de estudio del curso", "Pagar una suscripción", "Ganar un duelo primero"]'::jsonb, 1, 'media'),
    ('Cursos y progreso', '¿Dónde te inscribes a nuevos cursos gratis?',
     '["En la pestaña Amigos", "En la pestaña Cursos", "En tu Perfil", "No se puede, solo el admin inscribe"]'::jsonb, 1, 'facil'),
    ('Cursos y progreso', '¿Qué significa que un admin te "asigne" un curso?',
     '["Que te obliga a jugar todos los días", "Que te dio acceso a un curso privado de tu organización", "Que ganaste un logro", "Que eres ahora administrador"]'::jsonb, 1, 'media'),
    ('Cursos y progreso', '¿Qué muestra el "ranking" de un curso?',
     '["El clima del día", "El desempeño de los jugadores en los duelos de ese curso", "La lista de administradores", "El material de estudio subido"]'::jsonb, 1, 'facil'),
    ('Cursos y progreso', '¿Qué pasa si un curso pasa su "fecha límite"?',
     '["Se borra permanentemente de la base de datos", "Deja de estar disponible para actividades nuevas, aunque se puede pedir más plazo", "Nada, sigue igual", "Se vuelve automáticamente privado"]'::jsonb, 1, 'dificil')
  ) as q(tema_nombre, enunciado, alternativas, correcta, dificultad)
  on temas_nuevos.nombre = q.tema_nombre
  returning id
)
insert into inscripciones_curso (curso_id, usuario_id, estado, visto)
select nuevo_curso.id, '04952ed1-21d3-46cc-a262-92e12644e0b3', 'inscrito', true
from nuevo_curso;
