import { useAuth } from '../contexts/AuthContext'
import Home from './Home'
import Landing from './Landing'

export default function Portada() {
  const { session, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Cargando...
      </div>
    )
  }

  return session ? <Home /> : <Landing />
}
