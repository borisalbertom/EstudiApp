-- Bucket público para fotos de perfil. Cada usuario sube su avatar
-- bajo su propio userId como carpeta (ej. "abc123/avatar.png"), y esa
-- convención de carpeta es lo que usan las políticas para saber que
-- solo tú puedes subir/actualizar tu propia foto.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatares públicos para ver"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Usuarios suben su propio avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Usuarios actualizan su propio avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
