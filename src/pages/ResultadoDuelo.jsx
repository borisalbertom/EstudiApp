import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'

export default function ResultadoDuelo() {
  const { id } = useParams()
  const { perfil } = useAuth()

  const [duelo, setDuelo] = useState(null)
  const [jugador1, setJugador1] = useState(null)
  const [jugador2, setJugador2] = useState(null)
  const [puntaje1, setPuntaje1] = useState(0)
  const [puntaje2, setPuntaje2] = useState(0)
  const [respondio1, setRespondio1] = useState(0)
  const [respondio2, setRespondio2] = useState(0)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarResultado()
  }, [id])

  async function cargarResultado() {
    setCargando(true)

    const { data: dueloData } = await supabase
      .from('duelos')
      .select('id, jugador_1, jugador_2, estado, cantidad_preguntas')
      .eq('id', id)
      .single()

    if (!dueloData) {
      setCargando(false)
      return
    }

    const [{ data: perfil1 }, { data: perfil2 }, { data: respuestas }] = await Promise.all([
      supabase.from('perfiles').select('id, nombre').eq('id', dueloData.jugador_1).single(),
      supabase.from('perfiles').select('id, nombre').eq('id', dueloData.jugador_2).single(),
      supabase.from('respuestas').select('usuario_id, es_correcta').eq('duelo_id', id),
    ])

    let p1 = 0, p2 = 0, r1 = 0, r2 = 0
    for (const r of respuestas || []) {
      if (r.usuario_id === dueloData.jugador_1) {
        r1++
        if (r.es_correcta) p1++
      } else if (r.usuario_id === dueloData.jugador_2) {
        r2++
        if (r.es_correcta) p2++
      }
    }

    setDuelo(dueloData)
    setJugador1(perfil1)
    setJugador2(perfil2)
    setPuntaje1(p1)
    setPuntaje2(p2)
    setRespondio1(r1)
    setRespondio2(r2)
    setCargando(false)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6 text-sm text-slate-400">Cargando resultado...</main>
      </div>
    )
  }

  if (!duelo) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-sm text-slate-500">No se encontró el duelo.</p>
          <Link to="/" className="text-sm text-indigo-600">Volver al inicio</Link>
        </main>
      </div>
    )
  }

  const total = duelo.cantidad_preguntas
  const terminoJugador1 = respondio1 >= total
  const terminoJugador2 = respondio2 >= total
  const soyJugador1 = perfil.id === duelo.jugador_1
  const yoTermine = soyJugador1 ? terminoJugador1 : terminoJugador2
  const rivalTermino = soyJugador1 ? terminoJugador2 : terminoJugador1

  const ganoJugador1 = terminoJugador1 && terminoJugador2 && puntaje1 !== puntaje2 ? puntaje1 > puntaje2 : null

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm font-medium text-slate-700 mb-4">Resultado del duelo</p>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="grid grid-cols-2 gap-4">
            <TarjetaJugador
              nombre={jugador1?.nombre}
              puntaje={puntaje1}
              total={total}
              termino={terminoJugador1}
              esGanador={ganoJugador1 === true}
              esYo={soyJugador1}
            />
            <TarjetaJugador
              nombre={jugador2?.nombre}
              puntaje={puntaje2}
              total={total}
              termino={terminoJugador2}
              esGanador={ganoJugador1 === false}
              esYo={!soyJugador1}
            />
          </div>

          {!rivalTermino && (
            <p className="text-xs text-slate-400 text-center mt-5">
              Esperando a que tu rival responda para conocer al ganador.
            </p>
          )}

          {terminoJugador1 && terminoJugador2 && ganoJugador1 === null && (
            <p className="text-xs text-slate-500 text-center mt-5 font-medium">¡Empate! 🤝</p>
          )}

          {!yoTermine && (
            <Link
              to={`/duelo/${id}`}
              className="block text-center bg-indigo-600 text-white text-sm rounded-lg py-2 mt-5"
            >
              Continuar respondiendo
            </Link>
          )}
        </div>

        <Link to="/" className="block text-center text-xs text-slate-400 hover:text-indigo-600 mt-4">
          Volver al inicio
        </Link>
      </main>
    </div>
  )
}

function TarjetaJugador({ nombre, puntaje, total, termino, esGanador, esYo }) {
  return (
    <div
      className={`rounded-lg p-4 text-center border ${
        esGanador ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <p className="text-xs text-slate-500 mb-1">
        {nombre} {esYo && '(tú)'}
      </p>
      <p className="text-2xl font-semibold text-slate-800">
        {termino ? `${puntaje}/${total}` : '—'}
      </p>
      {!termino && <p className="text-xs text-slate-400 mt-1">Sin responder aún</p>}
      {esGanador && <p className="text-xs text-indigo-600 mt-1 font-medium">🏆 Ganador</p>}
    </div>
  )
}
