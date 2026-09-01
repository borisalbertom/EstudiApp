import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { mezclarAlternativas } from '../lib/preguntas'
import NavBar from '../components/NavBar'

export default function JugarDuelo() {
  const { id } = useParams()
  const { perfil, recargarPerfil } = useAuth()
  const navigate = useNavigate()

  const [duelo, setDuelo] = useState(null)
  const [rivalNombre, setRivalNombre] = useState('')
  const [preguntas, setPreguntas] = useState([])
  const [yaRespondidas, setYaRespondidas] = useState(new Set())
  const [indice, setIndice] = useState(0)
  const [correctas, setCorrectas] = useState(0)
  const [rivalRespondidas, setRivalRespondidas] = useState(0)
  const [rivalCorrectas, setRivalCorrectas] = useState(0)
  const [esperandoRival, setEsperandoRival] = useState(false)
  const [actualizando, setActualizando] = useState(false)
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
    if (!tiempoPorPregunta || seleccionada !== null || cargando || mostrarResultado || esperandoRival) {
      return
    }
    setTiempoRestante(tiempoPorPregunta)
    const interval = setInterval(() => {
      setTiempoRestante((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [indice, tiempoPorPregunta, cargando, mostrarResultado, esperandoRival])

  useEffect(() => {
    if (tiempoRestante === 0 && seleccionada === null) {
      responder(-1)
    }
  }, [tiempoRestante])

  async function cargarDuelo() {
    setCargando(true)

    const { data: dueloData, error: errorDuelo } = await supabase
      .from('duelos')
      .select(
        'id, curso_id, tema_id, jugador_1, jugador_2, estado, cantidad_preguntas, tiempo_por_pregunta, perfil_1:jugador_1(nombre), perfil_2:jugador_2(nombre)'
      )
      .eq('id', id)
      .single()

    if (errorDuelo || !dueloData) {
      setError('No se pudo cargar el duelo.')
      setCargando(false)
      return
    }

    const rivalId = dueloData.jugador_1 === perfil.id ? dueloData.jugador_2 : dueloData.jugador_1
    setRivalNombre((dueloData.jugador_1 === perfil.id ? dueloData.perfil_2 : dueloData.perfil_1)?.nombre || 'tu rival')

    const [{ data: cursoData }, { data: temaData }] = await Promise.all([
      supabase.from('cursos').select('tiempo_por_pregunta').eq('id', dueloData.curso_id).single(),
      dueloData.tema_id
        ? supabase.from('temas').select('tiempo_por_pregunta').eq('id', dueloData.tema_id).single()
        : Promise.resolve({ data: null }),
    ])
    setTiempoPorPregunta(dueloData.tiempo_por_pregunta ?? temaData?.tiempo_por_pregunta ?? cursoData?.tiempo_por_pregunta ?? 0)

    const { data: preguntasData } = await supabase
      .from('duelo_preguntas')
      .select('orden, pregunta_id, preguntas(id, enunciado, alternativas, correcta, imagen_url)')
      .eq('duelo_id', id)
      .order('orden', { ascending: true })

    const [{ data: misRespuestas }, { data: respuestasRival }] = await Promise.all([
      supabase.from('respuestas').select('pregunta_id, es_correcta').eq('duelo_id', id).eq('usuario_id', perfil.id),
      supabase.from('respuestas').select('pregunta_id, es_correcta').eq('duelo_id', id).eq('usuario_id', rivalId),
    ])

    const respondidas = new Set((misRespuestas || []).map((r) => r.pregunta_id))
    const lista = (preguntasData || []).map((p) => mezclarAlternativas(p.preguntas))
    const respondidasRival = (respuestasRival || []).length

    setDuelo(dueloData)
    setPreguntas(lista)
    setYaRespondidas(respondidas)
    setCorrectas((misRespuestas || []).filter((r) => r.es_correcta).length)
    setRivalRespondidas(respondidasRival)
    setRivalCorrectas((respuestasRival || []).filter((r) => r.es_correcta).length)

    const primeraSinResponder = lista.findIndex((p) => !respondidas.has(p.id))
    if (primeraSinResponder === -1) {
      setMostrarResultado(true)
    } else if (dueloData.estado === 'en_curso' && primeraSinResponder > respondidasRival) {
      setIndice(primeraSinResponder)
      setEsperandoRival(true)
    } else {
      setIndice(primeraSinResponder)
      setInicioPregunta(Date.now())
    }

    setCargando(false)
  }

  async function consultarProgresoRival() {
    const rivalId = duelo.jugador_1 === perfil.id ? duelo.jugador_2 : duelo.jugador_1
    const { data } = await supabase
      .from('respuestas')
      .select('es_correcta')
      .eq('duelo_id', id)
      .eq('usuario_id', rivalId)

    const respondidasRival = (data || []).length
    setRivalRespondidas(respondidasRival)
    setRivalCorrectas((data || []).filter((r) => r.es_correcta).length)
    return respondidasRival
  }

  async function actualizarEsperando() {
    setActualizando(true)
    const respondidasRival = await consultarProgresoRival()
    if (indice <= respondidasRival) {
      setEsperandoRival(false)
      setInicioPregunta(Date.now())
    }
    setActualizando(false)
  }

  async function responder(alternativaIndex) {
    if (enviando) return
    setEnviando(true)
    setSeleccionada(alternativaIndex)

    const pregunta = preguntas[indice]
    const esCorrecta = alternativaIndex === pregunta.correcta
    const tiempoMs = inicioPregunta ? Date.now() - inicioPregunta : null

    if (esCorrecta) setCorrectas((prev) => prev + 1)

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

    if (duelo.estado === 'en_curso') {
      const respondidasRival = await consultarProgresoRival()
      if (siguienteIndice > respondidasRival) {
        setEsperandoRival(true)
        return
      }
    }

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
      <div className="min-h-screen bg-white">
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-6 text-sm text-slate-400">Cargando duelo...</main>
      </div>
    )
  }

  if (error && !duelo) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-6">
          <p className="text-sm text-red-500">{error}</p>
          <Link to="/" className="text-sm text-brand-blue-700">Volver al inicio</Link>
        </main>
      </div>
    )
  }

  if (mostrarResultado) return null

  const pregunta = preguntas[indice]

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-6 relative">
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
            Pregunta {indice + 1} de {preguntas.length}
          </p>
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-slate-500">
              🎯 Tú <span className="text-brand-blue-700">{correctas}</span> · {rivalNombre}{' '}
              <span className="text-slate-700">{rivalCorrectas}</span>
            </p>
            {tiempoPorPregunta > 0 && seleccionada === null && !esperandoRival && (
              <p className={`text-sm font-medium ${tiempoRestante <= 5 ? 'text-red-500' : 'text-slate-500'}`}>
                ⏱ {tiempoRestante}s
              </p>
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

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        {esperandoRival ? (
          <div className="bg-white shadow-sm rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-brand-amber-50 flex items-center justify-center text-2xl mx-auto mb-3">⏳</div>
            <p className="font-medium text-slate-800 mb-1">Le llevas ventaja a {rivalNombre}</p>
            <p className="text-sm text-slate-500 mb-5">
              Para que el duelo sea parejo, espera a que responda para seguir con la siguiente pregunta.
            </p>
            <button
              onClick={actualizarEsperando}
              disabled={actualizando}
              className="bg-brand-blue-500 text-white text-sm rounded-full px-5 py-2 font-semibold disabled:opacity-50"
            >
              {actualizando ? 'Revisando...' : 'Actualizar'}
            </button>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-2xl p-5">
            {pregunta?.imagen_url && (
              <img src={pregunta.imagen_url} alt="" className="max-w-full rounded-lg mb-4 border border-slate-100" />
            )}
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
        )}
        </div>
      </main>
    </div>
  )
}
