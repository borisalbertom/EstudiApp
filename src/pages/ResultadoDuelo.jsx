import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { crearDuelo } from '../lib/duelos'
import NavBar from '../components/NavBar'

export default function ResultadoDuelo() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const navigate = useNavigate()

  const [duelo, setDuelo] = useState(null)
  const [jugador1, setJugador1] = useState(null)
  const [jugador2, setJugador2] = useState(null)
  const [puntaje1, setPuntaje1] = useState(0)
  const [puntaje2, setPuntaje2] = useState(0)
  const [respondio1, setRespondio1] = useState(0)
  const [respondio2, setRespondio2] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [creandoRevancha, setCreandoRevancha] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarResultado()
  }, [id])

  async function cargarResultado() {
    setCargando(true)

    const { data: dueloData } = await supabase
      .from('duelos')
      .select('id, curso_id, tema_id, jugador_1, jugador_2, estado, cantidad_preguntas, abandonado_por')
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

  async function pedirRevancha() {
    const rivalId = perfil.id === duelo.jugador_1 ? duelo.jugador_2 : duelo.jugador_1
    setCreandoRevancha(true)
    setError('')

    const { dueloId, error: errorCreacion } = await crearDuelo({
      cursoId: duelo.curso_id,
      temaId: duelo.tema_id,
      cantidadPreguntas: duelo.cantidad_preguntas,
      dificultad: 'todas',
      jugador1Id: perfil.id,
      jugador2Id: rivalId,
    })

    if (errorCreacion) {
      setError(errorCreacion)
      setCreandoRevancha(false)
      return
    }

    navigate(`/duelo/${dueloId}`)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-6 text-sm text-slate-400">Cargando resultado...</main>
      </div>
    )
  }

  if (!duelo) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-6">
          <p className="text-sm text-slate-500">No se encontró el duelo.</p>
          <Link to="/" className="text-sm text-brand-blue-700">Volver al inicio</Link>
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

  const abandonoJugador1 = duelo.abandonado_por === duelo.jugador_1
  const abandonoJugador2 = duelo.abandonado_por === duelo.jugador_2

  const ganoJugador1 = duelo.abandonado_por
    ? abandonoJugador2
    : terminoJugador1 && terminoJugador2 && puntaje1 !== puntaje2
      ? puntaje1 > puntaje2
      : null

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
        <p className="text-sm font-medium text-slate-700 mb-4">Resultado del duelo</p>

        <div className="bg-white shadow-sm rounded-2xl p-5">
          <div className="grid grid-cols-2 gap-4">
            <TarjetaJugador
              nombre={jugador1?.nombre}
              puntaje={puntaje1}
              total={total}
              termino={terminoJugador1}
              esGanador={ganoJugador1 === true}
              esYo={soyJugador1}
              abandono={abandonoJugador1}
              rivalAbandono={abandonoJugador2}
            />
            <TarjetaJugador
              nombre={jugador2?.nombre}
              puntaje={puntaje2}
              total={total}
              termino={terminoJugador2}
              esGanador={ganoJugador1 === false}
              esYo={!soyJugador1}
              abandono={abandonoJugador2}
              rivalAbandono={abandonoJugador1}
            />
          </div>

          {duelo.abandonado_por && (
            <p className="text-xs text-slate-500 text-center mt-5 font-medium">
              🏳️ Duelo terminado por abandono
            </p>
          )}

          {!duelo.abandonado_por && !rivalTermino && (
            <p className="text-xs text-slate-400 text-center mt-5">
              Esperando a que tu rival responda para conocer al ganador.
            </p>
          )}

          {!duelo.abandonado_por && terminoJugador1 && terminoJugador2 && ganoJugador1 === null && (
            <p className="text-xs text-slate-500 text-center mt-5 font-medium">¡Empate! 🤝</p>
          )}

          {!duelo.abandonado_por && !yoTermine && (
            <Link
              to={`/duelo/${id}`}
              className="block text-center bg-brand-blue-500 text-white text-sm rounded-full font-semibold py-2 mt-5"
            >
              Continuar respondiendo
            </Link>
          )}

          {error && <p className="text-xs text-red-500 text-center mt-3">{error}</p>}

          <button
            onClick={pedirRevancha}
            disabled={creandoRevancha}
            className="w-full text-center bg-white text-brand-blue-700 border-[1.5px] border-brand-blue-500 text-sm rounded-full font-semibold py-2 mt-3 disabled:opacity-50"
          >
            {creandoRevancha ? 'Creando revancha...' : '🔁 Revancha'}
          </button>
        </div>

        <Link to="/" className="block text-center text-xs text-slate-400 hover:text-brand-blue-700 mt-4">
          Volver al inicio
        </Link>
        </div>
      </main>
    </div>
  )
}

function TarjetaJugador({ nombre, puntaje, total, termino, esGanador, esYo, abandono, rivalAbandono }) {
  return (
    <div
      className={`rounded-lg p-4 text-center border ${
        esGanador ? 'border-brand-blue-500 bg-brand-blue-50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <p className="text-xs text-slate-500 mb-1">
        {nombre} {esYo && '(tú)'}
      </p>
      <p className="text-2xl font-semibold text-slate-800">
        {abandono ? '🏳️' : termino ? `${puntaje}/${total}` : '—'}
      </p>
      {abandono && <p className="text-xs text-slate-400 mt-1">Abandonó</p>}
      {!abandono && !termino && (
        <p className="text-xs text-slate-400 mt-1">{rivalAbandono ? 'No alcanzó a responder' : 'Sin responder aún'}</p>
      )}
      {esGanador && <p className="text-xs text-brand-blue-700 mt-1 font-medium">🏆 Ganador</p>}
    </div>
  )
}
