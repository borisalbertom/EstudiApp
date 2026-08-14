import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

export default function Perfil() {
  const { perfil, session, recargarPerfil } = useAuth()
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const [totalLogros, setTotalLogros] = useState(0)
  const [logrosObtenidos, setLogrosObtenidos] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    cargarResumenLogros()
  }, [])

  async function cargarResumenLogros() {
    const [{ count: total }, { count: obtenidos }] = await Promise.all([
      supabase.from('logros').select('id', { count: 'exact', head: true }),
      supabase.from('logros_usuario').select('id', { count: 'exact', head: true }).eq('usuario_id', perfil.id),
    ])
    setTotalLogros(total || 0)
    setLogrosObtenidos(obtenidos || 0)
  }

  async function subirAvatar(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setSubiendo(true)
    setError('')

    const extension = file.name.split('.').pop()
    const rutaArchivo = `${perfil.id}/avatar.${extension}`

    const { error: errorSubida } = await supabase.storage
      .from('avatars')
      .upload(rutaArchivo, file, { upsert: true })

    if (errorSubida) {
      setError('No se pudo subir la imagen.')
      setSubiendo(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(rutaArchivo)
    const urlConVersion = `${data.publicUrl}?v=${Date.now()}`

    await supabase.from('perfiles').update({ avatar_url: urlConVersion }).eq('id', perfil.id)
    recargarPerfil()
    setSubiendo(false)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="relative w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-medium mb-3 overflow-hidden group"
          >
            {perfil?.avatar_url ? (
              <img src={perfil.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              perfil?.nombre?.[0]?.toUpperCase()
            )}
            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] transition-opacity">
              {subiendo ? '...' : 'Cambiar'}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={subirAvatar}
            className="hidden"
          />
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

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

          <Link
            to="/logros"
            className="mt-3 flex items-center justify-between bg-slate-50 hover:bg-indigo-50 rounded-lg p-3"
          >
            <span className="text-sm text-slate-700">🏆 Logros</span>
            <span className="text-sm text-indigo-600">{logrosObtenidos}/{totalLogros} →</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
