-- Temporal: eleva a la cuenta de prueba "Test QA Amigo" a admin de
-- plataforma solo para poder subir las imágenes del banco de preguntas
-- oficial de PAES M1 vía Storage (que exige permisos de admin/creador).
-- Se revierte en la migración de limpieza inmediatamente después de la
-- carga (20260828_revertir_temp_admin.sql).

update perfiles
set es_admin_plataforma = true
where id = 'b65ac3ab-793a-4315-94cb-38811f1647f1';
