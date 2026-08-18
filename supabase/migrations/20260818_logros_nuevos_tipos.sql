-- Revisión de logros con la nueva separación Cursos/Pruebas/Trivias:
-- los 10 logros existentes (racha, puntos, duelos, "Crack de la PAES") siguen
-- siendo válidos tal cual, no hay que borrar nada. Lo que faltaba era premiar
-- dos cosas que hoy no tienen ningún logro asociado: revisar todo el material
-- de estudio de un curso (Certificación), y la primera práctica individual
-- (Pruebas/Trivias, incluye practicar solo por contenido o todo el curso).

alter table logros drop constraint if exists logros_tipo_check;
alter table logros add constraint logros_tipo_check check (tipo in (
  'racha', 'puntos_totales', 'duelos_ganados', 'duelo_perfecto',
  'primer_duelo', 'aprobacion_individual', 'material_completo', 'primera_practica'
));

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

    elsif logro.tipo = 'material_completo' then
      v_cumple := exists (
        select 1
        from cursos c
        join temas t on t.curso_id = c.id
        join materiales_tema mt on mt.tema_id = t.id
        where (logro.curso_id is null or c.id = logro.curso_id)
        group by c.id
        having count(*) = count(*) filter (
          where exists (
            select 1 from materiales_vistos mv where mv.material_id = mt.id and mv.usuario_id = p_usuario_id
          )
        )
      );

    elsif logro.tipo = 'primera_practica' then
      -- tema_id no nulo = practica de un contenido especifico; tema_id nulo
      -- en un curso que no es Certificacion = practica de todo el curso
      -- (en Certificacion, tema_id nulo es el Examen final, no practica).
      v_cumple := exists (
        select 1 from intentos_individuales ii
        join cursos c on c.id = ii.curso_id
        where ii.usuario_id = p_usuario_id
        and (ii.tema_id is not null or c.permite_individual = false)
        and (logro.curso_id is null or ii.curso_id = logro.curso_id)
      );
    end if;

    if v_cumple then
      insert into logros_usuario (usuario_id, logro_id) values (p_usuario_id, logro.id)
      on conflict (usuario_id, logro_id) do nothing;
    end if;
  end loop;
end;
$$;

insert into logros (codigo, nombre, descripcion, icono, tipo, valor_objetivo, curso_id) values
  ('material_completo', 'Aplicado', 'Revisa todo el material de estudio de un curso', '📚', 'material_completo', 1, null),
  ('primera_practica', 'Calentando motores', 'Completa tu primera práctica individual', '📝', 'primera_practica', 1, null)
on conflict (codigo) do nothing;
