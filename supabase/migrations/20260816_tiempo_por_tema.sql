-- Permite sobreescribir el tiempo por pregunta a nivel de tema (útil
-- cuando cada módulo tiene una duración/cantidad de preguntas real
-- distinta, como en la PAES). null = usa el valor del curso.

alter table temas add column tiempo_por_pregunta integer;

-- Valores reales DEMRE 2026: duración total del módulo / cantidad de
-- preguntas, redondeado a segundos.
update temas set tiempo_por_pregunta = 138 -- 150 min / 65 preguntas
where curso_id = 'e35fb486-7339-4544-990e-6eda17d9e6b6' and nombre = 'Competencia Lectora';

update temas set tiempo_por_pregunta = 129 -- 140 min / 65 preguntas
where curso_id = 'e35fb486-7339-4544-990e-6eda17d9e6b6' and nombre = 'Competencia Matemática M1';

update temas set tiempo_por_pregunta = 153 -- 140 min / 55 preguntas
where curso_id = 'e35fb486-7339-4544-990e-6eda17d9e6b6' and nombre = 'Competencia Matemática M2';

update temas set tiempo_por_pregunta = 111 -- 120 min / 65 preguntas
where curso_id = 'e35fb486-7339-4544-990e-6eda17d9e6b6' and nombre = 'Historia y Cs. Sociales';

update temas set tiempo_por_pregunta = 120 -- 160 min / 80 preguntas
where curso_id = 'e35fb486-7339-4544-990e-6eda17d9e6b6' and nombre = 'Ciencias';

-- Promedio ponderado de los 5 módulos, como valor por defecto del
-- curso (usado si algún tema no tiene su propio override).
update cursos set tiempo_por_pregunta = 129
where id = 'e35fb486-7339-4544-990e-6eda17d9e6b6';
