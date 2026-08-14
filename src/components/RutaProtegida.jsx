import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RutaProtegida({ children }) {
  const { session, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Cargando...
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  return children
}
