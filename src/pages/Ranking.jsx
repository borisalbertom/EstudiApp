import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'

export default function Ranking() {
  const { perfil } = useAuth()
  const [posiciones, setPosiciones] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarRanking()
  }, [])

  async function cargarRanking() {
    setCargando(true)

    const { data: amistades } = await supabase
      .from('amistades')
      .select('usuario_a, usuario_b')
      .or(`usuario_a.eq.${perfil.id},usuario_b.eq.${perfil.id}`)

    const idsAmigos = (amistades || []).map((a) => (a.usuario_a === perfil.id ? a.usuario_b : a.usuario_a))
    const ids = [...new Set([perfil.id, ...idsAmigos])]

    const { data } = await supabase
      .from('perfiles')
      .select('id, nombre, puntos_totales')
      .in('id', ids)
      .order('puntos_totales', { ascending: false })

    setPosiciones(data || [])
    setCargando(false)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm font-medium text-slate-700 mb-2">Ranking con amigos</p>

        {cargando && <p className="text-sm text-slate-400">Cargando ranking...</p>}

        {!cargando && posiciones.length <= 1 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
            Agrega amigos y juega duelos para ver el ranking acá.
          </div>
        )}

        {!cargando && posiciones.length > 1 && (
          <div className="flex flex-col gap-2">
            {posiciones.map((p, i) => (
              <div
                key={p.id}
                className={`bg-white border rounded-xl p-4 flex items-center justify-between ${
                  p.id === perfil.id ? 'border-indigo-300' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-400 w-5">{i + 1}</span>
                  <span className="text-sm text-slate-800">
                    {p.nombre} {p.id === perfil.id && '(tú)'}
                  </span>
                </div>
                <span className="text-sm font-medium text-indigo-600">{p.puntos_totales} pts</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
