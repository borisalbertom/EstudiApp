import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'

export default function Perfil() {
  const { perfil, session } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-medium mb-3">
            {perfil?.nombre?.[0]?.toUpperCase()}
          </div>
          <p className="font-medium text-slate-800">{perfil?.nombre}</p>
          <p className="text-sm text-slate-500 mb-4">{session?.user?.email}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Racha</p>
              <p className="text-lg font-medium text-slate-800">{perfil?.racha_actual || 0} días</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Cuenta</p>
              <p className="text-lg font-medium text-slate-800">{perfil?.es_premium ? 'Premium' : 'Gratis'}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
