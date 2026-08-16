import { supabase } from './supabase'
import { elegirPreguntas } from './preguntas'

export async function crearDuelo({ cursoId, temaId, cantidadPreguntas, dificultad, jugador1Id, jugador2Id }) {
  const { data: existentes } = await supabase
    .from('duelos')
    .select('id')
    .eq('curso_id', cursoId)
    .eq('tema_id', temaId)
    .neq('estado', 'finalizado')
    .or(
      `and(jugador_1.eq.${jugador1Id},jugador_2.eq.${jugador2Id}),and(jugador_1.eq.${jugador2Id},jugador_2.eq.${jugador1Id})`
    )
    .limit(1)

  if (existentes && existentes.length > 0) {
    return { dueloId: existentes[0].id, yaExistia: true }
  }

  const { ids: elegidas, error: errorPreguntas } = await elegirPreguntas({
    temaIds: [temaId],
    dificultad,
    cantidad: cantidadPreguntas,
    usuarioId: jugador1Id,
  })

  if (errorPreguntas) {
    return { error: 'Este tema no tiene preguntas activas con esa dificultad.' }
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
