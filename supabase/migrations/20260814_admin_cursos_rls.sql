-- Permite a los usuarios con perfiles.es_admin_plataforma = true crear y
-- editar cursos, temas y preguntas desde el panel de administración.
-- Son políticas "for all" adicionales a las de solo-lectura que ya existen,
-- así que no rompen el acceso normal de los demás usuarios.

create policy "Admins gestionan cursos"
  on cursos for all
  using (exists (select 1 from perfiles p where p.id = auth.uid() and p.es_admin_plataforma))
  with check (exists (select 1 from perfiles p where p.id = auth.uid() and p.es_admin_plataforma));

create policy "Admins gestionan temas"
  on temas for all
  using (exists (select 1 from perfiles p where p.id = auth.uid() and p.es_admin_plataforma))
  with check (exists (select 1 from perfiles p where p.id = auth.uid() and p.es_admin_plataforma));

create policy "Admins gestionan preguntas"
  on preguntas for all
  using (exists (select 1 from perfiles p where p.id = auth.uid() and p.es_admin_plataforma))
  with check (exists (select 1 from perfiles p where p.id = auth.uid() and p.es_admin_plataforma));

-- Convierte tu cuenta en admin de plataforma para poder usar el panel.
-- Cambia el email si quieres dárselo a otra cuenta en vez de (o además de) esta.
update perfiles set es_admin_plataforma = true where email = 'boris.albertom@gmail.com';
