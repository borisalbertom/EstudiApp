import { supabase } from './supabase'

const DIAS_SIN_REPETIR = 14

function mezclar(arr) {
  const copia = [...arr]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

export async function crearDuelo({ cursoId, temaId, cantidadPreguntas, dificultad, jugador1Id, jugador2Id }) {
  let consultaPreguntas = supabase.from('preguntas').select('id').eq('tema_id', temaId).eq('activa', true)
  if (dificultad && dificultad !== 'todas') consultaPreguntas = consultaPreguntas.eq('dificultad', dificultad)
  const { data: preguntasTema } = await consultaPreguntas

  const idsDisponibles = (preguntasTema || []).map((p) => p.id)
  if (idsDisponibles.length === 0) {
    return { error: 'Este tema no tiene preguntas activas con esa dificultad.' }
  }

  const desde = new Date()
  desde.setDate(desde.getDate() - DIAS_SIN_REPETIR)

  const { data: historial } = await supabase
    .from('historial_preguntas')
    .select('pregunta_id')
    .eq('usuario_id', jugador1Id)
    .eq('respondido_bien', true)
    .gte('respondido_en', desde.toISOString())

  const idsRecientes = new Set((historial || []).map((h) => h.pregunta_id))
  let pool = idsDisponibles.filter((pid) => !idsRecientes.has(pid))
  if (pool.length < cantidadPreguntas) pool = idsDisponibles

  const elegidas = mezclar(pool).slice(0, Math.min(cantidadPreguntas, pool.length))

  const { data: duelo, error: errorDuelo } = await supabase
    .from('duelos')
    .insert({
      curso_id: cursoId,
      tema_id: temaId,
      tipo: 'async',
      jugador_1: jugador1Id,
      jugador_2: jugador2Id,
      estado: 'en_curso',
      cantidad_preguntas: elegidas.length,
    })
    .select('id')
    .single()

  if (errorDuelo) return { error: 'No se pudo crear el duelo. Intenta de nuevo.' }

  const filas = elegidas.map((pid, i) => ({ duelo_id: duelo.id, pregunta_id: pid, orden: i + 1 }))
  const { error: errorPreguntas } = await supabase.from('duelo_preguntas').insert(filas)
  if (errorPreguntas) return { error: 'No se pudo crear el duelo. Intenta de nuevo.' }

  return { dueloId: duelo.id }
}
