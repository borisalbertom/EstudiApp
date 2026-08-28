-- Para Pruebas (sin límite de tiempo forzado por pregunta) igual importa saber
-- el ritmo real de estudio, porque el examen que están preparando sí tiene
-- tiempo. Guarda el promedio de milisegundos por pregunta de cada intento de
-- práctica individual, para mostrarlo en el resultado.
alter table intentos_individuales add column if not exists tiempo_promedio_ms integer;
