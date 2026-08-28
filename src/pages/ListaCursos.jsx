import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'

// Vista compartida por /cursos, /pruebas y /trivias — misma infraestructura
// (tabla cursos, inscripciones_curso), filtrada por permite_individual /
// permite_practica_individual y con el copy ajustado a cada tipo.
export default function ListaCursos({ tipo }) {
  // tipo: 'curso' (certificación) | 'prueba' (duelos + práctica) | 'trivia' (solo duelos)
  const { perfil } = useAuth()
  const [asignados, setAsignados] = useState([])
  const [misCursos, setMisCursos] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busquedaMisCursos, setBusquedaMisCursos] = useState('')
  const [busquedaCatalogo, setBusquedaCatalogo] = useState('')
  const [inscribiendo, setInscribiendo] = useState(null)
  const [confirmandoAbandono, setConfirmandoAbandono] = useState(null)

  function coincideTipo(curso) {
    if (!curso) return false
    if (tipo === 'curso') return curso.permite_individual
    if (tipo === 'prueba') return !curso.permite_individual && curso.permite_practica_individual
    return !curso.permite_individual && !curso.permite_practica_individual
  }

  useEffect(() => {
    cargarDatos()
  }, [tipo])

  async function cargarDatos() {
    setCargando(true)
    const hoy = new Date().toISOString().slice(0, 10)

    let consultaPublicos = supabase
      .from('cursos')
      .select('id, nombre, descripcion, fecha_fin')
      .eq('visibilidad', 'publico')
      .eq('permite_individual', tipo === 'curso')
    if (tipo !== 'curso') consultaPublicos = consultaPublicos.eq('permite_practica_individual', tipo === 'prueba')
    consultaPublicos = consultaPublicos
      .or(`fecha_fin.is.null,fecha_fin.gte.${hoy}`)
      .order('creado_en', { ascending: false })

    const [{ data: inscripciones }, { data: publicosData }] = await Promise.all([
      supabase
        .from('inscripciones_curso')
        .select(
          'curso_id, estado, visto, cursos(id, nombre, descripcion, visibilidad, permite_individual, permite_practica_individual, fecha_fin, organizaciones(nombre_empresa))'
        )
        .eq('usuario_id', perfil.id),
      consultaPublicos,
    ])

    const propios = (inscripciones || []).filter((i) => coincideTipo(i.cursos))
    const idsInscritos = new Set(propios.map((i) => i.curso_id))
    const idsAsignadosNuevos = propios.filter((i) => i.estado === 'asignado' && !i.visto).map((i) => i.curso_id)

    setMisCursos(propios.map((i) => i.cursos).filter((c) => c && (!c.fecha_fin || c.fecha_fin >= hoy)))
    setCatalogo((publicosData || []).filter((c) => !idsInscritos.has(c.id)))
    setCargando(false)

    if (idsAsignadosNuevos.length > 0) {
      const { data: cursosAsignados } = await supabase
        .from('cursos')
        .select('id, nombre, descripcion, organizaciones(nombre_empresa)')
        .in('id', idsAsignadosNuevos)
      setAsignados(cursosAsignados || [])

      await supabase
        .from('inscripciones_curso')
        .update({ visto: true })
        .eq('usuario_id', perfil.id)
        .eq('estado', 'asignado')
        .eq('visto', false)
        .in('curso_id', idsAsignadosNuevos)
    } else {
      setAsignados([])
    }
  }

  async function abandonarCurso(cursoId) {
    const { error } = await supabase
      .from('inscripciones_curso')
      .delete()
      .eq('curso_id', cursoId)
      .eq('usuario_id', perfil.id)
    setConfirmandoAbandono(null)
    if (!error) setMisCursos((prev) => prev.filter((c) => c.id !== cursoId))
  }

  async function inscribirse(cursoId) {
    setInscribiendo(cursoId)
    const { error } = await supabase
      .from('inscripciones_curso')
      .insert({ curso_id: cursoId, usuario_id: perfil.id, estado: 'inscrito', visto: true })
    if (!error) {
      const curso = catalogo.find((c) => c.id === cursoId)
      setCatalogo((prev) => prev.filter((c) => c.id !== cursoId))
      if (curso) setMisCursos((prev) => [...prev, { ...curso, visibilidad: 'publico' }])
    }
    setInscribiendo(null)
  }

  const misCursosFiltrados = misCursos.filter((c) =>
    c.nombre.toLowerCase().includes(busquedaMisCursos.trim().toLowerCase())
  )
  const catalogoFiltrado = catalogo.filter((c) =>
    c.nombre.toLowerCase().includes(busquedaCatalogo.trim().toLowerCase())
  )

  const titulo = tipo === 'curso' ? 'Cursos' : tipo === 'prueba' ? 'Pruebas' : 'Trivias'
  const singular = tipo === 'curso' ? 'curso' : tipo === 'prueba' ? 'prueba' : 'trivia'

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
        <div className="flex items-center justify-between mb-4">
          <p className="text-lg font-medium text-slate-800">{titulo}</p>
          {tipo !== 'curso' && (
            <Link
              to={`/admin?crear=${tipo}`}
              className="text-xs bg-brand-blue-500 text-white px-3 py-1.5 rounded-full font-semibold"
            >
              + Crear {singular}
            </Link>
          )}
        </div>

        {asignados.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-700 mb-2">🆕 Te han asignado un {singular}</p>
            <div className="flex flex-col gap-2">
              {asignados.map((c) => (
                <Link
                  key={c.id}
                  to={`/curso/${c.id}`}
                  className="bg-white border-[1.5px] border-brand-amber-500 rounded-2xl p-4 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-brand-amber-50 flex items-center justify-center shrink-0">🆕</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800">{c.nombre}</p>
                    <p className="text-xs text-slate-500">Privado · {c.organizaciones?.nombre_empresa || 'Empresa'}</p>
                  </div>
                  <span className="text-xs bg-brand-blue-500 text-white px-2.5 py-1 rounded-full font-semibold">
                    {tipo === 'trivia' ? 'Ingresar' : 'Ver'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {cargando && <p className="text-sm text-slate-400">Cargando {titulo.toLowerCase()}...</p>}

        <p className="text-sm font-medium text-slate-700 mb-2">Mis {titulo.toLowerCase()}</p>

        {!cargando && misCursos.length === 0 && (
          <div className="bg-white shadow-sm rounded-2xl p-4 text-sm text-slate-500 mb-6">
            Todavía no estás inscrito en ningún {singular} — inscríbete abajo.
          </div>
        )}

        {misCursos.length > 1 && (
          <input
            type="text"
            value={busquedaMisCursos}
            onChange={(e) => setBusquedaMisCursos(e.target.value)}
            placeholder={`Buscar en mis ${titulo.toLowerCase()}`}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
          />
        )}

        {misCursos.length > 0 && (
          <div className="flex flex-col gap-2 mb-6">
            {misCursosFiltrados.map((c) => (
              <div key={c.id} className="bg-white shadow-sm rounded-2xl p-4 flex items-center gap-3">
                <Link to={`/curso/${c.id}`} className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{c.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {c.visibilidad === 'publico'
                      ? 'Público'
                      : c.organizaciones?.nombre_empresa
                        ? `Privado · ${c.organizaciones.nombre_empresa}`
                        : 'Privado'}
                    {(tipo !== 'trivia' || c.fecha_fin) && (
                      <> · {c.fecha_fin ? `Vence ${c.fecha_fin}` : 'Sin fecha límite'}</>
                    )}
                  </p>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  {c.visibilidad === 'publico' && (
                    confirmandoAbandono === c.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">¿Seguro?</span>
                        <button
                          onClick={() => abandonarCurso(c.id)}
                          className="text-xs text-red-600 font-medium"
                        >
                          Sí, abandonar
                        </button>
                        <button
                          onClick={() => setConfirmandoAbandono(null)}
                          className="text-xs text-slate-400"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmandoAbandono(c.id)}
                        className="text-xs text-slate-400 hover:text-red-500"
                      >
                        Abandonar
                      </button>
                    )
                  )}
                  <Link
                    to={`/curso/${c.id}`}
                    className="text-xs bg-white text-brand-blue-700 border-[1.5px] border-brand-blue-500 px-2.5 py-1 rounded-full font-semibold"
                  >
                    {tipo === 'trivia' ? 'Ingresar' : 'Ver'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm font-medium text-slate-700 mb-2">{titulo} por inscribirme</p>

        <input
          type="text"
          value={busquedaCatalogo}
          onChange={(e) => setBusquedaCatalogo(e.target.value)}
          placeholder={`Buscar ${singular} por nombre`}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
        />

        {!cargando && catalogo.length === 0 && (
          <div className="bg-white shadow-sm rounded-2xl p-4 text-sm text-slate-500">
            No hay {titulo.toLowerCase()} gratis nuevas disponibles — ya estás inscrito en todas.
          </div>
        )}

        {!cargando && catalogo.length > 0 && catalogoFiltrado.length === 0 && (
          <div className="bg-white shadow-sm rounded-2xl p-4 text-sm text-slate-500">
            No hay {titulo.toLowerCase()} que calcen con tu búsqueda.
          </div>
        )}

        <div className="flex flex-col gap-2">
          {catalogoFiltrado.map((c) => (
            <div key={c.id} className="bg-white shadow-sm rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-800">{c.nombre}</p>
                <p className="text-xs text-slate-500">
                  Público
                  {(tipo !== 'trivia' || c.fecha_fin) && (
                    <> · {c.fecha_fin ? `Vence ${c.fecha_fin}` : 'Sin fecha límite'}</>
                  )}
                </p>
              </div>
              <button
                onClick={() => inscribirse(c.id)}
                disabled={inscribiendo === c.id}
                className="text-xs bg-brand-blue-500 text-white px-3 py-1.5 rounded-full font-semibold disabled:opacity-50 shrink-0"
              >
                {inscribiendo === c.id ? 'Inscribiendo...' : 'Inscribirme'}
              </button>
            </div>
          ))}
        </div>
        </div>
      </main>
    </div>
  )
}
