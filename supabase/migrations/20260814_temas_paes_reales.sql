-- Reorganiza los temas de "PAES 2027" para que calcen con los módulos
-- reales de la PAES. Geometría es, en la prueba real, parte del mismo
-- módulo que Álgebra (Competencia Matemática M1: números, álgebra y
-- funciones, geometría, probabilidad y estadística), así que se fusiona
-- ahí en vez de quedar como tema aparte.
--
-- IDs tomados directo de la base (curso PAES 2027):
--   Álgebra              38739805-0d32-4226-abaf-8caf023e9c24  -> pasa a ser M1
--   Comprensión Lectora  ddf21225-ce01-4765-9b60-af9a58f50154  -> Competencia Lectora
--   Geometría             014c5993-9c37-401e-8dbe-312b3cf74664  -> se fusiona en M1 y se elimina
--   Ciencias              d4bea252-524e-4886-9f63-9a1b075d28f5  -> sin cambios
--   Historia y Cs. Sociales 31b7d13a-d87d-47eb-9a39-87be2f6eadf0 -> sin cambios

-- 1. Mover las preguntas de Geometría a Álgebra (que pasará a llamarse M1)
update preguntas
set tema_id = '38739805-0d32-4226-abaf-8caf023e9c24'
where tema_id = '014c5993-9c37-401e-8dbe-312b3cf74664';

-- 2. Por si ya existiera algún duelo apuntando a Geometría, repuntarlo también
update duelos
set tema_id = '38739805-0d32-4226-abaf-8caf023e9c24'
where tema_id = '014c5993-9c37-401e-8dbe-312b3cf74664';

-- 3. Eliminar el tema Geometría (ya sin preguntas)
delete from temas where id = '014c5993-9c37-401e-8dbe-312b3cf74664';

-- 4. Renombrar los temas para que calcen con los nombres reales de la PAES
update temas set nombre = 'Competencia Matemática M1' where id = '38739805-0d32-4226-abaf-8caf023e9c24';
update temas set nombre = 'Competencia Lectora' where id = 'ddf21225-ce01-4765-9b60-af9a58f50154';
-- "Ciencias" e "Historia y Cs. Sociales" ya calzan con los módulos reales, no se tocan.
