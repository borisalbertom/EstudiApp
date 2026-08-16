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
  const [tipoCurso, setTipoCurso] = useState('retos') // 'retos' | 'certificacion'
  const [dueloTodoCurso, setDueloTodoCurso] = useState(false)
  const [mostrarRanking, setMostrarRanking] = useState(true)
  const [cantidadPreguntas, setCantidadPreguntas] = useState(5)
  const [porcentajeCertificacion, setPorcentajeCertificacion] = useState(70)
  const [tiempoPorPregunta, setTiempoPorPregunta] = useState(0)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  useEffect(() => {
    cargarCursos()
    cargarOrganizaciones()
  }, [])

  async function cargarCursos() {
    let consulta = supabase
      .from('cursos')
      .select('id, nombre, visibilidad, organizacion_id, organizaciones(nombre_empresa)')
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
      permite_duelos: tipoCurso === 'retos',
      permite_individual: tipoCurso === 'certificacion',
      duelo_todo_curso: tipoCurso === 'retos' ? dueloTodoCurso : false,
      mostrar_ranking: mostrarRanking,
      cantidad_preguntas: cantidadPreguntas,
      porcentaje_certificacion: porcentajeCertificacion,
      tiempo_por_pregunta: tiempoPorPregunta,
    })

    if (error) setError('No se pudo crear el curso.')
    else {
      setNombre('')
      setDescripcion('')
      setVisibilidad(esSuperAdmin ? 'publico' : 'privado')
      setOrganizacionId(!esSuperAdmin && organizaciones.length === 1 ? organizaciones[0].id : '')
      setTipoCurso('retos')
      setDueloTodoCurso(false)
      setMostrarRanking(true)
      setCantidadPreguntas(5)
      setPorcentajeCertificacion(70)
      setTiempoPorPregunta(0)
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
        <p className="text-lg font-medium text-slate-800 mb-4">Administrar cursos</p>
        <AdminSubNav />

        <button
          onClick={() => setMostrarFormulario((prev) => !prev)}
          className="w-full bg-white border border-dashed border-indigo-300 text-indigo-600 rounded-xl p-3 mb-6 text-sm font-medium hover:bg-indigo-50"
        >
          {mostrarFormulario ? '✕ Cancelar' : '+ Crear curso'}
        </button>

        {mostrarFormulario && (
        <form onSubmit={crearCurso} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-col gap-3">
          <p className="text-sm font-medium text-slate-700">Nuevo curso</p>
          <input
            type="text"
            placeholder="Nombre del curso"
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

          <div className="flex flex-col gap-2 text-sm text-slate-600">
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={tipoCurso === 'retos'}
                  onChange={() => setTipoCurso('retos')}
                />
                Retos (duelos entre amigos)
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={tipoCurso === 'certificacion'}
                  onChange={() => setTipoCurso('certificacion')}
                />
                Certificación (evaluación individual)
              </label>
            </div>

            {tipoCurso === 'retos' && (
              <label className="flex items-center gap-1.5 text-xs text-slate-500 ml-5">
                <input
                  type="checkbox"
                  checked={dueloTodoCurso}
                  onChange={(e) => setDueloTodoCurso(e.target.checked)}
                  className="accent-indigo-600"
                />
                Duelos con preguntas de todo el curso (en vez de elegir un tema)
              </label>
            )}

            {tipoCurso === 'certificacion' && (
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
            {creando ? 'Creando...' : 'Crear curso'}
          </button>
        </form>
        )}

        <p className="text-sm font-medium text-slate-700 mb-2">Cursos existentes</p>

        {cargando && <p className="text-sm text-slate-400">Cargando...</p>}

        <div className="flex flex-col gap-2">
          {cursos.map((c) => (
            <Link
              key={c.id}
              to={`/admin/curso/${c.id}`}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-indigo-300"
            >
              <div>
                <p className="font-medium text-slate-800">{c.nombre}</p>
                <p className="text-xs text-slate-500">
                  {c.visibilidad === 'publico' ? 'Público' : `Privado · ${c.organizaciones?.nombre_empresa || 'Empresa'}`}
                </p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md">Gestionar</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
