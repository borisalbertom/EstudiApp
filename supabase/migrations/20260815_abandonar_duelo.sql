-- Permite abandonar un duelo pendiente: gana el que no se salió.
-- abandonado_por guarda quién abandonó; si está seteado, el ranking y
-- los logros usan eso en vez de comparar puntajes (evita que un duelo
-- donde nadie alcanzó a responder nada quede como "empate").

alter table duelos add column if not exists abandonado_por uuid references perfiles(id);

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
      d.abandonado_por,
      coalesce(sum(case when r.usuario_id = d.jugador_1 and r.es_correcta then 1 else 0 end), 0) as p1,
      coalesce(sum(case when r.usuario_id = d.jugador_2 and r.es_correcta then 1 else 0 end), 0) as p2
    from duelos d
    left join respuestas r on r.duelo_id = d.id
    where d.estado = 'finalizado' and d.curso_id = curso_id_param
    group by d.id, d.jugador_1, d.jugador_2, d.abandonado_por
  ),
  por_jugador as (
    select jugador_1 as usuario_id,
      case
        when abandonado_por is not null then (case when abandonado_por <> jugador_1 then 1 else 0 end)
        when p1 > p2 then 1 else 0
      end as gano,
      case when abandonado_por is null and p1 = p2 then 1 else 0 end as empato,
      case
        when abandonado_por is not null then (case when abandonado_por = jugador_1 then 1 else 0 end)
        when p1 < p2 then 1 else 0
      end as perdio
    from resultados
    union all
    select jugador_2 as usuario_id,
      case
        when abandonado_por is not null then (case when abandonado_por <> jugador_2 then 1 else 0 end)
        when p2 > p1 then 1 else 0
      end as gano,
      case when abandonado_por is null and p1 = p2 then 1 else 0 end as empato,
      case
        when abandonado_por is not null then (case when abandonado_por = jugador_2 then 1 else 0 end)
        when p2 < p1 then 1 else 0
      end as perdio
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
            d.jugador_1, d.jugador_2, d.abandonado_por,
            sum(case when r.usuario_id = d.jugador_1 and r.es_correcta then 1 else 0 end) as p1,
            sum(case when r.usuario_id = d.jugador_2 and r.es_correcta then 1 else 0 end) as p2
          from duelos d
          join respuestas r on r.duelo_id = d.id
          where d.estado = 'finalizado'
          and (d.jugador_1 = p_usuario_id or d.jugador_2 = p_usuario_id)
          and (logro.curso_id is null or d.curso_id = logro.curso_id)
          group by d.id, d.jugador_1, d.jugador_2, d.abandonado_por

          union all

          -- cubre duelos abandonados sin ninguna respuesta (el join de arriba los pierde)
          select d.jugador_1, d.jugador_2, d.abandonado_por, 0, 0
          from duelos d
          where d.estado = 'finalizado'
          and d.abandonado_por is not null
          and (d.jugador_1 = p_usuario_id or d.jugador_2 = p_usuario_id)
          and (logro.curso_id is null or d.curso_id = logro.curso_id)
          and not exists (select 1 from respuestas r where r.duelo_id = d.id)
        ) x
        where (x.jugador_1 = p_usuario_id and (
                (x.abandonado_por is not null and x.abandonado_por <> p_usuario_id)
                or (x.abandonado_por is null and x.p1 > x.p2)
              ))
           or (x.jugador_2 = p_usuario_id and (
                (x.abandonado_por is not null and x.abandonado_por <> p_usuario_id)
                or (x.abandonado_por is null and x.p2 > x.p1)
              ))
      );

    elsif logro.tipo = 'duelo_perfecto' then
      v_cumple := exists (
        select 1 from duelos d
        where d.estado = 'finalizado'
        and d.abandonado_por is null
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
