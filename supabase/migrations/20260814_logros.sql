-- Sistema de logros. Cada logro es global (curso_id null) o específico
-- de un curso. Se evalúan automáticamente vía triggers cada vez que el
-- usuario responde una pregunta, termina un duelo, o hace un intento
-- individual — no hace falta que el cliente calcule nada.

create table if not exists logros (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre text not null,
  descripcion text not null,
  icono text not null default '🏆',
  tipo text not null check (tipo in (
    'racha', 'puntos_totales', 'duelos_ganados', 'duelo_perfecto',
    'primer_duelo', 'aprobacion_individual'
  )),
  valor_objetivo integer not null default 1,
  curso_id uuid references cursos(id),
  creado_en timestamptz not null default now()
);

create table if not exists logros_usuario (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfiles(id),
  logro_id uuid not null references logros(id),
  obtenido_en timestamptz not null default now(),
  unique (usuario_id, logro_id)
);

alter table logros enable row level security;
alter table logros_usuario enable row level security;

create policy "Ver catálogo de logros"
  on logros for select
  using (true);

create policy "Admins gestionan logros"
  on logros for all
  using (exists (select 1 from perfiles p where p.id = auth.uid() and p.es_admin_plataforma))
  with check (exists (select 1 from perfiles p where p.id = auth.uid() and p.es_admin_plataforma));

create policy "Ver mis logros"
  on logros_usuario for select
  using (auth.uid() = usuario_id);

create policy "Ver logros de mis amigos"
  on logros_usuario for select
  using (
    exists (
      select 1 from amistades a
      where a.estado = 'aceptada'
      and (
        (a.usuario_a = auth.uid() and a.usuario_b = logros_usuario.usuario_id)
        or (a.usuario_b = auth.uid() and a.usuario_a = logros_usuario.usuario_id)
      )
    )
  );

-- Revisa todos los logros no obtenidos por un usuario y le otorga los
-- que ya cumple. security definer: los logros_usuario los inserta
-- siempre esta función, nunca el cliente directamente.
create or replace function evaluar_logros(p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_racha integer;
  v_puntos integer;
  logro record;
  v_cumple boolean;
begin
  select racha_actual, puntos_totales into v_racha, v_puntos from perfiles where id = p_usuario_id;

  for logro in select * from logros loop
    if exists (select 1 from logros_usuario where usuario_id = p_usuario_id and logro_id = logro.id) then
      continue;
    end if;

    v_cumple := false;

    if logro.tipo = 'racha' then
      v_cumple := v_racha >= logro.valor_objetivo;

    elsif logro.tipo = 'puntos_totales' then
      v_cumple := v_puntos >= logro.valor_objetivo;

    elsif logro.tipo = 'primer_duelo' then
      v_cumple := exists (
        select 1 from duelos d
        where (d.jugador_1 = p_usuario_id or d.jugador_2 = p_usuario_id)
        and (logro.curso_id is null or d.curso_id = logro.curso_id)
      );

    elsif logro.tipo = 'aprobacion_individual' and logro.curso_id is not null then
      v_cumple := exists (
        select 1 from intentos_individuales ii
        join cursos c on c.id = ii.curso_id
        where ii.usuario_id = p_usuario_id and ii.curso_id = logro.curso_id
        and round(100.0 * ii.correctas / nullif(ii.cantidad_preguntas, 0)) >= c.porcentaje_certificacion
      );

    elsif logro.tipo = 'duelos_ganados' then
      v_cumple := (
        select count(*) >= logro.valor_objetivo
        from (
          select
            d.jugador_1, d.jugador_2,
            sum(case when r.usuario_id = d.jugador_1 and r.es_correcta then 1 else 0 end) as p1,
            sum(case when r.usuario_id = d.jugador_2 and r.es_correcta then 1 else 0 end) as p2
          from duelos d
          join respuestas r on r.duelo_id = d.id
          where d.estado = 'finalizado'
          and (d.jugador_1 = p_usuario_id or d.jugador_2 = p_usuario_id)
          and (logro.curso_id is null or d.curso_id = logro.curso_id)
          group by d.id, d.jugador_1, d.jugador_2
        ) x
        where (x.jugador_1 = p_usuario_id and x.p1 > x.p2)
           or (x.jugador_2 = p_usuario_id and x.p2 > x.p1)
      );

    elsif logro.tipo = 'duelo_perfecto' then
      v_cumple := exists (
        select 1 from duelos d
        where d.estado = 'finalizado'
        and (d.jugador_1 = p_usuario_id or d.jugador_2 = p_usuario_id)
        and (logro.curso_id is null or d.curso_id = logro.curso_id)
        and d.cantidad_preguntas = (
          select count(*) from respuestas r
          where r.duelo_id = d.id and r.usuario_id = p_usuario_id and r.es_correcta
        )
      );
    end if;

    if v_cumple then
      insert into logros_usuario (usuario_id, logro_id) values (p_usuario_id, logro.id)
      on conflict (usuario_id, logro_id) do nothing;
    end if;
  end loop;
end;
$$;

create or replace function trigger_logros_historial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform evaluar_logros(new.usuario_id);
  return new;
end;
$$;

drop trigger if exists trg_logros_historial on historial_preguntas;
create trigger trg_logros_historial
  after insert on historial_preguntas
  for each row execute function trigger_logros_historial();

create or replace function trigger_logros_duelo_finalizado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'finalizado' and (old.estado is distinct from 'finalizado') then
    perform evaluar_logros(new.jugador_1);
    perform evaluar_logros(new.jugador_2);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_logros_duelo_finalizado on duelos;
create trigger trg_logros_duelo_finalizado
  after update on duelos
  for each row execute function trigger_logros_duelo_finalizado();

create or replace function trigger_logros_intento_individual()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform evaluar_logros(new.usuario_id);
  return new;
end;
$$;

drop trigger if exists trg_logros_intento_individual on intentos_individuales;
create trigger trg_logros_intento_individual
  after insert on intentos_individuales
  for each row execute function trigger_logros_intento_individual();

-- Catálogo inicial
insert into logros (codigo, nombre, descripcion, icono, tipo, valor_objetivo, curso_id) values
  ('racha_3', 'Constancia', 'Juega 3 días seguidos', '🔥', 'racha', 3, null),
  ('racha_7', 'Una semana completa', 'Juega 7 días seguidos', '🔥', 'racha', 7, null),
  ('racha_30', 'Imparable', 'Juega 30 días seguidos', '🔥', 'racha', 30, null),
  ('puntos_10', 'Primeros pasos', 'Responde 10 preguntas correctas', '⭐', 'puntos_totales', 10, null),
  ('puntos_50', 'Estudioso', 'Responde 50 preguntas correctas', '🌟', 'puntos_totales', 50, null),
  ('puntos_100', 'Sabelotodo', 'Responde 100 preguntas correctas', '💯', 'puntos_totales', 100, null),
  ('primer_duelo', 'A la cancha', 'Juega tu primer duelo', '🎮', 'primer_duelo', 1, null),
  ('duelos_ganados_5', 'Competidor', 'Gana 5 duelos', '🏆', 'duelos_ganados', 5, null),
  ('duelo_perfecto', 'Puntaje perfecto', 'Responde todas las preguntas bien en un duelo', '💎', 'duelo_perfecto', 1, null),
  ('paes_duelos_3', 'Crack de la PAES', 'Gana 3 duelos en PAES 2027', '🎓', 'duelos_ganados', 3, 'e35fb486-7339-4544-990e-6eda17d9e6b6')
on conflict (codigo) do nothing;
