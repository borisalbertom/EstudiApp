import { supabase } from './supabase'
import { elegirPreguntas } from './preguntas'

export async function crearDuelo({ cursoId, temaId, cantidadPreguntas, dificultad, jugador1Id, jugador2Id }) {
  const { data: curso } = await supabase.from('cursos').select('fecha_fin').eq('id', cursoId).single()
  const hoy = new Date().toISOString().slice(0, 10)
  if (curso?.fecha_fin && curso.fecha_fin < hoy) {
    return { error: 'Este curso ya no está disponible para nuevos duelos.' }
  }

  let consultaExistentes = supabase
    .from('duelos')
    .select('id')
    .eq('curso_id', cursoId)
    .neq('estado', 'finalizado')
    .or(
      `and(jugador_1.eq.${jugador1Id},jugador_2.eq.${jugador2Id}),and(jugador_1.eq.${jugador2Id},jugador_2.eq.${jugador1Id})`
    )
    .limit(1)
  consultaExistentes = temaId
    ? consultaExistentes.eq('tema_id', temaId)
    : consultaExistentes.is('tema_id', null)
  const { data: existentes } = await consultaExistentes

  if (existentes && existentes.length > 0) {
    return { dueloId: existentes[0].id, yaExistia: true }
  }

  let temaIds = [temaId]
  if (!temaId) {
    const { data: temasCurso } = await supabase.from('temas').select('id').eq('curso_id', cursoId)
    temaIds = (temasCurso || []).map((t) => t.id)
  }

  const { ids: elegidas, error: errorPreguntas } = await elegirPreguntas({
    temaIds,
    dificultad,
    cantidad: cantidadPreguntas,
    usuarioId: jugador1Id,
  })

  if (errorPreguntas) {
    return {
      error: temaId
        ? 'Este contenido no tiene preguntas activas con esa dificultad.'
        : 'Este curso no tiene preguntas activas con esa dificultad.',
    }
  }

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
  const { error: errorInsert } = await supabase.from('duelo_preguntas').insert(filas)
  if (errorInsert) return { error: 'No se pudo crear el duelo. Intenta de nuevo.' }

  return { dueloId: duelo.id }
}
