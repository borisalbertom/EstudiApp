import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'
import AdminSubNav from '../components/AdminSubNav'

export default function AdminCursos() {
  const { perfil, orgsAdmin } = useAuth()
  const esSuperAdmin = perfil?.es_admin_plataforma || false
  const [cursos, setCursos] = useState([])
  const [organizaciones, setOrganizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [visibilidad, setVisibilidad] = useState(esSuperAdmin ? 'publico' : 'privado')
  const [organizacionId, setOrganizacionId] = useState('')
  const [tipoCurso, setTipoCurso] = useState('prueba') // 'certificacion' | 'prueba' | 'trivia'
  const [activarDuelosCert, setActivarDuelosCert] = useState(false)
  const [fechaFinDuelos, setFechaFinDuelos] = useState('')
  const [mostrarRanking, setMostrarRanking] = useState(true)
  const [cantidadPreguntas, setCantidadPreguntas] = useState(5)
  const [porcentajeCertificacion, setPorcentajeCertificacion] = useState(70)
  const [tiempoPorPregunta, setTiempoPorPregunta] = useState(0)
  const [fechaFin, setFechaFin] = useState('')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('curso') // 'curso' | 'prueba' | 'trivia'

  useEffect(() => {
    cargarCursos()
    cargarOrganizaciones()
  }, [])

  function abrirFormulario(tipo) {
    setTipoCurso(tipo)
    setMostrarFormulario(true)
  }

  async function cargarCursos() {
    let consulta = supabase
      .from('cursos')
      .select('id, nombre, visibilidad, organizacion_id, fecha_fin, permite_individual, permite_practica_individual, organizaciones(nombre_empresa)')
      .order('creado_en', { ascending: false })
    if (!esSuperAdmin) consulta = consulta.in('organizacion_id', orgsAdmin)
    const { data } = await consulta
    setCursos(data || [])
    setCargando(false)
  }

  async function cargarOrganizaciones() {
    let consulta = supabase.from('organizaciones').select('id, nombre_empresa')
    if (!esSuperAdmin) consulta = consulta.in('id', orgsAdmin)
    const { data } = await consulta
    setOrganizaciones(data || [])
    if (!esSuperAdmin && data?.length === 1) setOrganizacionId(data[0].id)
  }

  async function crearCurso(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    if (!esSuperAdmin && !organizacionId) {
      setError('Selecciona una organización.')
      return
    }
    setCreando(true)
    setError('')

    const visibilidadFinal = esSuperAdmin ? visibilidad : 'privado'

    const { error } = await supabase.from('cursos').insert({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      visibilidad: visibilidadFinal,
      organizacion_id: visibilidadFinal === 'privado' ? organizacionId || null : null,
      creado_por: perfil.id,
      permite_duelos: tipoCurso !== 'certificacion' || activarDuelosCert,
      permite_individual: tipoCurso === 'certificacion',
      permite_practica_individual: tipoCurso === 'prueba',
      mostrar_ranking: mostrarRanking,
      cantidad_preguntas: cantidadPreguntas,
      porcentaje_certificacion: porcentajeCertificacion,
      tiempo_por_pregunta: tiempoPorPregunta,
      fecha_fin: fechaFin || null,
      fecha_fin_duelos: tipoCurso === 'certificacion' && activarDuelosCert
        ? (fechaFinDuelos && (!fechaFin || fechaFinDuelos <= fechaFin) ? fechaFinDuelos : fechaFin || null)
        : null,
    })

    if (error) setError('No se pudo crear la actividad.')
    else {
      setNombre('')
      setDescripcion('')
      setVisibilidad(esSuperAdmin ? 'publico' : 'privado')
      setOrganizacionId(!esSuperAdmin && organizaciones.length === 1 ? organizaciones[0].id : '')
      setTipoCurso('prueba')
      setActivarDuelosCert(false)
      setFechaFinDuelos('')
      setMostrarRanking(true)
      setCantidadPreguntas(5)
      setPorcentajeCertificacion(70)
      setTiempoPorPregunta(0)
      setFechaFin('')
      setMostrarFormulario(false)
      cargarCursos()
    }
    setCreando(false)
  }

  if (!esSuperAdmin && orgsAdmin.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-sm text-slate-500">No tienes permisos para ver esta página.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-lg font-medium text-slate-800 mb-4">Administrar actividades</p>
        <AdminSubNav />

        {!mostrarFormulario && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          <button
            onClick={() => abrirFormulario('certificacion')}
            className="bg-white border border-dashed border-indigo-300 text-indigo-600 rounded-xl p-3 text-sm font-medium hover:bg-indigo-50"
          >
            + Crear curso
          </button>
          <button
            onClick={() => abrirFormulario('prueba')}
            className="bg-white border border-dashed border-indigo-300 text-indigo-600 rounded-xl p-3 text-sm font-medium hover:bg-indigo-50"
          >
            + Crear prueba
          </button>
          <button
            onClick={() => abrirFormulario('trivia')}
            className="bg-white border border-dashed border-indigo-300 text-indigo-600 rounded-xl p-3 text-sm font-medium hover:bg-indigo-50"
          >
            + Crear trivia
          </button>
        </div>
        )}

        {mostrarFormulario && (
        <form onSubmit={crearCurso} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              {tipoCurso === 'certificacion' && 'Nuevo curso'}
              {tipoCurso === 'prueba' && 'Nueva prueba'}
              {tipoCurso === 'trivia' && 'Nueva trivia'}
            </p>
            <button type="button" onClick={() => setMostrarFormulario(false)} className="text-xs text-slate-400 hover:text-red-500">
              ✕ Cancelar
            </button>
          </div>

          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />
          <textarea
            placeholder="Descripción (opcional)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            rows={2}
          />
          {esSuperAdmin && (
            <div className="flex gap-4 text-sm text-slate-600">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={visibilidad === 'publico'}
                  onChange={() => setVisibilidad('publico')}
                />
                Público (gratis)
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={visibilidad === 'privado'}
                  onChange={() => setVisibilidad('privado')}
                />
                Privado (empresa)
              </label>
            </div>
          )}

          {(esSuperAdmin ? visibilidad === 'privado' : true) && (
            <select
              value={organizacionId}
              onChange={(e) => setOrganizacionId(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Selecciona una empresa</option>
              {organizaciones.map((o) => (
                <option key={o.id} value={o.id}>{o.nombre_empresa}</option>
              ))}
            </select>
          )}

          <label className="text-xs text-slate-500 border-t border-slate-100 pt-3">
            Preguntas por intento (duelos y modo individual)
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
            Tiempo por pregunta en segundos (0 = sin límite)
            <input
              type="number"
              min={0}
              max={600}
              value={tiempoPorPregunta}
              onChange={(e) => setTiempoPorPregunta(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </label>

          <label className="text-xs text-slate-500">
            Fecha límite (vacío = sin fecha de término)
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </label>

          <div className="flex flex-col gap-2 text-sm text-slate-600">
            {tipoCurso === 'certificacion' && (
              <>
                <label className="text-xs text-slate-500 ml-5">
                  % para aprobar en el modo individual
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={porcentajeCertificacion}
                    onChange={(e) => setPorcentajeCertificacion(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 ml-5">
                  <input
                    type="checkbox"
                    checked={activarDuelosCert}
                    onChange={(e) => setActivarDuelosCert(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  Permitir duelos durante un periodo (para practicar antes del examen)
                </label>
                {activarDuelosCert && (
                  <>
                    <label className="text-xs text-slate-500 ml-8">
                      Fecha límite de duelos (vacío = sin límite; no puede ser posterior al examen)
                      <input
                        type="date"
                        value={fechaFinDuelos}
                        max={fechaFin || undefined}
                        onChange={(e) => setFechaFinDuelos(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
                      />
                    </label>
                  </>
                )}
              </>
            )}

            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={mostrarRanking}
                onChange={(e) => setMostrarRanking(e.target.checked)}
                className="accent-indigo-600"
              />
              Mostrar ranking
            </label>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={creando}
            className="bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {creando ? 'Creando...' : 'Crear actividad'}
          </button>
        </form>
        )}

        <div className="flex items-center gap-4 border-b border-slate-200 mb-4 text-sm">
          {[
            { id: 'curso', label: 'Cursos' },
            { id: 'prueba', label: 'Pruebas' },
            { id: 'trivia', label: 'Trivias' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltroTipo(f.id)}
              className={`pb-2 border-b-2 -mb-px ${
                filtroTipo === f.id
                  ? 'border-indigo-600 text-indigo-600 font-medium'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {cargando && <p className="text-sm text-slate-400">Cargando...</p>}

        <div className="flex flex-col gap-2">
          {cursos
            .filter((c) => {
              if (filtroTipo === 'curso') return c.permite_individual
              if (filtroTipo === 'prueba') return !c.permite_individual && c.permite_practica_individual
              return !c.permite_individual && !c.permite_practica_individual
            })
            .map((c) => {
            const vencido = c.fecha_fin && c.fecha_fin < new Date().toISOString().slice(0, 10)
            return (
              <Link
                key={c.id}
                to={`/admin/curso/${c.id}`}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-indigo-300"
              >
                <div>
                  <p className="font-medium text-slate-800">{c.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {c.visibilidad === 'publico' ? 'Público' : `Privado · ${c.organizaciones?.nombre_empresa || 'Empresa'}`}
                    {c.fecha_fin && ` · ${vencido ? 'Vencido' : 'Vence'} ${c.fecha_fin}`}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-md shrink-0 ${
                    vencido ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
                  }`}
                >
                  {vencido ? 'Vencido' : 'Gestionar'}
                </span>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
