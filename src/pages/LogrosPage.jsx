import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'

export default function LogrosPage() {
  const { perfil } = useAuth()
  const [logros, setLogros] = useState([])
  const [obtenidos, setObtenidos] = useState(new Set())
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarLogros()
  }, [])

  async function cargarLogros() {
    const [{ data: catalogo }, { data: mios }] = await Promise.all([
      supabase.from('logros').select('id, codigo, nombre, descripcion, icono, curso_id, cursos(nombre)').order('creado_en', { ascending: true }),
      supabase.from('logros_usuario').select('logro_id').eq('usuario_id', perfil.id),
    ])

    setLogros(catalogo || [])
    setObtenidos(new Set((mios || []).map((m) => m.logro_id)))
    setCargando(false)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6 text-sm text-slate-400">Cargando logros...</main>
      </div>
    )
  }

  const globales = logros.filter((l) => !l.curso_id)
  const porCurso = logros.filter((l) => l.curso_id)
  const totalObtenidos = logros.filter((l) => obtenidos.has(l.id)).length

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
        <Link to="/perfil" className="text-xs text-slate-400 hover:text-brand-blue-700">← Volver a perfil</Link>
        <h1 className="text-xl font-semibold text-slate-800 mt-2 mb-1">Logros</h1>
        <p className="text-sm text-slate-500 mb-6">{totalObtenidos} de {logros.length} desbloqueados</p>

        <p className="text-sm font-medium text-slate-700 mb-2">Globales</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
          {globales.map((l) => (
            <TarjetaLogro key={l.id} logro={l} obtenido={obtenidos.has(l.id)} />
          ))}
        </div>

        {porCurso.length > 0 && (
          <>
            <p className="text-sm font-medium text-slate-700 mb-2">Por curso</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {porCurso.map((l) => (
                <TarjetaLogro key={l.id} logro={l} obtenido={obtenidos.has(l.id)} mostrarCurso />
              ))}
            </div>
          </>
        )}
        </div>
      </main>
    </div>
  )
}

function TarjetaLogro({ logro, obtenido, mostrarCurso }) {
  return (
    <div
      className={`rounded-2xl p-3 flex items-center gap-3 ${
        obtenido ? 'bg-white shadow-sm' : 'bg-slate-100 opacity-60'
      }`}
    >
      <span className="text-2xl shrink-0">{logro.icono}</span>
      <div>
        <p className={`text-sm font-medium ${obtenido ? 'text-slate-800' : 'text-slate-500'}`}>{logro.nombre}</p>
        <p className="text-xs text-slate-400">{logro.descripcion}</p>
        {mostrarCurso && logro.cursos?.nombre && (
          <p className="text-[10px] text-brand-blue-700 mt-0.5">{logro.cursos.nombre}</p>
        )}
      </div>
    </div>
  )
}
