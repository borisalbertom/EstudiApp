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

  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nombreEditado, setNombreEditado] = useState('')
  const [guardandoNombre, setGuardandoNombre] = useState(false)

  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [cambiandoPassword, setCambiandoPassword] = useState(false)
  const [errorPassword, setErrorPassword] = useState('')
  const [mensajePassword, setMensajePassword] = useState('')

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

  async function guardarNombre() {
    if (!nombreEditado.trim()) return
    setGuardandoNombre(true)
    await supabase.from('perfiles').update({ nombre: nombreEditado.trim() }).eq('id', perfil.id)
    recargarPerfil()
    setEditandoNombre(false)
    setGuardandoNombre(false)
  }

  async function cambiarPassword(e) {
    e.preventDefault()
    setErrorPassword('')
    setMensajePassword('')

    if (nuevaPassword.length < 6) {
      setErrorPassword('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (nuevaPassword !== confirmarPassword) {
      setErrorPassword('Las contraseñas no coinciden.')
      return
    }

    setCambiandoPassword(true)
    const { error } = await supabase.auth.updateUser({ password: nuevaPassword })

    if (error) {
      setErrorPassword(
        error.message?.includes('different from the old')
          ? 'La nueva contraseña debe ser distinta a la actual.'
          : 'No se pudo cambiar la contraseña. Intenta de nuevo.'
      )
    } else {
      setMensajePassword('Contraseña actualizada ✅')
      setNuevaPassword('')
      setConfirmarPassword('')
    }
    setCambiandoPassword(false)
  }

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-4 relative">
        <div
          className="absolute inset-x-0 top-0 h-28 pointer-events-none"
          style={{
            background:
              'radial-gradient(80% 100% at 15% 0%, rgba(0,175,242,0.12), rgba(0,0,0,0) 70%), ' +
              'radial-gradient(70% 100% at 100% 0%, rgba(255,187,0,0.12), rgba(0,0,0,0) 65%)',
          }}
        />

        <div className="relative flex flex-col gap-4">
        <div className="bg-white shadow-sm rounded-2xl p-6">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="relative w-14 h-14 rounded-full bg-brand-blue-50 text-brand-blue-700 flex items-center justify-center text-xl font-medium mb-3 overflow-hidden group"
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

          {editandoNombre ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                type="text"
                value={nombreEditado}
                onChange={(e) => setNombreEditado(e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1 text-sm"
                autoFocus
              />
              <button onClick={guardarNombre} disabled={guardandoNombre} className="text-xs text-brand-blue-700">
                {guardandoNombre ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setEditandoNombre(false)} className="text-xs text-slate-400">
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-slate-800">{perfil?.nombre}</p>
              <button
                onClick={() => {
                  setEditandoNombre(true)
                  setNombreEditado(perfil?.nombre || '')
                }}
                className="text-xs text-slate-400 hover:text-brand-blue-700"
              >
                Editar
              </button>
            </div>
          )}
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
            className="mt-3 flex items-center justify-between bg-slate-50 hover:bg-brand-blue-50 rounded-lg p-3"
          >
            <span className="text-sm text-slate-700">🏆 Logros</span>
            <span className="text-sm text-brand-blue-700">{logrosObtenidos}/{totalLogros} →</span>
          </Link>
        </div>

        <div className="bg-white shadow-sm rounded-2xl p-6">
          <p className="text-sm font-medium text-slate-700 mb-3">Cambiar contraseña</p>
          <form onSubmit={cambiarPassword} className="flex flex-col gap-2">
            <div className="relative">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                placeholder="Nueva contraseña"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-14 text-sm"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                {mostrarPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
            <input
              type={mostrarPassword ? 'text' : 'password'}
              placeholder="Confirmar contraseña"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              minLength={6}
            />

            {errorPassword && <p className="text-xs text-red-500">{errorPassword}</p>}
            {mensajePassword && <p className="text-xs text-green-600">{mensajePassword}</p>}

            <button
              type="submit"
              disabled={cambiandoPassword || !nuevaPassword}
              className="bg-brand-blue-500 text-white rounded-full py-2 text-sm font-semibold disabled:opacity-50"
            >
              {cambiandoPassword ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>
        </div>
      </main>
    </div>
  )
}
