import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'

export default function AdminCursos() {
  const { perfil } = useAuth()
  const [cursos, setCursos] = useState([])
  const [organizaciones, setOrganizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [visibilidad, setVisibilidad] = useState('publico')
  const [organizacionId, setOrganizacionId] = useState('')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarCursos()
    cargarOrganizaciones()
  }, [])

  async function cargarCursos() {
    const { data } = await supabase
      .from('cursos')
      .select('id, nombre, visibilidad, organizaciones(nombre_empresa)')
      .order('creado_en', { ascending: false })
    setCursos(data || [])
    setCargando(false)
  }

  async function cargarOrganizaciones() {
    const { data } = await supabase.from('organizaciones').select('id, nombre_empresa')
    setOrganizaciones(data || [])
  }

  async function crearCurso(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    setCreando(true)
    setError('')

    const { error } = await supabase.from('cursos').insert({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      visibilidad,
      organizacion_id: visibilidad === 'privado' ? organizacionId || null : null,
      creado_por: perfil.id,
    })

    if (error) setError('No se pudo crear el curso.')
    else {
      setNombre('')
      setDescripcion('')
      setVisibilidad('publico')
      setOrganizacionId('')
      cargarCursos()
    }
    setCreando(false)
  }

  if (!perfil?.es_admin_plataforma) {
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

          {visibilidad === 'privado' && (
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

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={creando}
            className="bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {creando ? 'Creando...' : 'Crear curso'}
          </button>
        </form>

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
