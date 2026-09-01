import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { elegirPreguntas, mezclarAlternativas } from '../lib/preguntas'
import NavBar from '../components/NavBar'

export default function ExamenCurso() {
  const { cursoId } = useParams()
  const { perfil, recargarPerfil } = useAuth()

  const [curso, setCurso] = useState(null)
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
  }, [cursoId])

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

  async function cargarPreguntas() {
    setCargando(true)
    setError('')

    const [{ data: cursoData }, { data: temasData }] = await Promise.all([
      supabase.from('cursos').select('id, nombre, porcentaje_certificacion, cantidad_preguntas, tiempo_por_pregunta, fecha_fin').eq('id', cursoId).single(),
      supabase.from('temas').select('id').eq('curso_id', cursoId),
    ])
    setCurso(cursoData)

    const hoy = new Date().toISOString().slice(0, 10)
    if (cursoData?.fecha_fin && cursoData.fecha_fin < hoy) {
      setError('Este curso ya no está disponible para rendir el examen.')
      setCargando(false)
      return
    }

    const temaIds = (temasData || []).map((t) => t.id)
    if (temaIds.length === 0) {
      setError('Este curso todavía no tiene contenido cargado.')
      setCargando(false)
      return
    }

    const { data: materialesData } = await supabase
      .from('materiales_tema')
      .select('id')
      .in('tema_id', temaIds)

    if ((materialesData || []).length > 0) {
      const { data: vistosData } = await supabase
        .from('materiales_vistos')
        .select('material_id')
        .eq('usuario_id', perfil.id)
        .in('material_id', materialesData.map((m) => m.id))

      if ((vistosData || []).length < materialesData.length) {
        setError('Debes revisar todo el material de estudio antes de rendir el examen.')
        setCargando(false)
        return
      }
    }

    const cantidadPreguntas = cursoData?.cantidad_preguntas || 5
    const { ids: idsElegidos, error: errorSeleccion } = await elegirPreguntas({
      temaIds,
      dificultad: 'todas',
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
      .select('id, enunciado, alternativas, correcta, imagen_url')
      .in('id', idsElegidos)

    const porId = Object.fromEntries((preguntasElegidas || []).map((p) => [p.id, p]))
    setPreguntas(idsElegidos.map((id) => mezclarAlternativas(porId[id])))
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
      tema_id: null,
      cantidad_preguntas: preguntas.length,
      correctas: totalCorrectas,
    })
    setGuardando(false)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-6 text-sm text-slate-400">Cargando examen...</main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-6">
          <p className="text-sm text-red-500">{error}</p>
          <Link to={`/curso/${cursoId}`} className="text-sm text-brand-blue-700">Volver al curso</Link>
        </main>
      </div>
    )
  }

  if (terminado) {
    const porcentaje = Math.round((correctas / preguntas.length) * 100)
    const aprobado = curso?.porcentaje_certificacion ? porcentaje >= curso.porcentaje_certificacion : null

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
          <p className="text-sm font-medium text-slate-700 mb-4">Resultado del examen — {curso?.nombre}</p>
          <div className="bg-white shadow-sm rounded-2xl p-6 text-center">
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
        <Link to={`/curso/${cursoId}`} className="text-xs text-slate-400 hover:text-brand-blue-700">✕ Salir</Link>
        <div className="flex items-center justify-between mb-1 mt-2">
          <p className="text-xs text-slate-400">
            Examen · {curso?.nombre} · Pregunta {indice + 1} de {preguntas.length}
          </p>
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-brand-blue-700">🎯 {correctas}/{preguntas.length} aciertos</p>
            {curso?.tiempo_por_pregunta > 0 && seleccionada === null && (
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
        </div>
      </main>
    </div>
  )
}
