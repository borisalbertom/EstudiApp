-- Actualiza preguntas desactualizadas (terminología vieja: "Simular examen",
-- "Retos"/"Certificación") y agrega preguntas nuevas sobre las funciones
-- construidas después de la primera versión del curso "Cómo funciona EstudiApp"
-- (Cursos/Pruebas/Trivias, exámenes pendientes, abandonar, mezcla de
-- alternativas, logros nuevos, menú hamburguesa en celular).

-- 1) Corregir preguntas con terminología obsoleta ------------------------

update preguntas
set enunciado = '¿Qué hace el "Examen final" al final del temario de un curso?'
where enunciado = '¿Qué hace el botón "Simular examen"?';

update preguntas
set
  enunciado = '¿Cuál es la diferencia entre un curso, una prueba y una trivia?',
  alternativas = '["Curso: certificación con examen y material; Prueba: duelos + práctica libre; Trivia: solo duelos por diversión", "Son exactamente lo mismo, solo cambia el nombre", "Trivia es de pago y Curso es gratis", "Prueba no tiene preguntas, solo texto"]'::jsonb,
  correcta = 0
where enunciado = '¿Cuál es la diferencia entre un curso tipo "Retos" y uno "Certificación"?';

-- 2) Agregar preguntas nuevas ---------------------------------------------

with curso_estudiapp as (
  select id from cursos where nombre = 'Cómo funciona EstudiApp' limit 1
),
temas_curso as (
  select t.id, t.nombre
  from temas t, curso_estudiapp c
  where t.curso_id = c.id
)
insert into preguntas (tema_id, enunciado, alternativas, correcta, dificultad, creada_por, activa)
select
  temas_curso.id,
  q.enunciado,
  q.alternativas,
  q.correcta,
  q.dificultad::dificultad_pregunta,
  '04952ed1-21d3-46cc-a262-92e12644e0b3',
  true
from temas_curso
join (values
  ('Modos de juego', '¿Para qué sirve que las alternativas se muestren en orden distinto cada vez que respondes una pregunta?',
   '["Para evitar que memorices la posición de la respuesta en vez del contenido", "Para que el examen dure más", "Es un error de la app", "Para que todos vean el mismo orden"]'::jsonb, 0, 'media'),
  ('Modos de juego', 'Si tienes un curso de certificación con material de estudio, ¿en qué orden debes revisarlo?',
   '["En el orden que definió el creador del curso, uno a la vez", "En cualquier orden, no importa", "Solo el último material", "No es necesario revisarlo"]'::jsonb, 0, 'media'),
  ('Modos de juego', '¿Qué logro reconoce que hayas revisado todo el material de estudio de un curso?',
   '["Aplicado", "Racha de fuego", "Maestro del duelo", "Madrugador"]'::jsonb, 0, 'facil'),
  ('Modos de juego', '¿Qué logro reconoce tu primera práctica individual?',
   '["Calentando motores", "Aplicado", "Invicto", "Sociable"]'::jsonb, 0, 'facil'),

  ('Cursos y progreso', 'En la pestaña "Cursos", ¿qué se muestra primero?',
   '["Los cursos en los que ya estás inscrito", "Solo los cursos disponibles para inscribirte", "Un ranking global", "Los logros obtenidos"]'::jsonb, 0, 'facil'),
  ('Cursos y progreso', '¿Qué te avisa la sección "Mis exámenes pendientes" en Inicio?',
   '["Los cursos de certificación donde aún no rindes el examen final", "Los duelos que tienes pendientes de jugar", "Los amigos que te faltan por aceptar", "Los cursos que están por vencer"]'::jsonb, 0, 'facil'),
  ('Cursos y progreso', '¿Puedes abandonar cualquier curso en el que estés inscrito?',
   '["Solo los cursos públicos; los que te asignó tu organización no se pueden abandonar", "Sí, cualquiera, sin excepción", "No, nunca se puede abandonar un curso", "Solo si eres administrador"]'::jsonb, 0, 'media'),
  ('Cursos y progreso', 'En el celular, la pantalla es angosta y no caben todos los enlaces del menú. ¿Cómo accedes a ellos?',
   '["Tocando el ícono ☰ arriba a la derecha, que despliega el menú completo", "No se puede navegar desde el celular", "Girando el teléfono a horizontal", "Solo aparecen si tienes notificaciones"]'::jsonb, 0, 'facil'),
  ('Cursos y progreso', 'Si estás editando la configuración de un curso como administrador y tienes cambios sin guardar, ¿qué pasa si intentas salir?',
   '["Te pregunta si quieres salir sin guardar los cambios", "Se guarda todo automáticamente sin avisar", "Se pierden los cambios sin ningún aviso", "No te deja salir de la página nunca"]'::jsonb, 0, 'media')
) as q(tema_nombre, enunciado, alternativas, correcta, dificultad)
on temas_curso.nombre = q.tema_nombre;
