-- amistades: la política de INSERT no existía (o estaba rota), así que
-- nadie podía enviar solicitudes de amistad. Se confirmó con un insert
-- de prueba que devolvió: "new row violates row-level security policy".
-- Se agrega también SELECT por si acaso, de forma aditiva (no rompe nada
-- si ya existía una que funcionaba).

create policy "Crear solicitud de amistad"
  on amistades for insert
  with check (auth.uid() = usuario_a);

create policy "Ver mis amistades"
  on amistades for select
  using (auth.uid() = usuario_a or auth.uid() = usuario_b);
