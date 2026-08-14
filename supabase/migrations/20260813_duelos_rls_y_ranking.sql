-- Políticas RLS que faltaban para que el flujo de duelo asíncrono funcione,
-- más el conteo de puntos reales para el ranking.
-- Correr en el SQL Editor de Supabase.

-- 1) duelos: falta política de UPDATE (para marcar el duelo como finalizado)
create policy "Actualizar mis duelos"
  on duelos for update
  using (auth.uid() = jugador_1 or auth.uid() = jugador_2)
  with check (auth.uid() = jugador_1 or auth.uid() = jugador_2);

-- 2) respuestas: hoy cada jugador solo ve las suyas; se agrega ver las de
-- ambos jugadores del mismo duelo (para la pantalla de resultado)
create policy "Ver respuestas de mis duelos"
  on respuestas for select
  using (
    exists (
      select 1 from duelos d
      where d.id = respuestas.duelo_id
      and (d.jugador_1 = auth.uid() or d.jugador_2 = auth.uid())
    )
  );

-- 3) duelo_preguntas: no tenía ninguna política
alter table duelo_preguntas enable row level security;

create policy "Ver preguntas de mis duelos"
  on duelo_preguntas for select
  using (
    exists (
      select 1 from duelos d
      where d.id = duelo_preguntas.duelo_id
      and (d.jugador_1 = auth.uid() or d.jugador_2 = auth.uid())
    )
  );

create policy "Crear preguntas de mi duelo"
  on duelo_preguntas for insert
  with check (
    exists (
      select 1 from duelos d
      where d.id = duelo_preguntas.duelo_id
      and d.jugador_1 = auth.uid()
    )
  );

-- 4) historial_preguntas: no tenía ninguna política
alter table historial_preguntas enable row level security;

create policy "Ver mi historial"
  on historial_preguntas for select
  using (auth.uid() = usuario_id);

create policy "Insertar mi historial"
  on historial_preguntas for insert
  with check (auth.uid() = usuario_id);

-- 5) Ranking: puntos reales en vez de placeholder.
-- Se suman automáticamente vía trigger cada vez que se inserta una
-- respuesta correcta, así no depende de que el cliente calcule bien el total.
alter table perfiles add column if not exists puntos_totales integer not null default 0;

create or replace function public.sumar_puntos_respuesta()
returns trigger as $$
begin
  if new.es_correcta then
    update public.perfiles set puntos_totales = puntos_totales + 1 where id = new.usuario_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sumar_puntos_respuesta on respuestas;

create trigger trg_sumar_puntos_respuesta
  after insert on respuestas
  for each row execute function public.sumar_puntos_respuesta();
