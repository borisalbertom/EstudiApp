-- Fecha límite de publicación por curso (aplica tanto a Retos como a
-- Certificación, ya que un curso es siempre uno u otro). null = sin
-- fecha de término. El admin del curso puede editarla/alargarla en
-- cualquier momento.

alter table cursos add column fecha_fin date;
