import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { elegirPreguntas, mezclarAlternativas } from '../lib/preguntas'
import NavBar from '../components/NavBar'

export default function PracticaIndividual() {
  const { cursoId, temaId } = useParams()
  const [searchParams] = useSearchParams()
  const dificultad = searchParams.get('dificultad') || 'todas'
  const { perfil, recargarPerfil } = useAuth()

  const [curso, setCurso] = useState(null)
  const [tema, setTema] = useState(null)
  const [preguntas, setPreguntas] = useState([])
  const [indice, setIndice] = useState(0)
  const [correctas, setCorrectas] = useState(0)
  const [seleccionada, setSeleccionada] = useState(null)
  const [terminado, setTerminado] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [tiempoRestante, setTiempoRestante] = useState(null)
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0)
  const [inicioPregunta, setInicioPregunta] = useState(null)
  const [tiempos, setTiempos] = useState([])

  const tiempoPorPreguntaEfectivo = tema?.tiempo_por_pregunta ?? curso?.tiempo_por_pregunta ?? 0

  useEffect(() => {
    cargarPreguntas()
  }, [temaId])

  useEffect(() => {
    if (!tiempoPorPreguntaEfectivo || seleccionada !== null || cargando || terminado) {
      return
    }
    setTiempoRestante(tiempoPorPreguntaEfectivo)
    const interval = setInterval(() => {
      setTiempoRestante((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [indice, tiempoPorPreguntaEfectivo, cargando, terminado])

  useEffect(() => {
    if (tiempoRestante === 0 && seleccionada === null) {
      responder(-1)
    }
  }, [tiempoRestante])

  useEffect(() => {
    if (tiempoPorPreguntaEfectivo || seleccionada !== null || cargando || terminado) {
      return
    }
    setTiempoTranscurrido(0)
    const interval = setInterval(() => {
      setTiempoTranscurrido((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [indice, tiempoPorPreguntaEfectivo, cargando, terminado])

  async function cargarPreguntas() {
    setCargando(true)
    setError('')

    const { data: cursoData } = await supabase
      .from('cursos')
      .select('id, nombre, porcentaje_certificacion, cantidad_preguntas, tiempo_por_pregunta, fecha_fin')
      .eq('id', cursoId)
      .single()
    setCurso(cursoData)

    let temaIds = []
    if (temaId) {
      const { data: temaData } = await supabase
        .from('temas')
        .select('id, nombre, tiempo_por_pregunta')
        .eq('id', temaId)
        .single()
      setTema(temaData)
      temaIds = [temaId]
    } else {
      const { data: temasData } = await supabase.from('temas').select('id').eq('curso_id', cursoId)
      temaIds = (temasData || []).map((t) => t.id)
    }

    const hoy = new Date().toISOString().slice(0, 10)
    if (cursoData?.fecha_fin && cursoData.fecha_fin < hoy) {
      setError('Este curso ya no está disponible para practicar.')
      setCargando(false)
      return
    }

    if (temaIds.length === 0) {
      setError('Este curso todavía no tiene contenido cargado.')
      setCargando(false)
      return
    }

    const cantidadPreguntas = cursoData?.cantidad_preguntas || 5
    const { ids: idsElegidos, error: errorSeleccion } = await elegirPreguntas({
      temaIds,
      dificultad,
      cantidad: cantidadPreguntas,
      usuarioId: perfil.id,
    })

    if (errorSeleccion) {
      setError(errorSeleccion)
      setCargando(false)
      return
    }

    const { data: preguntasElegidas } = await supabase
      .from('preguntas')
      .select('id, enunciado, alternativas, correcta')
      .in('id', idsElegidos)

    const porId = Object.fromEntries((preguntasElegidas || []).map((p) => [p.id, p]))
    setPreguntas(idsElegidos.map((id) => mezclarAlternativas(porId[id])))
    setTiempos([])
    setInicioPregunta(Date.now())
    setCargando(false)
  }

  async function responder(alternativaIndex) {
    if (seleccionada !== null) return
    setSeleccionada(alternativaIndex)

    const pregunta = preguntas[indice]
    const esCorrecta = alternativaIndex === pregunta.correcta
    const nuevasCorrectas = correctas + (esCorrecta ? 1 : 0)
    setCorrectas(nuevasCorrectas)

    const tiempoMs = inicioPregunta ? Date.now() - inicioPregunta : null
    const nuevosTiempos = tiempoMs != null ? [...tiempos, tiempoMs] : tiempos
    setTiempos(nuevosTiempos)

    await supabase.from('historial_preguntas').insert({
      usuario_id: perfil.id,
      pregunta_id: pregunta.id,
      respondido_bien: esCorrecta,
    })

    setTimeout(() => siguientePregunta(nuevasCorrectas, nuevosTiempos), 700)
  }

  async function siguientePregunta(correctasActualizadas, tiemposActualizados) {
    const siguienteIndice = indice + 1

    if (siguienteIndice >= preguntas.length) {
      await guardarIntento(correctasActualizadas, tiemposActualizados)
      recargarPerfil()
      setTerminado(true)
      return
    }

    setIndice(siguienteIndice)
    setSeleccionada(null)
    setInicioPregunta(Date.now())
  }

  async function guardarIntento(totalCorrectas, tiemposFinales) {
    setGuardando(true)
    const promedioMs = tiemposFinales.length
      ? Math.round(tiemposFinales.reduce((a, b) => a + b, 0) / tiemposFinales.length)
      : null
    await supabase.from('intentos_individuales').insert({
      usuario_id: perfil.id,
      curso_id: cursoId,
      tema_id: temaId || null,
      cantidad_preguntas: preguntas.length,
      correctas: totalCorrectas,
      tiempo_promedio_ms: promedioMs,
    })
    setGuardando(false)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6 text-sm text-slate-400">Cargando...</main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-sm text-red-500">{error}</p>
          <Link to={`/curso/${cursoId}`} className="text-sm text-brand-blue-700">Volver al curso</Link>
        </main>
      </div>
    )
  }

  if (terminado) {
    const porcentaje = Math.round((correctas / preguntas.length) * 100)
    const aprobado = curso?.porcentaje_certificacion ? porcentaje >= curso.porcentaje_certificacion : null
    const promedioSeg = tiempos.length
      ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length / 1000)
      : null

    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6 relative">
          <div
            className="absolute inset-x-0 top-0 h-28 pointer-events-none"
            style={{
              background:
                'radial-gradient(80% 100% at 15% 0%, rgba(0,175,242,0.12), rgba(0,0,0,0) 70%), ' +
                'radial-gradient(70% 100% at 100% 0%, rgba(255,187,0,0.12), rgba(0,0,0,0) 65%)',
            }}
          />

          <div className="relative">
          <p className="text-sm font-medium text-slate-700 mb-4">Resultado — {(temaId ? tema?.nombre : 'Todos los contenidos')}</p>
          <div className="bg-white shadow-sm rounded-2xl p-6 text-center">
            <p className="text-3xl font-semibold text-slate-800">{correctas}/{preguntas.length}</p>
            <p className="text-sm text-slate-500 mt-1">{porcentaje}% de respuestas correctas</p>
            {promedioSeg != null && (
              <p className="text-sm text-slate-500 mt-1">⏱ Promedio: {promedioSeg}s por pregunta</p>
            )}

            {curso?.porcentaje_certificacion != null && (
              <p className={`text-sm mt-3 font-medium ${aprobado ? 'text-green-600' : 'text-red-500'}`}>
                {aprobado
                  ? `✅ Aprobado (mínimo ${curso.porcentaje_certificacion}%)`
                  : `No alcanzaste el mínimo de ${curso.porcentaje_certificacion}%`}
              </p>
            )}

            {guardando && <p className="text-xs text-slate-400 mt-2">Guardando...</p>}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                setIndice(0)
                setCorrectas(0)
                setSeleccionada(null)
                setTerminado(false)
                cargarPreguntas()
              }}
              className="flex-1 text-center bg-brand-blue-500 text-white text-sm rounded-full font-semibold py-2"
            >
              Intentar de nuevo
            </button>
            <Link
              to={`/curso/${cursoId}`}
              className="flex-1 text-center bg-white text-brand-blue-700 border-[1.5px] border-brand-blue-500 text-sm rounded-full font-semibold py-2"
            >
              Volver al curso
            </Link>
          </div>
          </div>
        </main>
      </div>
    )
  }

  const pregunta = preguntas[indice]

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6 relative">
        <div
          className="absolute inset-x-0 top-0 h-28 pointer-events-none"
          style={{
            background:
              'radial-gradient(80% 100% at 15% 0%, rgba(0,175,242,0.12), rgba(0,0,0,0) 70%), ' +
              'radial-gradient(70% 100% at 100% 0%, rgba(255,187,0,0.12), rgba(0,0,0,0) 65%)',
          }}
        />

        <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-slate-400">
            {(temaId ? tema?.nombre : 'Todos los contenidos')} · Pregunta {indice + 1} de {preguntas.length}
          </p>
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-brand-blue-700">🎯 {correctas}/{preguntas.length} aciertos</p>
            {tiempoPorPreguntaEfectivo > 0 && seleccionada === null && (
              <p className={`text-sm font-medium ${tiempoRestante <= 5 ? 'text-red-500' : 'text-slate-500'}`}>
                ⏱ {tiempoRestante}s
              </p>
            )}
            {tiempoPorPreguntaEfectivo === 0 && seleccionada === null && (
              <p className="text-sm font-medium text-slate-400">⏱ {tiempoTranscurrido}s</p>
            )}
          </div>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1.5 mb-6">
          <div
            className="bg-brand-blue-500 h-1.5 rounded-full transition-all"
            style={{ width: `${((indice + (seleccionada !== null ? 1 : 0)) / preguntas.length) * 100}%` }}
          />
        </div>

        {seleccionada === -1 && (
          <p className="text-xs text-amber-600 mb-3">⏱ Se acabó el tiempo para esta pregunta.</p>
        )}

        <div className="bg-white shadow-sm rounded-2xl p-5">
          <p className="font-medium text-slate-800 mb-4">{pregunta?.enunciado}</p>

          <div className="flex flex-col gap-2">
            {pregunta?.alternativas?.map((alt, i) => {
              const esLaCorrecta = i === pregunta.correcta
              const esLaSeleccionada = i === seleccionada
              let estilo = 'border-slate-200 hover:border-brand-blue-500/50 hover:bg-brand-blue-50'

              if (seleccionada !== null) {
                if (esLaCorrecta) estilo = 'border-green-400 bg-green-50 text-green-700'
                else if (esLaSeleccionada) estilo = 'border-red-400 bg-red-50 text-red-700'
                else estilo = 'border-slate-200 opacity-60'
              }

              return (
                <button
                  key={i}
                  disabled={seleccionada !== null}
                  onClick={() => responder(i)}
                  className={`text-left border rounded-lg px-4 py-3 text-sm transition-colors ${estilo}`}
                >
                  {alt}
                </button>
              )
            })}
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}
