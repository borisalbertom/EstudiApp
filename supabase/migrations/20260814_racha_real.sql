-- Calcula la racha real de días seguidos jugando. Se dispara cada vez
-- que se responde una pregunta (duelo o práctica individual insertan
-- en historial_preguntas), así que un solo trigger cubre ambos modos.

create or replace function actualizar_racha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ultima date;
  actual integer;
begin
  select ultima_actividad, racha_actual into ultima, actual
  from perfiles where id = new.usuario_id;

  if ultima is null then
    update perfiles set racha_actual = 1, ultima_actividad = current_date where id = new.usuario_id;
  elsif ultima = current_date then
    null; -- ya contaba hoy
  elsif ultima = current_date - 1 then
    update perfiles set racha_actual = actual + 1, ultima_actividad = current_date where id = new.usuario_id;
  else
    update perfiles set racha_actual = 1, ultima_actividad = current_date where id = new.usuario_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_actualizar_racha on historial_preguntas;
create trigger trg_actualizar_racha
  after insert on historial_preguntas
  for each row execute function actualizar_racha();
