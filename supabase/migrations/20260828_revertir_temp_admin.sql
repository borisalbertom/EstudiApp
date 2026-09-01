-- Revierte el privilegio temporal otorgado en
-- 20260828_temp_admin_carga_paes_m1.sql — correr recién después de que
-- terminen de subirse las imágenes de PAES M1.

update perfiles
set es_admin_plataforma = false
where id = 'b65ac3ab-793a-4315-94cb-38811f1647f1';
