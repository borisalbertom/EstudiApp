-- Hoy el perfil se crea desde el cliente justo después de auth.signUp(),
-- usando la sesión recién creada. Eso falla en dos casos reales:
-- 1) Si el proyecto tiene "Confirm email" activado, signUp() no entrega
--    sesión hasta que el usuario confirma su correo, así que el insert a
--    "perfiles" se hace sin sesión y la política RLS (auth.uid() = id) lo
--    rechaza con un error crudo de Postgres, no un mensaje entendible.
-- 2) Si alguien intenta registrarse de nuevo con un correo que ya existe
--    pero no ha confirmado, Supabase (por seguridad, para no filtrar qué
--    correos existen) responde como si fuera exitoso con el mismo user id
--    de siempre — el insert a "perfiles" choca con la fila que ya existe y
--    muestra un error de llave duplicada, también críptico.
--
-- La solución estándar de Supabase: crear el perfil con un trigger en
-- auth.users, que corre como el dueño de la función (bypassea RLS) y no
-- depende de que exista sesión. "on conflict do nothing" cubre el reintento
-- con correo no confirmado sin romper nada.

create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
exception when others then
  -- No dejar que un problema al crear el perfil bloquee el registro
  -- completo del usuario; queda registrado en los logs de Postgres para
  -- diagnosticar la causa real (el API de Auth no deja ver el detalle).
  raise warning 'crear_perfil_nuevo_usuario fallo para %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();
