import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [searchParams] = useSearchParams()
  const [modo, setModo] = useState(searchParams.get('modo') === 'registrar' ? 'registrar' : 'ingresar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const { iniciarSesion, registrarse } = useAuth()
  const navigate = useNavigate()

  function validarPassword(pass) {
    if (pass.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
    if (!/[a-z]/.test(pass) || !/[A-Z]/.test(pass)) return 'La contraseña debe incluir mayúsculas y minúsculas'
    if (!/[0-9]/.test(pass)) return 'La contraseña debe incluir al menos un número'
    return ''
  }

  async function manejarSubmit(e) {
    e.preventDefault()
    setError('')
    setMensaje('')
    setCargando(true)

    if (modo === 'ingresar') {
      const { error } = await iniciarSesion(email, password)
      if (error) setError(traducirError(error.message))
      else navigate('/')
    } else {
      if (!nombre.trim()) {
        setError('Escribe tu nombre')
        setCargando(false)
        return
      }
      const errorPassword = validarPassword(password)
      if (errorPassword) {
        setError(errorPassword)
        setCargando(false)
        return
      }
      const { error, confirmacionPendiente } = await registrarse(email, password, nombre)
      if (error) setError(traducirError(error.message))
      else if (confirmacionPendiente) setMensaje('Te enviamos un correo para confirmar tu cuenta antes de ingresar.')
      else navigate('/')
    }
    setCargando(false)
  }

  function traducirError(msg) {
    if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos'
    if (msg.includes('already registered') || msg.includes('already been registered')) return 'Ese email ya está registrado'
    if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres'
    if (msg.includes('Password') || msg.includes('password')) return 'La contraseña no cumple los requisitos de seguridad'
    if (msg.includes('Unable to validate email') || msg.includes('invalid')) return 'Ese email no es válido'
    return msg
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 relative">
      <div
        className="absolute inset-x-0 top-0 h-64 pointer-events-none"
        style={{
          background:
            'radial-gradient(60% 100% at 15% 0%, rgba(0,175,242,0.10), rgba(0,0,0,0) 70%), ' +
            'radial-gradient(55% 100% at 100% 10%, rgba(255,187,0,0.10), rgba(0,0,0,0) 65%)',
        }}
      />
      <Link to="/" className="relative w-full max-w-sm text-xs text-slate-400 hover:text-brand-blue-700 mb-2">← Volver</Link>
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
        <h1 className="text-xl font-semibold text-slate-800 mb-1">🎯 EstudiApp</h1>
        <p className="text-sm text-slate-500 mb-6">
          {modo === 'ingresar' ? 'Ingresa a tu cuenta' : 'Crea tu cuenta'}
        </p>

        <form onSubmit={manejarSubmit} className="flex flex-col gap-3">
          {modo === 'registrar' && (
            <input
              type="text"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />
          <div className="relative">
            <input
              type={mostrarPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm"
              required
              minLength={modo === 'registrar' ? 8 : 6}
            />
            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              {mostrarPassword ? 'Ocultar' : 'Ver'}
            </button>
          </div>
          {modo === 'registrar' && (
            <p className="text-xs text-slate-400 -mt-2">Mínimo 8 caracteres, con mayúsculas, minúsculas y números.</p>
          )}

          {error && <p className="text-red-500 text-xs">{error}</p>}
          {mensaje && <p className="text-green-600 text-xs">{mensaje}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="bg-brand-blue-500 text-white rounded-full py-2 text-sm font-semibold mt-1 disabled:opacity-50"
          >
            {cargando ? 'Cargando...' : modo === 'ingresar' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>

        <button
          onClick={() => {
            setModo(modo === 'ingresar' ? 'registrar' : 'ingresar')
            setError('')
          }}
          className="text-xs text-slate-500 mt-4 w-full text-center hover:text-brand-blue-700"
        >
          {modo === 'ingresar' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}
        </button>
      </div>
    </div>
  )
}
