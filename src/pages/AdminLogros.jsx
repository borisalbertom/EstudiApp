import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'
import AdminSubNav from '../components/AdminSubNav'

const TIPOS = [
  { value: 'racha', label: 'Racha de días seguidos', usaValor: true },
  { value: 'puntos_totales', label: 'Preguntas correctas (total)', usaValor: true },
  { value: 'duelos_ganados', label: 'Duelos ganados', usaValor: true },
  { value: 'duelo_perfecto', label: 'Duelo con puntaje perfecto', usaValor: false },
  { value: 'primer_duelo', label: 'Jugar el primer duelo', usaValor: false },
  { value: 'aprobacion_individual', label: 'Aprobar el modo individual (requiere curso)', usaValor: false },
]

export default function AdminLogros() {
  const { perfil } = useAuth()
  const [logros, setLogros] = useState([])
  const [cursos, setCursos] = useState([])
  const [cargando, setCargando] = useState(true)

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [icono, setIcono] = useState('🏆')
  const [tipo, setTipo] = useState('racha')
  const [valorObjetivo, setValorObjetivo] = useState(5)
  const [cursoId, setCursoId] = useState('')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarTodo()
  }, [])

  async function cargarTodo() {
    const [{ data: logrosData }, { data: cursosData }] = await Promise.all([
      supabase.from('logros').select('id, nombre, descripcion, icono, tipo, valor_objetivo, curso_id, cursos(nombre)').order('creado_en', { ascending: false }),
      supabase.from('cursos').select('id, nombre').order('nombre', { ascending: true }),
    ])
    setLogros(logrosData || [])
    setCursos(cursosData || [])
    setCargando(false)
  }

  function generarCodigo(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  async function crearLogro(e) {
    e.preventDefault()
    if (!nombre.trim() || !descripcion.trim()) return

    const tipoInfo = TIPOS.find((t) => t.value === tipo)
    if (tipo === 'aprobacion_individual' && !cursoId) {
      setError('Este tipo de logro necesita un curso específico.')
      return
    }

    setCreando(true)
    setError('')

    const { error } = await supabase.from('logros').insert({
      codigo: `${generarCodigo(nombre)}_${Date.now()}`,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      icono: icono.trim() || '🏆',
      tipo,
      valor_objetivo: tipoInfo.usaValor ? valorObjetivo : 1,
      curso_id: cursoId || null,
    })

    if (error) setError('No se pudo crear el logro.')
    else {
      setNombre('')
      setDescripcion('')
      setIcono('🏆')
      setTipo('racha')
      setValorObjetivo(5)
      setCursoId('')
      cargarTodo()
    }
    setCreando(false)
  }

  async function borrarLogro(id) {
    await supabase.from('logros').delete().eq('id', id)
    cargarTodo()
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

  const tipoInfo = TIPOS.find((t) => t.value === tipo)

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-lg font-medium text-slate-800 mb-4">Administrar logros</p>
        <AdminSubNav />

        <form onSubmit={crearLogro} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-col gap-3">
          <p className="text-sm font-medium text-slate-700">Nuevo logro</p>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="🏆"
              value={icono}
              onChange={(e) => setIcono(e.target.value)}
              className="w-14 border border-slate-300 rounded-lg px-2 py-2 text-center text-lg"
            />
            <input
              type="text"
              placeholder="Nombre del logro"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>

          <input
            type="text"
            placeholder="Descripción (ej. Gana 5 duelos)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />

          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {tipoInfo?.usaValor && (
            <label className="text-xs text-slate-500">
              Cantidad necesaria
              <input
                type="number"
                min={1}
                value={valorObjetivo}
                onChange={(e) => setValorObjetivo(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </label>
          )}

          <label className="text-xs text-slate-500">
            Curso {tipo === 'aprobacion_individual' ? '(obligatorio)' : '(opcional, si no se elige es un logro global)'}
            <select
              value={cursoId}
              onChange={(e) => setCursoId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
            >
              <option value="">Global (todos los cursos)</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={creando}
            className="bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {creando ? 'Creando...' : 'Crear logro'}
          </button>
        </form>

        <p className="text-sm font-medium text-slate-700 mb-2">Logros existentes</p>

        {cargando && <p className="text-sm text-slate-400">Cargando...</p>}

        <div className="flex flex-col gap-2">
          {logros.map((l) => (
            <div key={l.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{l.icono}</span>
                <div>
                  <p className="text-sm text-slate-800">{l.nombre}</p>
                  <p className="text-xs text-slate-400">
                    {l.descripcion} {l.cursos?.nombre && `· ${l.cursos.nombre}`}
                  </p>
                </div>
              </div>
              <button onClick={() => borrarLogro(l.id)} className="text-xs text-slate-400 hover:text-red-500 shrink-0">
                Borrar
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
