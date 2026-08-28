-- Nueva Trivia: "¿Sabes más que un niño de 12 años?" — preguntas de nivel
-- 5°-6° básico en las 4 asignaturas troncales, pensada para que los adultos
-- se rían al no acordarse de cosas que se supone deberían saber.
-- 4 categorías x 20 preguntas = 80 en total.

with nueva_trivia as (
  insert into cursos (
    nombre, descripcion, visibilidad, creado_por,
    permite_duelos, permite_individual, permite_practica_individual, mostrar_ranking,
    cantidad_preguntas, tiempo_por_pregunta
  )
  values (
    '¿Sabes más que un niño de 12 años?',
    'Preguntas de matemática, lenguaje, historia y ciencias de 5°-6° básico. ¿Te acuerdas de todo esto?',
    'publico',
    '04952ed1-21d3-46cc-a262-92e12644e0b3',
    true, false, false, true,
    10, 0
  )
  returning id
),
temas_nuevos as (
  insert into temas (curso_id, nombre, orden)
  select nueva_trivia.id, t.nombre, t.orden
  from nueva_trivia, (values
    ('Matemática', 1),
    ('Lenguaje y Comunicación', 2),
    ('Historia, Geografía y Ciencias Sociales', 3),
    ('Ciencias Naturales', 4)
  ) as t(nombre, orden)
  returning id, nombre
)
insert into preguntas (tema_id, enunciado, alternativas, correcta, dificultad, creada_por, activa)
select
  temas_nuevos.id,
  q.enunciado,
  q.alternativas,
  q.correcta,
  q.dificultad::dificultad_pregunta,
  '04952ed1-21d3-46cc-a262-92e12644e0b3',
  true
from temas_nuevos
join (values

  -- Matemática (20)
  ('Matemática', '¿Cuánto es 7 x 8?', '["54","56","64","48"]'::jsonb, 1, 'facil'),
  ('Matemática', '¿Cuánto es 100 ÷ 4?', '["20","25","10","40"]'::jsonb, 1, 'facil'),
  ('Matemática', '¿Cuánto es 15 + 27?', '["42","32","52","41"]'::jsonb, 0, 'facil'),
  ('Matemática', '¿Qué fracción representa "la mitad" de algo?', '["1/3","1/2","2/3","1/4"]'::jsonb, 1, 'facil'),
  ('Matemática', '¿Cuántos lados tiene un hexágono?', '["5","6","7","8"]'::jsonb, 1, 'facil'),
  ('Matemática', '¿Cuántos grados tiene un ángulo recto?', '["45°","90°","180°","360°"]'::jsonb, 1, 'media'),
  ('Matemática', 'En la secuencia 2, 4, 6, 8, ¿qué número sigue?', '["9","10","12","11"]'::jsonb, 1, 'facil'),
  ('Matemática', '¿Cuánto es 9 x 9?', '["72","81","99","91"]'::jsonb, 1, 'facil'),
  ('Matemática', '¿Cuál de estos números es primo?', '["4","6","7","9"]'::jsonb, 2, 'media'),
  ('Matemática', '¿Cuánto es 1/4 + 1/4?', '["1/8","1/2","3/4","1"]'::jsonb, 1, 'media'),
  ('Matemática', '¿Cuántos milímetros tiene un centímetro?', '["10","100","1","5"]'::jsonb, 0, 'media'),
  ('Matemática', '¿Cuál es el perímetro de un cuadrado de lado 5 cm?', '["10 cm","15 cm","20 cm","25 cm"]'::jsonb, 2, 'media'),
  ('Matemática', '¿Cuánto es el doble de 45?', '["80","85","90","95"]'::jsonb, 2, 'facil'),
  ('Matemática', '¿Cuánto es 144 ÷ 12?', '["10","11","12","14"]'::jsonb, 2, 'media'),
  ('Matemática', '¿Cómo se llama un triángulo con sus tres lados iguales?', '["Isósceles","Escaleno","Equilátero","Obtuso"]'::jsonb, 2, 'media'),
  ('Matemática', '¿Cuánto es 6 x 6?', '["30","36","42","48"]'::jsonb, 1, 'facil'),
  ('Matemática', '¿Cuál es el 50% de 200?', '["50","100","150","200"]'::jsonb, 1, 'media'),
  ('Matemática', '¿Cuánto suman los ángulos internos de un triángulo?', '["90°","180°","270°","360°"]'::jsonb, 1, 'dificil'),
  ('Matemática', '¿Cuánto es 5 al cuadrado (5²)?', '["10","15","20","25"]'::jsonb, 3, 'media'),
  ('Matemática', '¿Cuántos lados tiene un octágono?', '["6","7","8","9"]'::jsonb, 2, 'facil'),

  -- Lenguaje y Comunicación (20)
  ('Lenguaje y Comunicación', '¿Qué tipo de palabra es "correr"?', '["Sustantivo","Adjetivo","Verbo","Adverbio"]'::jsonb, 2, 'facil'),
  ('Lenguaje y Comunicación', '¿Cuál es un sinónimo de "feliz"?', '["Triste","Contento","Enojado","Cansado"]'::jsonb, 1, 'facil'),
  ('Lenguaje y Comunicación', '¿Cuál es el antónimo de "grande"?', '["Enorme","Alto","Pequeño","Ancho"]'::jsonb, 2, 'facil'),
  ('Lenguaje y Comunicación', '¿Cuál de estas palabras es un sustantivo?', '["Correr","Rápido","Casa","Y"]'::jsonb, 2, 'facil'),
  ('Lenguaje y Comunicación', '¿Cómo se le llama a la persona que escribe un libro?', '["Lector","Editor","Autor","Ilustrador"]'::jsonb, 2, 'facil'),
  ('Lenguaje y Comunicación', '¿Cómo se llama el signo "¿" que va al inicio de una pregunta?', '["Signo de exclamación","Signo de interrogación","Punto seguido","Coma"]'::jsonb, 1, 'facil'),
  ('Lenguaje y Comunicación', '¿Cómo se llama una historia corta con animales que hablan y deja una enseñanza?', '["Novela","Fábula","Biografía","Noticia"]'::jsonb, 1, 'media'),
  ('Lenguaje y Comunicación', '¿Cuántas sílabas tiene la palabra "mariposa"?', '["2","3","4","5"]'::jsonb, 2, 'media'),
  ('Lenguaje y Comunicación', '¿Qué es un adjetivo?', '["Una acción","Una palabra que describe a un sustantivo","Un signo de puntuación","Un tipo de verbo"]'::jsonb, 1, 'media'),
  ('Lenguaje y Comunicación', '¿Cuál es el plural de "papel"?', '["Papeles","Papels","Papelas","Papele"]'::jsonb, 0, 'facil'),
  ('Lenguaje y Comunicación', '¿Qué escritora chilena ganó el Premio Nobel de Literatura?', '["Isabel Allende","Gabriela Mistral","Violeta Parra","Marcela Paz"]'::jsonb, 1, 'media'),
  ('Lenguaje y Comunicación', '¿Qué poeta chileno también ganó el Premio Nobel de Literatura?', '["Vicente Huidobro","Nicanor Parra","Pablo Neruda","Pablo de Rokha"]'::jsonb, 2, 'media'),
  ('Lenguaje y Comunicación', '¿Cómo se llama el conjunto ordenado de todas las letras de un idioma?', '["Diccionario","Abecedario","Vocabulario","Glosario"]'::jsonb, 1, 'facil'),
  ('Lenguaje y Comunicación', '¿Qué tipo de texto informa sobre hechos reales, con fecha y lugar?', '["Cuento","Poema","Noticia","Fábula"]'::jsonb, 2, 'media'),
  ('Lenguaje y Comunicación', '¿Cuál es un sinónimo de "rápido"?', '["Lento","Veloz","Pesado","Tranquilo"]'::jsonb, 1, 'facil'),
  ('Lenguaje y Comunicación', '¿Cuántas vocales tiene la palabra "educación"?', '["3","4","5","6"]'::jsonb, 2, 'dificil'),
  ('Lenguaje y Comunicación', '¿Qué signo se usa para separar elementos en una lista?', '["Punto","Coma","Guion","Paréntesis"]'::jsonb, 1, 'facil'),
  ('Lenguaje y Comunicación', '¿Cómo se le llama cuando dos palabras terminan con un sonido parecido, como en una canción o poema?', '["Sinónimo","Rima","Prefijo","Sílaba"]'::jsonb, 1, 'media'),
  ('Lenguaje y Comunicación', '¿Qué género literario se escribe principalmente en verso?', '["Cuento","Novela","Poesía","Ensayo"]'::jsonb, 2, 'media'),
  ('Lenguaje y Comunicación', '¿Cuál es el antónimo de "rápido"?', '["Veloz","Ágil","Lento","Ligero"]'::jsonb, 2, 'facil'),

  -- Historia, Geografía y Ciencias Sociales (20)
  ('Historia, Geografía y Ciencias Sociales', '¿Qué se celebra el 18 de septiembre en Chile?', '["El día de la independencia de Chile en 1818","Las Fiestas Patrias, por la Primera Junta de Gobierno de 1810","El Día de la Raza","El aniversario de Santiago"]'::jsonb, 1, 'media'),
  ('Historia, Geografía y Ciencias Sociales', '¿Cuál es la capital de Chile?', '["Valparaíso","Concepción","Santiago","Antofagasta"]'::jsonb, 2, 'facil'),
  ('Historia, Geografía y Ciencias Sociales', '¿Qué océano baña la costa de Chile?', '["Atlántico","Pacífico","Índico","Ártico"]'::jsonb, 1, 'facil'),
  ('Historia, Geografía y Ciencias Sociales', '¿En qué continente está Chile?', '["Europa","Asia","América","África"]'::jsonb, 2, 'facil'),
  ('Historia, Geografía y Ciencias Sociales', '¿Cuál es el punto cardinal opuesto al Norte?', '["Este","Oeste","Sur","Centro"]'::jsonb, 2, 'facil'),
  ('Historia, Geografía y Ciencias Sociales', '¿Cómo se llama el desierto más árido del mundo, ubicado en el norte de Chile?', '["Desierto del Sahara","Desierto de Atacama","Desierto de Gobi","Desierto de Kalahari"]'::jsonb, 1, 'media'),
  ('Historia, Geografía y Ciencias Sociales', '¿Cómo se llama el continente helado ubicado en el polo sur?', '["Ártico","Groenlandia","Antártica","Siberia"]'::jsonb, 2, 'facil'),
  ('Historia, Geografía y Ciencias Sociales', '¿Quién fue el primer explorador español en llegar a Chile?', '["Pedro de Valdivia","Diego de Almagro","Hernán Cortés","Francisco Pizarro"]'::jsonb, 1, 'dificil'),
  ('Historia, Geografía y Ciencias Sociales', '¿En qué año llegó Cristóbal Colón a América?', '["1492","1500","1810","1592"]'::jsonb, 0, 'media'),
  ('Historia, Geografía y Ciencias Sociales', '¿Qué civilización antigua construyó las pirámides de Guiza?', '["Griegos","Romanos","Egipcios","Mayas"]'::jsonb, 2, 'facil'),
  ('Historia, Geografía y Ciencias Sociales', '¿En qué continente están las pirámides de Egipto?', '["Asia","África","Europa","Oceanía"]'::jsonb, 1, 'media'),
  ('Historia, Geografía y Ciencias Sociales', '¿Cómo se llamaban los guerreros de la antigua ciudad griega de Esparta?', '["Atenienses","Espartanos","Troyanos","Persas"]'::jsonb, 1, 'media'),
  ('Historia, Geografía y Ciencias Sociales', '¿Qué imperio de la antigüedad tenía como capital a Roma?', '["Imperio Griego","Imperio Egipcio","Imperio Romano","Imperio Persa"]'::jsonb, 2, 'facil'),
  ('Historia, Geografía y Ciencias Sociales', '¿Cuál es el país más grande del mundo por superficie?', '["China","Estados Unidos","Canadá","Rusia"]'::jsonb, 3, 'dificil'),
  ('Historia, Geografía y Ciencias Sociales', '¿Cuál es el río más largo de Sudamérica?', '["Amazonas","Orinoco","Paraná","Bío-Bío"]'::jsonb, 0, 'media'),
  ('Historia, Geografía y Ciencias Sociales', '¿Cómo se llama la cordillera que recorre Chile de norte a sur?', '["Cordillera de los Andes","Cordillera de la Costa","Himalaya","Los Alpes"]'::jsonb, 0, 'facil'),
  ('Historia, Geografía y Ciencias Sociales', '¿Cuál es el idioma oficial de Chile?', '["Portugués","Español","Inglés","Quechua"]'::jsonb, 1, 'facil'),
  ('Historia, Geografía y Ciencias Sociales', '¿Cuál es el pueblo originario más numeroso de Chile?', '["Aymara","Rapa Nui","Mapuche","Diaguita"]'::jsonb, 2, 'media'),
  ('Historia, Geografía y Ciencias Sociales', '¿En qué año terminó la Segunda Guerra Mundial?', '["1918","1939","1945","1950"]'::jsonb, 2, 'media'),
  ('Historia, Geografía y Ciencias Sociales', '¿Cómo se llama el documento que establece las leyes principales de un país?', '["Ley General","Reglamento","Constitución","Decreto"]'::jsonb, 2, 'media'),

  -- Ciencias Naturales (20)
  ('Ciencias Naturales', '¿Cuántos planetas tiene el sistema solar?', '["7","8","9","10"]'::jsonb, 1, 'facil'),
  ('Ciencias Naturales', '¿Cuál es el planeta más cercano al Sol?', '["Venus","Tierra","Mercurio","Marte"]'::jsonb, 2, 'facil'),
  ('Ciencias Naturales', '¿Cuál es el planeta conocido como el "planeta rojo"?', '["Júpiter","Marte","Saturno","Venus"]'::jsonb, 1, 'facil'),
  ('Ciencias Naturales', '¿Qué órgano bombea la sangre en el cuerpo humano?', '["Pulmón","Cerebro","Corazón","Hígado"]'::jsonb, 2, 'facil'),
  ('Ciencias Naturales', '¿Cuántos huesos tiene aproximadamente el cuerpo humano adulto?', '["106","206","306","406"]'::jsonb, 1, 'dificil'),
  ('Ciencias Naturales', '¿Cómo se llama el proceso por el cual las plantas producen su alimento usando la luz solar?', '["Respiración","Digestión","Fotosíntesis","Circulación"]'::jsonb, 2, 'media'),
  ('Ciencias Naturales', '¿Cuáles son los tres estados de la materia?', '["Sólido, líquido y gaseoso","Frío, calor y tibio","Duro, blando y líquido","Grande, mediano y pequeño"]'::jsonb, 0, 'facil'),
  ('Ciencias Naturales', '¿Qué gas necesitamos respirar para vivir?', '["Dióxido de carbono","Nitrógeno","Oxígeno","Hidrógeno"]'::jsonb, 2, 'facil'),
  ('Ciencias Naturales', '¿Qué órgano usamos para respirar?', '["Corazón","Pulmones","Estómago","Riñones"]'::jsonb, 1, 'facil'),
  ('Ciencias Naturales', '¿Cómo se le llama a los animales que tienen columna vertebral?', '["Invertebrados","Vertebrados","Mamíferos","Insectos"]'::jsonb, 1, 'media'),
  ('Ciencias Naturales', '¿Cómo se le llama a los animales que NO tienen columna vertebral?', '["Vertebrados","Mamíferos","Invertebrados","Reptiles"]'::jsonb, 2, 'media'),
  ('Ciencias Naturales', '¿Cómo se llama el ciclo en que el agua se evapora, forma nubes y cae como lluvia?', '["Ciclo del carbono","Ciclo del agua","Ciclo de las rocas","Ciclo solar"]'::jsonb, 1, 'media'),
  ('Ciencias Naturales', '¿Cuál es el hueso más largo del cuerpo humano?', '["Húmero","Fémur","Tibia","Cúbito"]'::jsonb, 1, 'dificil'),
  ('Ciencias Naturales', '¿Cuántos sentidos tiene el ser humano de forma tradicional?', '["3","4","5","6"]'::jsonb, 2, 'facil'),
  ('Ciencias Naturales', '¿Cómo se llama la estrella que está en el centro de nuestro sistema solar?', '["La Luna","El Sol","Marte","Una estrella fugaz"]'::jsonb, 1, 'facil'),
  ('Ciencias Naturales', '¿Qué parte de la planta absorbe el agua y los nutrientes del suelo?', '["Hoja","Tallo","Raíz","Flor"]'::jsonb, 2, 'media'),
  ('Ciencias Naturales', '¿Qué gas liberan las plantas durante la fotosíntesis?', '["Dióxido de carbono","Oxígeno","Nitrógeno","Hidrógeno"]'::jsonb, 1, 'media'),
  ('Ciencias Naturales', '¿Cuál es el animal terrestre más grande del mundo?', '["Rinoceronte","Jirafa","Elefante","Hipopótamo"]'::jsonb, 2, 'facil'),
  ('Ciencias Naturales', '¿Cómo se llama la fuerza que hace que las cosas caigan al suelo?', '["Fricción","Magnetismo","Gravedad","Presión"]'::jsonb, 2, 'media'),
  ('Ciencias Naturales', '¿Qué insecto produce miel?', '["Hormiga","Mariposa","Abeja","Mosca"]'::jsonb, 2, 'facil')

) as q(tema_nombre, enunciado, alternativas, correcta, dificultad)
on temas_nuevos.nombre = q.tema_nombre;
