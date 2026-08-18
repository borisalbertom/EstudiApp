alter table cursos add column fecha_fin_duelos date;

alter table cursos add constraint fecha_fin_duelos_antes_examen
  check (fecha_fin_duelos is null or fecha_fin is null or fecha_fin_duelos <= fecha_fin);
