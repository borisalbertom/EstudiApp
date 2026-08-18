create table materiales_vistos (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materiales_tema(id) on delete cascade,
  usuario_id uuid not null references perfiles(id) on delete cascade,
  visto_en timestamptz not null default now(),
  unique (material_id, usuario_id)
);

alter table materiales_vistos enable row level security;

create policy "Marcar material como visto"
  on materiales_vistos for insert
  with check (auth.uid() = usuario_id);

create policy "Ver mis materiales vistos"
  on materiales_vistos for select
  using (auth.uid() = usuario_id);
