import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'

const DIAS_SIN_REPETIR = 14

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

  useEffect(() => {
    cargarPreguntas()
  }, [temaId])

  useEffect(() => {
    const tiempoPorPregunta = curso?.tiempo_por_pregunta || 0
    if (!tiempoPorPregunta || seleccionada !== null || cargando || terminado) {
      return
    }
    setTiempoRestante(tiempoPorPregunta)
    const interval = setInterval(() => {
      setTiempoRestante((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [indice, curso, cargando, terminado])

  useEffect(() => {
    if (tiempoRestante === 0 && seleccionada === null) {
      responder(-1)
    }
  }, [tiempoRestante])

  function mezclar(arr) {
    const copia = [...arr]
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
    }
    return copia
  }

  async function cargarPreguntas() {
    setCargando(true)
    setError('')

    const [{ data: cursoData }, { data: temaData }] = await Promise.all([
      supabase.from('cursos').select('id, nombre, porcentaje_certificacion, cantidad_preguntas, tiempo_por_pregunta').eq('id', cursoId).single(),
      supabase.from('temas').select('id, nombre').eq('id', temaId).single(),
    ])
    setCurso(cursoData)
    setTema(temaData)

    let consultaPreguntas = supabase
      .from('preguntas')
      .select('id, enunciado, alternativas, correcta')
      .eq('tema_id', temaId)
      .eq('activa', true)
    if (dificultad !== 'todas') consultaPreguntas = consultaPreguntas.eq('dificultad', dificultad)
    const { data: preguntasTema } = await consultaPreguntas

    const idsDisponibles = preguntasTema || []
    if (idsDisponibles.length === 0) {
      setError('Este tema no tiene preguntas activas con esa dificultad.')
      setCargando(false)
      return
    }

    const desde = new Date()
    desde.setDate(desde.getDate() - DIAS_SIN_REPETIR)

    const { data: historial } = await supabase
      .from('historial_preguntas')
      .select('pregunta_id')
      .eq('usuario_id', perfil.id)
      .eq('respondido_bien', true)
      .gte('respondido_en', desde.toISOString())

    const cantidadPreguntas = cursoData?.cantidad_preguntas || 5
    const idsRecientes = new Set((historial || []).map((h) => h.pregunta_id))
    let pool = idsDisponibles.filter((p) => !idsRecientes.has(p.id))
    if (pool.length < cantidadPreguntas) pool = idsDisponibles

    const elegidas = mezclar(pool).slice(0, Math.min(cantidadPreguntas, pool.length))
    setPreguntas(elegidas)
    setCargando(false)
  }

  async function responder(alternativaIndex) {
    if (seleccionada !== null) return
    setSeleccionada(alternativaIndex)

    const pregunta = preguntas[indice]
    const esCorrecta = alternativaIndex === pregunta.correcta
    const nuevasCorrectas = correctas + (esCorrecta ? 1 : 0)
    setCorrectas(nuevasCorrectas)

    await supabase.from('historial_preguntas').insert({
      usuario_id: perfil.id,
      pregunta_id: pregunta.id,
      respondido_bien: esCorrecta,
    })

    setTimeout(() => siguientePregunta(nuevasCorrectas), 700)
  }

  async function siguientePregunta(correctasActualizadas) {
    const siguienteIndice = indice + 1

    if (siguienteIndice >= preguntas.length) {
      await guardarIntento(correctasActualizadas)
      recargarPerfil()
      setTerminado(true)
      return
    }

    setIndice(siguienteIndice)
    setSeleccionada(null)
  }

  async function guardarIntento(totalCorrectas) {
    setGuardando(true)
    await supabase.from('intentos_individuales').insert({
      usuario_id: perfil.id,
      curso_id: cursoId,
      tema_id: temaId,
      cantidad_preguntas: preguntas.length,
      correctas: totalCorrectas,
    })
    setGuardando(false)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6 text-sm text-slate-400">Cargando...</main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-sm text-red-500">{error}</p>
          <Link to={`/curso/${cursoId}`} className="text-sm text-indigo-600">Volver al curso</Link>
        </main>
      </div>
    )
  }

  if (terminado) {
    const porcentaje = Math.round((correctas / preguntas.length) * 100)
    const aprobado = curso?.porcentaje_certificacion ? porcentaje >= curso.porcentaje_certificacion : null

    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-sm font-medium text-slate-700 mb-4">Resultado — {tema?.nombre}</p>
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
            <p className="text-3xl font-semibold text-slate-800">{correctas}/{preguntas.length}</p>
            <p className="text-sm text-slate-500 mt-1">{porcentaje}% de respuestas correctas</p>

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
              className="flex-1 text-center bg-indigo-600 text-white text-sm rounded-lg py-2"
            >
              Intentar de nuevo
            </button>
            <Link
              to={`/curso/${cursoId}`}
              className="flex-1 text-center bg-slate-100 text-slate-600 text-sm rounded-lg py-2"
            >
              Volver al curso
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const pregunta = preguntas[indice]

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-slate-400">
            {tema?.nombre} · Pregunta {indice + 1} de {preguntas.length}
          </p>
          {curso?.tiempo_por_pregunta > 0 && seleccionada === null && (
            <p className={`text-sm font-medium ${tiempoRestante <= 5 ? 'text-red-500' : 'text-slate-500'}`}>
              ⏱ {tiempoRestante}s
            </p>
          )}
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1.5 mb-6">
          <div
            className="bg-indigo-600 h-1.5 rounded-full transition-all"
            style={{ width: `${((indice + (seleccionada !== null ? 1 : 0)) / preguntas.length) * 100}%` }}
          />
        </div>

        {seleccionada === -1 && (
          <p className="text-xs text-amber-600 mb-3">⏱ Se acabó el tiempo para esta pregunta.</p>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="font-medium text-slate-800 mb-4">{pregunta?.enunciado}</p>

          <div className="flex flex-col gap-2">
            {pregunta?.alternativas?.map((alt, i) => {
              const esLaCorrecta = i === pregunta.correcta
              const esLaSeleccionada = i === seleccionada
              let estilo = 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'

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
      </main>
    </div>
  )
}
