import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [modo, setModo] = useState('ingresar') // 'ingresar' | 'registrar'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const { iniciarSesion, registrarse } = useAuth()
  const navigate = useNavigate()

  async function manejarSubmit(e) {
    e.preventDefault()
    setError('')
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
      const { error } = await registrarse(email, password, nombre)
      if (error) setError(traducirError(error.message))
      else navigate('/')
    }
    setCargando(false)
  }

  function traducirError(msg) {
    if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos'
    if (msg.includes('already registered')) return 'Ese email ya está registrado'
    if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres'
    return msg
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
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
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
            minLength={6}
          />

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium mt-1 disabled:opacity-50"
          >
            {cargando ? 'Cargando...' : modo === 'ingresar' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>

        <button
          onClick={() => {
            setModo(modo === 'ingresar' ? 'registrar' : 'ingresar')
            setError('')
          }}
          className="text-xs text-slate-500 mt-4 w-full text-center hover:text-indigo-600"
        >
          {modo === 'ingresar' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}
        </button>
      </div>
    </div>
  )
}
