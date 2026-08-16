import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'
import AdminSubNav from '../components/AdminSubNav'

export default function MiOrganizacion() {
  const { perfil, orgsAdmin } = useAuth()
  const [organizaciones, setOrganizaciones] = useState([])
  const [miembrosPorOrg, setMiembrosPorOrg] = useState({})
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (orgsAdmin.length > 0) cargarOrganizaciones()
    else setCargando(false)
  }, [orgsAdmin])

  async function cargarOrganizaciones() {
    setCargando(true)
    const { data } = await supabase
      .from('organizaciones')
      .select('id, nombre_empresa, giro, dominio_email')
      .in('id', orgsAdmin)
    setOrganizaciones(data || [])

    for (const org of data || []) {
      await cargarMiembros(org.id)
    }
    setCargando(false)
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

  if (orgsAdmin.length === 0 && !perfil?.es_admin_plataforma) {
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
        <p className="text-lg font-medium text-slate-800 mb-4">Mi organización</p>
        <AdminSubNav />

        {cargando && <p className="text-sm text-slate-400">Cargando...</p>}

        {!cargando && organizaciones.length === 0 && (
          <p className="text-sm text-slate-400">No administras ninguna organización.</p>
        )}

        <div className="flex flex-col gap-2">
          {organizaciones.map((o) => (
            <div key={o.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="font-medium text-slate-800">{o.nombre_empresa}</p>
              <p className="text-xs text-slate-500 mb-3">
                {o.giro && `${o.giro} · `}
                {o.dominio_email ? `@${o.dominio_email}` : 'Sin dominio configurado'}
              </p>

              <p className="text-xs font-medium text-slate-500 mb-2">Miembros</p>
              <div className="flex flex-col gap-2">
                {(miembrosPorOrg[o.id] || []).length === 0 && (
                  <p className="text-xs text-slate-400">Todavía no hay miembros en esta organización.</p>
                )}
                {(miembrosPorOrg[o.id] || []).map((m) => (
                  <div key={m.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm text-slate-700">
                        {m.perfiles?.nombre} {m.usuario_id === perfil.id && '(tú)'}
                      </p>
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
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
