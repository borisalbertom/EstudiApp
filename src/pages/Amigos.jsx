import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'

export default function Amigos() {
  const { perfil } = useAuth()
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [amistades, setAmistades] = useState([])
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarAmistades()
  }, [])

  async function cargarAmistades() {
    const { data } = await supabase
      .from('amistades')
      .select('id, estado, usuario_a, usuario_b, perfil_a:usuario_a(id, nombre), perfil_b:usuario_b(id, nombre)')
      .or(`usuario_a.eq.${perfil.id},usuario_b.eq.${perfil.id}`)
    setAmistades(data || [])
  }

  async function buscar(e) {
    e.preventDefault()
    const termino = busqueda.trim()
    if (!termino) return

    const consulta = supabase.from('perfiles').select('id, nombre, email').neq('id', perfil.id).limit(5)

    const { data } = termino.includes('@')
      ? await consulta.ilike('email', termino)
      : await consulta.ilike('nombre', `%${termino}%`)

    setResultados(data || [])
  }

  async function agregarAmigo(otroId) {
    const { error } = await supabase.from('amistades').insert({
      usuario_a: perfil.id,
      usuario_b: otroId,
      estado: 'pendiente',
    })
    if (error) setMensaje('No se pudo enviar la solicitud (quizás ya existe)')
    else {
      setMensaje('Solicitud enviada ✅')
      cargarAmistades()
    }
  }

  async function responderSolicitud(amistadId, nuevoEstado) {
    const { error } = await supabase.from('amistades').update({ estado: nuevoEstado }).eq('id', amistadId)
    if (!error) cargarAmistades()
  }

  const recibidas = amistades.filter((a) => a.usuario_b === perfil.id && a.estado === 'pendiente')
  const enviadas = amistades.filter((a) => a.usuario_a === perfil.id && a.estado === 'pendiente')
  const aceptadas = amistades.filter((a) => a.estado === 'aceptada')

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6 relative">
        <div
          className="absolute inset-x-0 top-0 h-28 pointer-events-none"
          style={{
            background:
              'radial-gradient(80% 100% at 15% 0%, rgba(0,175,242,0.12), rgba(0,0,0,0) 70%), ' +
              'radial-gradient(70% 100% at 100% 0%, rgba(255,187,0,0.12), rgba(0,0,0,0) 65%)',
          }}
        />

        <div className="relative">
        <p className="text-sm font-medium text-slate-700 mb-2">Buscar amigos por nombre o email</p>
        <form onSubmit={buscar} className="flex gap-2 mb-4">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre o email@ejemplo.com"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <button className="bg-brand-blue-500 text-white text-sm px-4 rounded-full font-semibold">Buscar</button>
        </form>

        {mensaje && <p className="text-xs text-brand-blue-700 mb-3">{mensaje}</p>}

        {resultados.length > 0 && (
          <div className="flex flex-col gap-2 mb-6">
            {resultados.map((r) => (
              <div key={r.id} className="bg-white shadow-sm rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700">{r.nombre}</p>
                  <p className="text-xs text-slate-400">{r.email}</p>
                </div>
                <button
                  onClick={() => agregarAmigo(r.id)}
                  className="text-xs bg-white text-brand-blue-700 border-[1.5px] border-brand-blue-500 px-3 py-1 rounded-full font-semibold"
                >
                  Agregar
                </button>
              </div>
            ))}
          </div>
        )}

        {recibidas.length > 0 && (
          <>
            <p className="text-sm font-medium text-slate-700 mb-2">Solicitudes recibidas</p>
            <div className="flex flex-col gap-2 mb-6">
              {recibidas.map((a) => (
                <div key={a.id} className="bg-white shadow-sm rounded-2xl p-3 flex items-center justify-between">
                  <span className="text-sm text-slate-700">{a.perfil_a?.nombre}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => responderSolicitud(a.id, 'aceptada')}
                      className="text-xs bg-brand-blue-500 text-white px-3 py-1 rounded-full font-semibold"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => responderSolicitud(a.id, 'rechazada')}
                      className="text-xs text-slate-400 hover:text-red-500 border border-slate-200 px-3 py-1 rounded-full"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="text-sm font-medium text-slate-700 mb-2">Mis amigos</p>
        <div className="flex flex-col gap-2 mb-6">
          {aceptadas.length === 0 && <p className="text-sm text-slate-400">Aún no tienes amigos agregados.</p>}
          {aceptadas.map((a) => {
            const esA = a.usuario_a === perfil.id
            const nombreOtro = esA ? a.perfil_b?.nombre : a.perfil_a?.nombre
            return (
              <div key={a.id} className="bg-white shadow-sm rounded-2xl p-3 flex items-center justify-between">
                <span className="text-sm text-slate-700">{nombreOtro}</span>
                <span className="text-xs text-green-600">Amigos</span>
              </div>
            )
          })}
        </div>

        {enviadas.length > 0 && (
          <>
            <p className="text-sm font-medium text-slate-700 mb-2">Solicitudes enviadas</p>
            <div className="flex flex-col gap-2">
              {enviadas.map((a) => (
                <div key={a.id} className="bg-white shadow-sm rounded-2xl p-3 flex items-center justify-between">
                  <span className="text-sm text-slate-700">{a.perfil_b?.nombre}</span>
                  <span className="text-xs text-slate-400">Pendiente</span>
                </div>
              ))}
            </div>
          </>
        )}
        </div>
      </main>
    </div>
  )
}
