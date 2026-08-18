import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AdminSubNav() {
  const { perfil } = useAuth()
  const esSuperAdmin = perfil?.es_admin_plataforma || false

  const tabs = esSuperAdmin
    ? [
        { to: '/admin', label: 'Actividades' },
        { to: '/admin/logros', label: 'Logros' },
        { to: '/admin/organizaciones', label: 'Organizaciones' },
      ]
    : [
        { to: '/admin', label: 'Actividades' },
        { to: '/admin/organizacion', label: 'Mi organización' },
      ]

  return (
    <nav className="flex items-center gap-4 border-b border-slate-200 mb-4 text-sm">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/admin'}
          className={({ isActive }) =>
            `pb-2 border-b-2 -mb-px ${
              isActive ? 'border-indigo-600 text-indigo-600 font-medium' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
