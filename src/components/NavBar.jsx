import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/amigos', label: 'Amigos' },
  { to: '/perfil', label: 'Perfil' },
]

export default function NavBar() {
  const { perfil, cerrarSesion } = useAuth()
  const todosLosLinks = perfil?.es_admin_plataforma
    ? [...links, { to: '/admin', label: 'Admin' }]
    : links

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-slate-800">🎯 EstudiApp</span>
        <nav className="flex items-center gap-4 text-sm">
          {todosLosLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                isActive ? 'text-indigo-600 font-medium' : 'text-slate-500 hover:text-slate-800'
              }
            >
              {l.label}
            </NavLink>
          ))}
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">{perfil?.nombre}</span>
          <button onClick={cerrarSesion} className="text-slate-400 hover:text-slate-700 text-xs border border-slate-200 rounded-md px-2 py-1">
            Salir
          </button>
        </nav>
      </div>
    </header>
  )
}
