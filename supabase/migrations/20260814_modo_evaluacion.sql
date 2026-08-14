-- Permite configurar por curso si se pueden hacer duelos, si hay modo
-- individual (para cursos de "solo nota") y si se muestra el ranking.
-- Además crea la tabla para guardar los intentos del modo individual.

alter table cursos add column if not exists permite_duelos boolean not null default true;
alter table cursos add column if not exists permite_individual boolean not null default false;
alter table cursos add column if not exists mostrar_ranking boolean not null default true;

create table if not exists intentos_individuales (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfiles(id),
  curso_id uuid not null references cursos(id),
  tema_id uuid not null references temas(id),
  cantidad_preguntas integer not null,
  correctas integer not null,
  completado_en timestamptz not null default now()
);

alter table intentos_individuales enable row level security;

create policy "Insertar mis intentos"
  on intentos_individuales for insert
  with check (auth.uid() = usuario_id);

create policy "Ver mis intentos"
  on intentos_individuales for select
  using (auth.uid() = usuario_id);

create policy "Ver intentos de mis amigos"
  on intentos_individuales for select
  using (
    exists (
      select 1 from amistades a
      where a.estado = 'aceptada'
      and (
        (a.usuario_a = auth.uid() and a.usuario_b = intentos_individuales.usuario_id)
        or (a.usuario_b = auth.uid() and a.usuario_a = intentos_individuales.usuario_id)
      )
    )
  );

-- Ranking de duelos por curso, estilo fútbol (victoria=3, empate=1, derrota=0).
-- security definer + el llamador pasa explícitamente la lista de usuarios
-- (normalmente: uno mismo + amigos aceptados) para no tener que abrir
-- políticas de RLS más permisivas en duelos/respuestas; la función solo
-- devuelve agregados (conteos), nunca respuestas individuales.
create or replace function ranking_duelos_curso(curso_id_param uuid, usuarios_param uuid[])
returns table (
  usuario_id uuid,
  victorias integer,
  empates integer,
  derrotas integer,
  puntos integer,
  partidas integer
)
language sql
stable
security definer
set search_path = public
as $$
  with resultados as (
    select
      d.id as duelo_id,
      d.jugador_1,
      d.jugador_2,
      coalesce(sum(case when r.usuario_id = d.jugador_1 and r.es_correcta then 1 else 0 end), 0) as p1,
      coalesce(sum(case when r.usuario_id = d.jugador_2 and r.es_correcta then 1 else 0 end), 0) as p2
    from duelos d
    left join respuestas r on r.duelo_id = d.id
    where d.estado = 'finalizado' and d.curso_id = curso_id_param
    group by d.id, d.jugador_1, d.jugador_2
  ),
  por_jugador as (
    select jugador_1 as usuario_id,
      case when p1 > p2 then 1 else 0 end as gano,
      case when p1 = p2 then 1 else 0 end as empato,
      case when p1 < p2 then 1 else 0 end as perdio
    from resultados
    union all
    select jugador_2 as usuario_id,
      case when p2 > p1 then 1 else 0 end as gano,
      case when p1 = p2 then 1 else 0 end as empato,
      case when p2 < p1 then 1 else 0 end as perdio
    from resultados
  )
  select
    usuario_id,
    sum(gano)::int as victorias,
    sum(empato)::int as empates,
    sum(perdio)::int as derrotas,
    (sum(gano) * 3 + sum(empato))::int as puntos,
    count(*)::int as partidas
  from por_jugador
  where usuario_id = any(usuarios_param)
  group by usuario_id;
$$;

-- Ranking por notas (modo individual): mejor porcentaje logrado por curso.
create or replace function ranking_individual_curso(curso_id_param uuid, usuarios_param uuid[])
returns table (
  usuario_id uuid,
  mejor_porcentaje numeric,
  intentos integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    usuario_id,
    max(round(100.0 * correctas / nullif(cantidad_preguntas, 0), 1)) as mejor_porcentaje,
    count(*)::int as intentos
  from intentos_individuales
  where curso_id = curso_id_param and usuario_id = any(usuarios_param)
  group by usuario_id;
$$;
