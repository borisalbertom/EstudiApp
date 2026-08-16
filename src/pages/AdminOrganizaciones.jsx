import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'
import AdminSubNav from '../components/AdminSubNav'

export default function AdminOrganizaciones() {
  const { perfil } = useAuth()
  const [organizaciones, setOrganizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [nombreEmpresa, setNombreEmpresa] = useState('')
  const [rutEmpresa, setRutEmpresa] = useState('')
  const [giro, setGiro] = useState('')
  const [dominioEmail, setDominioEmail] = useState('')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [orgExpandida, setOrgExpandida] = useState(null)
  const [miembrosPorOrg, setMiembrosPorOrg] = useState({})
  const [busquedaEmail, setBusquedaEmail] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState(null)
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    cargarOrganizaciones()
  }, [])

  async function alternarOrg(orgId) {
    if (orgExpandida === orgId) {
      setOrgExpandida(null)
      return
    }
    setOrgExpandida(orgId)
    if (!miembrosPorOrg[orgId]) await cargarMiembros(orgId)
  }

  async function cargarMiembros(orgId) {
    const { data } = await supabase
      .from('miembros_organizacion')
      .select('id, usuario_id, rol, perfiles(nombre, email)')
      .eq('organizacion_id', orgId)
    setMiembrosPorOrg((prev) => ({ ...prev, [orgId]: data || [] }))
  }

  async function alternarRolMiembro(miembro, orgId) {
    const nuevoRol = miembro.rol === 'admin_curso' ? 'miembro' : 'admin_curso'
    await supabase.from('miembros_organizacion').update({ rol: nuevoRol }).eq('id', miembro.id)
    cargarMiembros(orgId)
  }

  async function cargarOrganizaciones() {
    const { data } = await supabase
      .from('organizaciones')
      .select('id, nombre_empresa, rut_empresa, giro, dominio_email')
      .order('creado_en', { ascending: false })
    setOrganizaciones(data || [])
    setCargando(false)
  }

  async function buscarUsuarios(e) {
    e.preventDefault()
    if (!busquedaEmail.trim()) return
    setBuscando(true)
    const { data } = await supabase
      .from('perfiles')
      .select('id, nombre, email, es_admin_plataforma')
      .ilike('email', `%${busquedaEmail.trim()}%`)
      .limit(5)
    setResultadosBusqueda(data || [])
    setBuscando(false)
  }

  async function alternarSuperAdmin(usuario) {
    const nuevoValor = !usuario.es_admin_plataforma
    await supabase.from('perfiles').update({ es_admin_plataforma: nuevoValor }).eq('id', usuario.id)
    setResultadosBusqueda((prev) =>
      prev.map((u) => (u.id === usuario.id ? { ...u, es_admin_plataforma: nuevoValor } : u))
    )
  }

  async function crearOrganizacion(e) {
    e.preventDefault()
    if (!nombreEmpresa.trim()) return
    setCreando(true)
    setError('')

    const { error } = await supabase.from('organizaciones').insert({
      nombre_empresa: nombreEmpresa.trim(),
      rut_empresa: rutEmpresa.trim() || null,
      giro: giro.trim() || null,
      dominio_email: dominioEmail.trim().toLowerCase() || null,
      creado_por: perfil.id,
    })

    if (error) setError('No se pudo crear la organización (revisa que el RUT no esté repetido).')
    else {
      setNombreEmpresa('')
      setRutEmpresa('')
      setGiro('')
      setDominioEmail('')
      cargarOrganizaciones()
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
        <p className="text-lg font-medium text-slate-800 mb-4">Administrar organizaciones</p>
        <AdminSubNav />

        <form onSubmit={buscarUsuarios} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-col gap-3">
          <p className="text-sm font-medium text-slate-700">Super admins</p>
          <p className="text-xs text-slate-500 -mt-2">
            Un super admin puede administrar todo: cursos de cualquier empresa, organizaciones y logros.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Buscar usuario por email"
              value={busquedaEmail}
              onChange={(e) => setBusquedaEmail(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={buscando}
              className="bg-slate-100 text-slate-700 text-sm px-4 rounded-lg disabled:opacity-50"
            >
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {resultadosBusqueda && resultadosBusqueda.length === 0 && (
            <p className="text-xs text-slate-400">No se encontró ningún usuario con ese email.</p>
          )}

          {resultadosBusqueda?.map((u) => (
            <div key={u.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm text-slate-700">{u.nombre}</p>
                <p className="text-xs text-slate-400">{u.email}</p>
              </div>
              <button
                onClick={() => alternarSuperAdmin(u)}
                className={`text-xs px-2 py-1 rounded-md shrink-0 ${
                  u.es_admin_plataforma ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {u.es_admin_plataforma ? 'Super admin' : 'Hacer super admin'}
              </button>
            </div>
          ))}
        </form>

        <form onSubmit={crearOrganizacion} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-col gap-3">
          <p className="text-sm font-medium text-slate-700">Nueva organización</p>
          <input
            type="text"
            placeholder="Nombre de la empresa"
            value={nombreEmpresa}
            onChange={(e) => setNombreEmpresa(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            type="text"
            placeholder="RUT de la empresa"
            value={rutEmpresa}
            onChange={(e) => setRutEmpresa(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            type="text"
            placeholder="Giro (opcional)"
            value={giro}
            onChange={(e) => setGiro(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <label className="text-xs text-slate-500">
            Dominio de email (los usuarios con este dominio se unen automáticamente)
            <input
              type="text"
              placeholder="ej. vigatec.com"
              value={dominioEmail}
              onChange={(e) => setDominioEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </label>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={creando}
            className="bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {creando ? 'Creando...' : 'Crear organización'}
          </button>
        </form>

        <p className="text-sm font-medium text-slate-700 mb-2">Organizaciones existentes</p>

        {cargando && <p className="text-sm text-slate-400">Cargando...</p>}

        <div className="flex flex-col gap-2">
          {organizaciones.length === 0 && !cargando && (
            <p className="text-sm text-slate-400">Todavía no hay organizaciones creadas.</p>
          )}
          {organizaciones.map((o) => (
            <div key={o.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <button onClick={() => alternarOrg(o.id)} className="w-full flex items-center justify-between text-left">
                <div>
                  <p className="font-medium text-slate-800">{o.nombre_empresa}</p>
                  <p className="text-xs text-slate-500">
                    {o.giro && `${o.giro} · `}
                    {o.dominio_email ? `@${o.dominio_email}` : 'Sin dominio configurado'}
                  </p>
                </div>
                <span className="text-xs text-indigo-600 shrink-0">
                  {orgExpandida === o.id ? 'Ocultar miembros' : 'Ver miembros'}
                </span>
              </button>

              {orgExpandida === o.id && (
                <div className="mt-3 border-t border-slate-100 pt-3 flex flex-col gap-2">
                  {(miembrosPorOrg[o.id] || []).length === 0 && (
                    <p className="text-xs text-slate-400">Todavía no hay miembros en esta organización.</p>
                  )}
                  {(miembrosPorOrg[o.id] || []).map((m) => (
                    <div key={m.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm text-slate-700">{m.perfiles?.nombre}</p>
                        <p className="text-xs text-slate-400">{m.perfiles?.email}</p>
                      </div>
                      <button
                        onClick={() => alternarRolMiembro(m, o.id)}
                        className={`text-xs px-2 py-1 rounded-md shrink-0 ${
                          m.rol === 'admin_curso' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {m.rol === 'admin_curso' ? 'Admin de cursos' : 'Hacer admin de cursos'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
