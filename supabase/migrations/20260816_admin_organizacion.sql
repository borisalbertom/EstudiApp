-- Introduce un rol "admin_curso" en miembros_organizacion: permite a
-- alguien administrar los cursos PRIVADOS de su propia organización
-- (crear/editar temas/preguntas), sin poder crear organizaciones,
-- tocar cursos públicos, cursos de otras empresas, ni logros —
-- eso queda reservado al super admin (perfiles.es_admin_plataforma).
-- Estas políticas son ADITIVAS: coexisten con "Admins gestionan
-- cursos/temas/preguntas" (super admin), no las reemplazan.

create policy "Org admins gestionan cursos de su organizacion"
  on cursos for all
  using (
    visibilidad = 'privado' and exists (
      select 1 from miembros_organizacion m
      where m.usuario_id = auth.uid()
        and m.organizacion_id = cursos.organizacion_id
        and m.rol = 'admin_curso'
    )
  )
  with check (
    visibilidad = 'privado' and exists (
      select 1 from miembros_organizacion m
      where m.usuario_id = auth.uid()
        and m.organizacion_id = cursos.organizacion_id
        and m.rol = 'admin_curso'
    )
  );

create policy "Org admins gestionan temas de su organizacion"
  on temas for all
  using (
    exists (
      select 1 from cursos c
      join miembros_organizacion m on m.organizacion_id = c.organizacion_id
      where c.id = temas.curso_id
        and c.visibilidad = 'privado'
        and m.usuario_id = auth.uid()
        and m.rol = 'admin_curso'
    )
  )
  with check (
    exists (
      select 1 from cursos c
      join miembros_organizacion m on m.organizacion_id = c.organizacion_id
      where c.id = temas.curso_id
        and c.visibilidad = 'privado'
        and m.usuario_id = auth.uid()
        and m.rol = 'admin_curso'
    )
  );

create policy "Org admins gestionan preguntas de su organizacion"
  on preguntas for all
  using (
    exists (
      select 1 from temas t
      join cursos c on c.id = t.curso_id
      join miembros_organizacion m on m.organizacion_id = c.organizacion_id
      where t.id = preguntas.tema_id
        and c.visibilidad = 'privado'
        and m.usuario_id = auth.uid()
        and m.rol = 'admin_curso'
    )
  )
  with check (
    exists (
      select 1 from temas t
      join cursos c on c.id = t.curso_id
      join miembros_organizacion m on m.organizacion_id = c.organizacion_id
      where t.id = preguntas.tema_id
        and c.visibilidad = 'privado'
        and m.usuario_id = auth.uid()
        and m.rol = 'admin_curso'
    )
  );
