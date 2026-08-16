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

// Elige preguntas activas de uno o varios temas, evitando (cuando se
// puede) las que el usuario ya respondió bien en los últimos días.
// Si hay más de un tema, reparte parejo entre ellos en vez de tomar
// todo al azar del pool combinado (para que un examen no quede
// cargado hacia el tema con más preguntas).
export async function elegirPreguntas({ temaIds, dificultad, cantidad, usuarioId }) {
  let consulta = supabase.from('preguntas').select('id, tema_id').in('tema_id', temaIds).eq('activa', true)
  if (dificultad && dificultad !== 'todas') consulta = consulta.eq('dificultad', dificultad)
  const { data: disponibles } = await consulta

  if (!disponibles || disponibles.length === 0) {
    return { error: 'No hay preguntas activas con esos filtros.' }
  }

  const desde = new Date()
  desde.setDate(desde.getDate() - DIAS_SIN_REPETIR)

  const { data: historial } = await supabase
    .from('historial_preguntas')
    .select('pregunta_id')
    .eq('usuario_id', usuarioId)
    .eq('respondido_bien', true)
    .gte('respondido_en', desde.toISOString())

  const idsRecientes = new Set((historial || []).map((h) => h.pregunta_id))
  let pool = disponibles.filter((p) => !idsRecientes.has(p.id))
  if (pool.length < cantidad) pool = disponibles

  const porTema = {}
  for (const p of pool) {
    if (!porTema[p.tema_id]) porTema[p.tema_id] = []
    porTema[p.tema_id].push(p.id)
  }
  const grupos = Object.values(porTema).map(mezclar)

  const elegidas = []
  let i = 0
  while (elegidas.length < cantidad && grupos.some((g) => g.length > i)) {
    for (const g of grupos) {
      if (g[i] && elegidas.length < cantidad) elegidas.push(g[i])
    }
    i++
  }

  return { ids: mezclar(elegidas) }
}
