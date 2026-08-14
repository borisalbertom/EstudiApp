-- organizaciones y miembros_organizacion no tenían ninguna política RLS
-- (mismo problema que se repitió con amistades, temas, preguntas, etc.),
-- así que hoy nadie puede verlas ni unirse. Además la política de
-- "Ver cursos publicos" depende de poder leer miembros_organizacion —
-- sin una política de SELECT ahí, esa comprobación siempre da vacío
-- aunque exista la membresía real.

alter table organizaciones add column if not exists dominio_email text;

create policy "Admins gestionan organizaciones"
  on organizaciones for all
  using (exists (select 1 from perfiles p where p.id = auth.uid() and p.es_admin_plataforma))
  with check (exists (select 1 from perfiles p where p.id = auth.uid() and p.es_admin_plataforma));

create policy "Ver organizaciones"
  on organizaciones for select
  using (true);

create policy "Admins gestionan membresias"
  on miembros_organizacion for all
  using (exists (select 1 from perfiles p where p.id = auth.uid() and p.es_admin_plataforma))
  with check (exists (select 1 from perfiles p where p.id = auth.uid() and p.es_admin_plataforma));

create policy "Ver mis membresias"
  on miembros_organizacion for select
  using (auth.uid() = usuario_id);

-- Une automáticamente a un usuario a la organización cuyo dominio
-- calce con su email, cuando se registra o si le cambian el email.
create or replace function auto_unir_organizacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
begin
  if new.email is null then
    return new;
  end if;

  select id into org_id
  from organizaciones
  where dominio_email is not null
  and lower(dominio_email) = lower(split_part(new.email, '@', 2))
  limit 1;

  if org_id is not null then
    insert into miembros_organizacion (usuario_id, organizacion_id, rol)
    select new.id, org_id, 'miembro'
    where not exists (
      select 1 from miembros_organizacion
      where usuario_id = new.id and organizacion_id = org_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auto_unir_organizacion on perfiles;
create trigger trg_auto_unir_organizacion
  after insert or update of email on perfiles
  for each row execute function auto_unir_organizacion();

-- Cuando el admin crea o le pone/cambia el dominio a una organización,
-- une automáticamente a los usuarios que ya existían con ese dominio.
create or replace function backfill_miembros_por_dominio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.dominio_email is null then
    return new;
  end if;

  insert into miembros_organizacion (usuario_id, organizacion_id, rol)
  select p.id, new.id, 'miembro'
  from perfiles p
  where p.email is not null
  and lower(split_part(p.email, '@', 2)) = lower(new.dominio_email)
  and not exists (
    select 1 from miembros_organizacion m
    where m.usuario_id = p.id and m.organizacion_id = new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_backfill_miembros_por_dominio on organizaciones;
create trigger trg_backfill_miembros_por_dominio
  after insert or update of dominio_email on organizaciones
  for each row execute function backfill_miembros_por_dominio();
