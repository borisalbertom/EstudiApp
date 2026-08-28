import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { mezclarAlternativas } from '../lib/preguntas'
import NavBar from '../components/NavBar'

// Modo "juego de mesa": varios amigos o equipos juegan mirando la misma
// pantalla — todos ven la pregunta, pero solo responde a quien le toca el
// turno. No queda historial ni afecta racha/logros de nadie, es solo para
// jugar en el momento. Evita repetir preguntas ya usadas en la misma sesión
// de juego (se resetea si el pool se agota).

function mezclar(arr) {
  const copia = [...arr]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

export default function JuegoLocal() {
  const { id } = useParams()
  const { perfil } = useAuth()

  const [curso, setCurso] = useState(null)
  const [cargando, setCargando] = useState(true)

  const [fase, setFase] = useState('configurar') // 'configurar' | 'pregunta' | 'resultado'
  const [modo, setModo] = useState('individual') // 'individual' | 'equipos'
  const [cantidadPreguntas, setCantidadPreguntas] = useState(5)
  const [segundosPorPregunta, setSegundosPorPregunta] = useState(15)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [jugadores, setJugadores] = useState(() => (perfil?.nombre ? [{ nombre: perfil.nombre, puntaje: 0 }] : []))
  const [error, setError] = useState('')
  const [cargandoPreguntas, setCargandoPreguntas] = useState(false)
  const [usadasIds, setUsadasIds] = useState(new Set())

  const [preguntas, setPreguntas] = useState([])
  const [indicePregunta, setIndicePregunta] = useState(0)
  const [seleccionada, setSeleccionada] = useState(null)
  const [tiempoRestante, setTiempoRestante] = useState(null)

  useEffect(() => {
    cargarCurso()
  }, [id])

  useEffect(() => {
    if (fase !== 'pregunta' || seleccionada !== null) return
    setTiempoRestante(segundosPorPregunta)
    const interval = setInterval(() => {
      setTiempoRestante((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [indicePregunta, fase, seleccionada])

  useEffect(() => {
    if (tiempoRestante === 0 && seleccionada === null && fase === 'pregunta') {
      responder(-1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiempoRestante])

  async function cargarCurso() {
    setCargando(true)
    const { data } = await supabase
      .from('cursos')
      .select('id, nombre, cantidad_preguntas, fecha_fin')
      .eq('id', id)
      .single()
    setCurso(data)
    setCantidadPreguntas(data?.cantidad_preguntas || 5)
    setCargando(false)
  }

  function agregarJugador(e) {
    e.preventDefault()
    const nombre = nombreNuevo.trim()
    if (!nombre) return
    setJugadores((prev) => [...prev, { nombre, puntaje: 0 }])
    setNombreNuevo('')
  }

  function quitarJugador(i) {
    setJugadores((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function comenzar() {
    setCargandoPreguntas(true)
    setError('')

    const { data: temasData } = await supabase.from('temas').select('id').eq('curso_id', id)
    const temaIds = (temasData || []).map((t) => t.id)
    const cantidad = cantidadPreguntas || 5

    const { data: disponibles } = await supabase
      .from('preguntas')
      .select('id')
      .in('tema_id', temaIds)
      .eq('activa', true)

    if (!disponibles || disponibles.length === 0) {
      setError('No hay preguntas activas con esos filtros.')
      setCargandoPreguntas(false)
      return
    }

    let pool = disponibles.filter((p) => !usadasIds.has(p.id))
    if (pool.length < cantidad) pool = disponibles

    const ids = mezclar(pool.map((p) => p.id)).slice(0, cantidad)
    setUsadasIds((prev) => new Set([...prev, ...ids]))

    const { data: preguntasData } = await supabase
      .from('preguntas')
      .select('id, enunciado, alternativas, correcta')
      .in('id', ids)

    const porId = Object.fromEntries((preguntasData || []).map((p) => [p.id, p]))
    setPreguntas(ids.map((pid) => mezclarAlternativas(porId[pid])))
    setIndicePregunta(0)
    setSeleccionada(null)
    setCargandoPreguntas(false)
    setFase('pregunta')
  }

  function jugadorActual() {
    return jugadores[indicePregunta % jugadores.length]
  }

  function responder(alternativaIndex) {
    if (seleccionada !== null) return
    setSeleccionada(alternativaIndex)

    const pregunta = preguntas[indicePregunta]
    if (alternativaIndex === pregunta.correcta) {
      const idx = indicePregunta % jugadores.length
      setJugadores((prev) => prev.map((j, i) => (i === idx ? { ...j, puntaje: j.puntaje + 1 } : j)))
    }

    setTimeout(() => siguiente(), 1200)
  }

  function siguiente() {
    const siguienteIndice = indicePregunta + 1
    if (siguienteIndice >= preguntas.length) {
      setFase('resultado')
      return
    }
    setIndicePregunta(siguienteIndice)
    setSeleccionada(null)
  }

  function jugarDeNuevo() {
    setJugadores((prev) => prev.map((j) => ({ ...j, puntaje: 0 })))
    setFase('configurar')
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6 text-sm text-slate-400">Cargando...</main>
      </div>
    )
  }

  if (!curso) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-sm text-slate-500">No se encontró la trivia.</p>
        </main>
      </div>
    )
  }

  const hoy = new Date().toISOString().slice(0, 10)
  const vencido = curso.fecha_fin && curso.fecha_fin < hoy
  const etiqueta = modo === 'equipos' ? 'equipo' : 'jugador'
  const etiquetaPlural = modo === 'equipos' ? 'equipos' : 'jugadores'
  const turnoIdx = jugadores.length > 0 ? indicePregunta % jugadores.length : 0

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
        <Link to={`/curso/${id}`} className="text-xs text-slate-400 hover:text-brand-blue-700">← Volver a la trivia</Link>
        <h1 className="text-xl font-semibold text-slate-800 mt-2 mb-4">🎉 {curso.nombre} — juego local</h1>

        {vencido && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            Esta trivia ya no está disponible — venció el {curso.fecha_fin}.
          </div>
        )}

        {!vencido && fase === 'configurar' && (
          <div className="bg-white shadow-sm rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModo('individual')}
                className={`flex-1 text-sm rounded-full py-2 font-semibold ${
                  modo === 'individual' ? 'bg-brand-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Jugadores
              </button>
              <button
                type="button"
                onClick={() => setModo('equipos')}
                className={`flex-1 text-sm rounded-full py-2 font-semibold ${
                  modo === 'equipos' ? 'bg-brand-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Equipos
              </button>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2 capitalize">
                {modo === 'equipos' ? 'Equipos' : 'Jugadores'}
              </p>
              <form onSubmit={agregarJugador} className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Nombre del ${etiqueta}`}
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <button type="submit" className="bg-white text-brand-blue-700 border-[1.5px] border-brand-blue-500 rounded-full px-4 text-sm font-semibold">
                  Agregar
                </button>
              </form>

              {jugadores.length === 0 && (
                <p className="text-xs text-slate-400 mt-2">Agrega al menos 2 {etiquetaPlural} para empezar.</p>
              )}

              {jugadores.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-3">
                  {jugadores.map((j, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-slate-700">{j.nombre}</span>
                      <button onClick={() => quitarJugador(i)} className="text-xs text-slate-400 hover:text-red-500">
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="text-xs text-slate-500">
              Preguntas por intento
              <input
                type="number"
                min={1}
                max={50}
                value={cantidadPreguntas}
                onChange={(e) => setCantidadPreguntas(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </label>

            <label className="text-xs text-slate-500">
              Segundos por pregunta (para meter presión)
              <input
                type="number"
                min={5}
                max={60}
                value={segundosPorPregunta}
                onChange={(e) => setSegundosPorPregunta(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </label>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              onClick={comenzar}
              disabled={jugadores.length < 2 || cargandoPreguntas}
              className="bg-brand-blue-500 text-white rounded-full py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {cargandoPreguntas ? 'Preparando...' : 'Comenzar juego'}
            </button>
          </div>
        )}

        {fase === 'pregunta' && (
          <>
            <div className="bg-white shadow-sm rounded-2xl p-2 mb-3">
              <div className="flex flex-wrap gap-2">
                {jugadores.map((j, i) => (
                  <div
                    key={i}
                    className={`flex-1 min-w-[90px] rounded-lg px-3 py-2 text-center ${
                      i === turnoIdx ? 'bg-brand-blue-500 text-white' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    <p className="text-xs font-medium truncate">{j.nombre}</p>
                    <p className="text-xl font-bold leading-tight">{j.puntaje}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400">Pregunta {indicePregunta + 1} de {preguntas.length}</p>
              <p className="text-sm font-medium text-brand-blue-700">🎯 Responde: {jugadorActual()?.nombre}</p>
            </div>

            <div className="text-center mb-3">
              <p className={`text-5xl font-bold ${tiempoRestante <= 5 ? 'text-red-600' : 'text-brand-blue-700'}`}>
                {tiempoRestante}
              </p>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full transition-all ${tiempoRestante <= 5 ? 'bg-red-600' : 'bg-brand-blue-500'}`}
                  style={{ width: `${((tiempoRestante ?? segundosPorPregunta) / segundosPorPregunta) * 100}%` }}
                />
              </div>
            </div>

            {seleccionada === -1 && (
              <p className="text-xs text-amber-600 mb-3 text-center">⏱ Se acabó el tiempo para esta pregunta.</p>
            )}

            <div className="bg-white shadow-sm rounded-2xl p-5">
              <p className="font-medium text-slate-800 mb-4">{preguntas[indicePregunta]?.enunciado}</p>
              <div className="flex flex-col gap-2">
                {preguntas[indicePregunta]?.alternativas?.map((alt, i) => {
                  const pregunta = preguntas[indicePregunta]
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
          </>
        )}

        {fase === 'resultado' && (
          <div className="bg-white shadow-sm rounded-2xl p-5">
            <p className="text-sm font-medium text-slate-700 mb-3 text-center">🏁 Resultados</p>
            <div className="flex flex-col gap-2">
              {[...jugadores]
                .sort((a, b) => b.puntaje - a.puntaje)
                .map((j, i, ordenados) => {
                  const esGanador = i === 0 && j.puntaje > (ordenados[1]?.puntaje ?? -1)
                  return (
                    <div
                      key={j.nombre + i}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                        esGanador ? 'bg-brand-blue-50 border border-brand-blue-500/30' : 'bg-slate-50'
                      }`}
                    >
                      <span className="text-sm text-slate-700">
                        {esGanador ? '🏆 ' : `${i + 1}. `}
                        {j.nombre}
                      </span>
                      <span className="text-sm font-medium text-slate-800">{j.puntaje}/{preguntas.length}</span>
                    </div>
                  )
                })}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={jugarDeNuevo}
                className="flex-1 text-center bg-brand-blue-500 text-white text-sm rounded-full font-semibold py-2"
              >
                Jugar de nuevo
              </button>
              <Link
                to={`/curso/${id}`}
                className="flex-1 text-center bg-white text-brand-blue-700 border-[1.5px] border-brand-blue-500 text-sm rounded-full font-semibold py-2"
              >
                Volver a la trivia
              </Link>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  )
}
