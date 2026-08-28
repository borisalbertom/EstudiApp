-- Permite fijar un tiempo por pregunta propio de un duelo puntual (usado al
-- retar a un amigo en una Trivia, donde se elige el ritmo justo antes de
-- desafiar, sin tocar la configuración guardada del curso/contenido). Si
-- queda vacío, se sigue usando el valor del contenido o del curso como antes.
alter table duelos add column if not exists tiempo_por_pregunta integer;
