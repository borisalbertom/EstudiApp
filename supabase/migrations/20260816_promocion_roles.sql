-- Permite que los roles se nombren "hacia los lados": un admin_curso
-- puede nombrar/quitar a otro admin_curso dentro de SU MISMA
-- organización, y un super admin puede nombrar/quitar a otro super
-- admin (cualquier perfil).

create policy "Org admins gestionan miembros de su organizacion"
  on miembros_organizacion for all
  using (
    exists (
      select 1 from miembros_organizacion m
      where m.usuario_id = auth.uid()
        and m.organizacion_id = miembros_organizacion.organizacion_id
        and m.rol = 'admin_curso'
    )
  )
  with check (
    exists (
      select 1 from miembros_organizacion m
      where m.usuario_id = auth.uid()
        and m.organizacion_id = miembros_organizacion.organizacion_id
        and m.rol = 'admin_curso'
    )
  );

create policy "Super admins gestionan perfiles"
  on perfiles for update
  using (exists (select 1 from perfiles p where p.id = auth.uid() and p.es_admin_plataforma))
  with check (exists (select 1 from perfiles p where p.id = auth.uid() and p.es_admin_plataforma));
