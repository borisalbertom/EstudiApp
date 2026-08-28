-- Ya existía un trigger "crear_perfil_automatico" en auth.users (creado
-- directo en el SQL Editor en algún momento, nunca quedó en una migración
-- de este repo) que ya crea el perfil al registrarse. El trigger que
-- agregamos en 20260819_perfil_automatico_al_registrarse.sql duplicaba ese
-- trabajo: los dos intentan insertar en "perfiles" con el mismo id, y el
-- viejo (sin "on conflict") choca contra el nuestro y aborta el registro
-- completo ("Database error saving new user").
--
-- Sacamos el trigger nuevo y dejamos que el viejo siga solo — igual que
-- antes de este cambio, pero ahora sin el insert redundante del cliente
-- (ese sí se sacó de AuthContext.jsx y ese era el bug original).
drop trigger if exists al_crear_usuario on auth.users;
drop function if exists public.crear_perfil_nuevo_usuario();
