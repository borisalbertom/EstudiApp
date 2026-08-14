import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'

export default function RankingCurso() {
  const { id } = useParams()
  const { perfil } = useAuth()

  const [curso, setCurso] = useState(null)
  const [nombres, setNombres] = useState({})
  const [rankingDuelos, setRankingDuelos] = useState([])
  const [rankingNotas, setRankingNotas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarRanking()
  }, [id])

  async function cargarRanking() {
    setCargando(true)

    const { data: cursoData } = await supabase
      .from('cursos')
      .select('id, nombre, permite_duelos, permite_individual, mostrar_ranking')
      .eq('id', id)
      .single()
    setCurso(cursoData)

    const { data: amistades } = await supabase
      .from('amistades')
      .select('usuario_a, usuario_b')
      .eq('estado', 'aceptada')
      .or(`usuario_a.eq.${perfil.id},usuario_b.eq.${perfil.id}`)

    const idsAmigos = (amistades || []).map((a) => (a.usuario_a === perfil.id ? a.usuario_b : a.usuario_a))
    const ids = [...new Set([perfil.id, ...idsAmigos])]

    const { data: perfiles } = await supabase.from('perfiles').select('id, nombre').in('id', ids)
    const mapaNombres = {}
    for (const p of perfiles || []) mapaNombres[p.id] = p.nombre
    setNombres(mapaNombres)

    if (cursoData?.permite_duelos) {
      const { data } = await supabase.rpc('ranking_duelos_curso', {
        curso_id_param: id,
        usuarios_param: ids,
      })
      setRankingDuelos((data || []).sort((a, b) => b.puntos - a.puntos))
    }

    if (cursoData?.permite_individual) {
      const { data } = await supabase.rpc('ranking_individual_curso', {
        curso_id_param: id,
        usuarios_param: ids,
      })
      setRankingNotas((data || []).sort((a, b) => b.mejor_porcentaje - a.mejor_porcentaje))
    }

    setCargando(false)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6 text-sm text-slate-400">Cargando ranking...</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Link to={`/curso/${id}`} className="text-xs text-slate-400 hover:text-indigo-600">← Volver al curso</Link>
        <h1 className="text-xl font-semibold text-slate-800 mt-2 mb-6">Ranking · {curso?.nombre}</h1>

        {curso?.permite_duelos && (
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-700 mb-2">Ranking de duelos</p>
            {rankingDuelos.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
                Todavía no hay duelos jugados en este curso.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {rankingDuelos.map((r, i) => (
                  <div
                    key={r.usuario_id}
                    className={`bg-white border rounded-xl p-4 flex items-center justify-between ${
                      r.usuario_id === perfil.id ? 'border-indigo-300' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-400 w-5">{i + 1}</span>
                      <div>
                        <p className="text-sm text-slate-800">
                          {nombres[r.usuario_id]} {r.usuario_id === perfil.id && '(tú)'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {r.victorias}V - {r.empates}E - {r.derrotas}D · {r.partidas} partidas
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-indigo-600">{r.puntos} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {curso?.permite_individual && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Ranking de notas</p>
            {rankingNotas.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
                Todavía no hay intentos individuales en este curso.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {rankingNotas.map((r, i) => (
                  <div
                    key={r.usuario_id}
                    className={`bg-white border rounded-xl p-4 flex items-center justify-between ${
                      r.usuario_id === perfil.id ? 'border-indigo-300' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-400 w-5">{i + 1}</span>
                      <div>
                        <p className="text-sm text-slate-800">
                          {nombres[r.usuario_id]} {r.usuario_id === perfil.id && '(tú)'}
                        </p>
                        <p className="text-xs text-slate-400">{r.intentos} intentos</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-indigo-600">{r.mejor_porcentaje}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!curso?.permite_duelos && !curso?.permite_individual && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
            Este curso no tiene duelos ni modo individual activado.
          </div>
        )}
      </main>
    </div>
  )
}
