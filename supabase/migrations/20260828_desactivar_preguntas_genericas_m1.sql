-- Desactiva (no borra) las 11 preguntas genéricas/placeholder de
-- Competencia Matemática M1 ahora que el tema tiene 54 preguntas
-- oficiales de PAES con contexto e imágenes reales. No se pueden borrar
-- de raíz: algunas ya están referenciadas desde duelo_preguntas (duelos
-- reales que las usaron), y borrarlas rompería ese historial.

update preguntas
set activa = false
where id in (
  'a963010a-ffe8-46de-b0d6-4c7e5d3e9580',
  '5486bfa7-cfb4-44ae-931d-3d98fb90434b',
  'b47a7a4f-e734-4ab5-8b9b-59d79349e764',
  'a45537f7-41c0-415d-ae5f-1b3a5c444cf6',
  '467530ea-ea10-4992-b5aa-d5dd567f8ddd',
  'aa93dad5-a927-4cb7-bd98-f5db150d661f',
  '483644fb-f267-4df7-a1c0-4ceabdea981a',
  '34cfd0dc-40a0-47a3-b297-95f57c7a9257',
  'bed9ed58-c3f0-42fe-a41d-7abcd473af65',
  '6c7a49a6-a433-429f-b73d-8bd8b9902317',
  '821f0234-e6d0-4a44-aec1-cfa3b5002046'
);
