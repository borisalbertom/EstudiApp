import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'

export default function JugarDuelo() {
  const { id } = useParams()
  const { perfil, recargarPerfil } = useAuth()
  const navigate = useNavigate()

  const [duelo, setDuelo] = useState(null)
  const [preguntas, setPreguntas] = useState([])
  const [yaRespondidas, setYaRespondidas] = useState(new Set())
  const [indice, setIndice] = useState(0)
  const [seleccionada, setSeleccionada] = useState(null)
  const [mostrarResultado, setMostrarResultado] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [inicioPregunta, setInicioPregunta] = useState(null)
  const [error, setError] = useState('')
  const [tiempoPorPregunta, setTiempoPorPregunta] = useState(0)
  const [tiempoRestante, setTiempoRestante] = useState(null)

  useEffect(() => {
    cargarDuelo()
  }, [id])

  useEffect(() => {
    if (mostrarResultado) navigate(`/duelo/${id}/resultado`, { replace: true })
  }, [mostrarResultado])

  useEffect(() => {
    if (!tiempoPorPregunta || seleccionada !== null || cargando || mostrarResultado) {
      return
    }
    setTiempoRestante(tiempoPorPregunta)
    const interval = setInterval(() => {
      setTiempoRestante((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [indice, tiempoPorPregunta, cargando, mostrarResultado])

  useEffect(() => {
    if (tiempoRestante === 0 && seleccionada === null) {
      responder(-1)
    }
  }, [tiempoRestante])

  async function cargarDuelo() {
    setCargando(true)

    const { data: dueloData, error: errorDuelo } = await supabase
      .from('duelos')
      .select('id, curso_id, tema_id, jugador_1, jugador_2, estado, cantidad_preguntas')
      .eq('id', id)
      .single()

    if (errorDuelo || !dueloData) {
      setError('No se pudo cargar el duelo.')
      setCargando(false)
      return
    }

    const { data: cursoData } = await supabase
      .from('cursos')
      .select('tiempo_por_pregunta')
      .eq('id', dueloData.curso_id)
      .single()
    setTiempoPorPregunta(cursoData?.tiempo_por_pregunta || 0)

    const { data: preguntasData } = await supabase
      .from('duelo_preguntas')
      .select('orden, pregunta_id, preguntas(id, enunciado, alternativas, correcta)')
      .eq('duelo_id', id)
      .order('orden', { ascending: true })

    const { data: misRespuestas } = await supabase
      .from('respuestas')
      .select('pregunta_id')
      .eq('duelo_id', id)
      .eq('usuario_id', perfil.id)

    const respondidas = new Set((misRespuestas || []).map((r) => r.pregunta_id))
    const lista = (preguntasData || []).map((p) => p.preguntas)

    setDuelo(dueloData)
    setPreguntas(lista)
    setYaRespondidas(respondidas)

    const primeraSinResponder = lista.findIndex((p) => !respondidas.has(p.id))
    if (primeraSinResponder === -1) {
      setMostrarResultado(true)
    } else {
      setIndice(primeraSinResponder)
      setInicioPregunta(Date.now())
    }

    setCargando(false)
  }

  async function responder(alternativaIndex) {
    if (enviando) return
    setEnviando(true)
    setSeleccionada(alternativaIndex)

    const pregunta = preguntas[indice]
    const esCorrecta = alternativaIndex === pregunta.correcta
    const tiempoMs = inicioPregunta ? Date.now() - inicioPregunta : null

    const { error: errorRespuesta } = await supabase.from('respuestas').insert({
      duelo_id: id,
      usuario_id: perfil.id,
      pregunta_id: pregunta.id,
      alternativa_elegida: alternativaIndex,
      es_correcta: esCorrecta,
      tiempo_respuesta_ms: tiempoMs,
    })

    if (errorRespuesta) {
      setError('No se pudo guardar tu respuesta. Intenta de nuevo.')
      setEnviando(false)
      return
    }

    await supabase.from('historial_preguntas').insert({
      usuario_id: perfil.id,
      pregunta_id: pregunta.id,
      respondido_bien: esCorrecta,
    })

    setTimeout(() => siguientePregunta(), 700)
  }

  async function siguientePregunta() {
    const siguienteIndice = indice + 1

    if (siguienteIndice >= preguntas.length) {
      await verificarSiAmbosTerminaron()
      recargarPerfil()
      setMostrarResultado(true)
      return
    }

    setIndice(siguienteIndice)
    setSeleccionada(null)
    setEnviando(false)
    setInicioPregunta(Date.now())
  }

  async function verificarSiAmbosTerminaron() {
    const otroJugador = duelo.jugador_1 === perfil.id ? duelo.jugador_2 : duelo.jugador_1

    const { count } = await supabase
      .from('respuestas')
      .select('id', { count: 'exact', head: true })
      .eq('duelo_id', id)
      .eq('usuario_id', otroJugador)

    if ((count || 0) >= duelo.cantidad_preguntas) {
      await supabase
        .from('duelos')
        .update({ estado: 'finalizado', finalizado_en: new Date().toISOString() })
        .eq('id', id)
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6 text-sm text-slate-400">Cargando duelo...</main>
      </div>
    )
  }

  if (error && !duelo) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-sm text-red-500">{error}</p>
          <Link to="/" className="text-sm text-indigo-600">Volver al inicio</Link>
        </main>
      </div>
    )
  }

  if (mostrarResultado) return null

  const pregunta = preguntas[indice]

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-slate-400">
            Pregunta {indice + 1} de {preguntas.length}
          </p>
          {tiempoPorPregunta > 0 && seleccionada === null && (
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

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

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
