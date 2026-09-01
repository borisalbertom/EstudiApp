import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { iconoMaterial } from '../lib/materiales'
import NavBar from '../components/NavBar'

export default function AdminCurso() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { perfil, orgsAdmin } = useAuth()
  const esSuperAdmin = perfil?.es_admin_plataforma || false

  const [curso, setCurso] = useState(null)
  const [cursoGuardado, setCursoGuardado] = useState(null)
  const [temas, setTemas] = useState([])
  const [temaEditando, setTemaEditando] = useState(null)
  const [nombreEditado, setNombreEditado] = useState('')
  const [preguntasPorTema, setPreguntasPorTema] = useState({})
  const [materialesPorTema, setMaterialesPorTema] = useState({})
  const [subiendoMaterial, setSubiendoMaterial] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [errorTema, setErrorTema] = useState('')

  const [nombreTema, setNombreTema] = useState('')
  const [creandoTema, setCreandoTema] = useState(false)
  const [solicitudesPlazo, setSolicitudesPlazo] = useState([])
  const [seccion, setSeccion] = useState('configuracion') // 'configuracion' | 'temas'
  const [miembros, setMiembros] = useState([])
  const [inscripcionesPorUsuario, setInscripcionesPorUsuario] = useState({})
  const [seleccionados, setSeleccionados] = useState([])
  const [asignando, setAsignando] = useState(false)
  const [configSucia, setConfigSucia] = useState(false)
  const [guardandoConfig, setGuardandoConfig] = useState(false)
  const [confirmandoSalida, setConfirmandoSalida] = useState(false)
  const [temasGuardados, setTemasGuardados] = useState({})
  const [confirmandoBorrarTema, setConfirmandoBorrarTema] = useState(null)
  const [confirmandoBorrarMaterial, setConfirmandoBorrarMaterial] = useState(null)
  const [confirmandoGuardarConfig, setConfirmandoGuardarConfig] = useState(false)

  useEffect(() => {
    cargarCurso()
    cargarSolicitudesPlazo()
  }, [id])

  useEffect(() => {
    if (!configSucia) return
    function avisar(e) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [configSucia])

  function volverACursos() {
    if (configSucia) {
      setConfirmandoSalida(true)
      return
    }
    const esAdmin = esSuperAdmin || (curso?.organizacion_id && orgsAdmin.includes(curso.organizacion_id))
    if (esAdmin) navigate('/admin')
    else navigate(curso?.permite_practica_individual ? '/pruebas' : '/trivias')
  }

  async function cargarCurso() {
    setCargando(true)
    setConfigSucia(false)
    const [{ data: cursoData }, { data: temasData }] = await Promise.all([
      supabase
        .from('cursos')
        .select('id, nombre, organizacion_id, creado_por, permite_duelos, permite_individual, permite_practica_individual, mostrar_ranking, cantidad_preguntas, porcentaje_certificacion, tiempo_por_pregunta, fecha_fin, fecha_fin_duelos')
        .eq('id', id)
        .single(),
      supabase.from('temas').select('id, nombre, orden, tiempo_por_pregunta').eq('curso_id', id).order('orden', { ascending: true }),
    ])
    setCurso(cursoData)
    setCursoGuardado(cursoData)
    setTemas(temasData || [])
    setTemasGuardados(Object.fromEntries((temasData || []).map((t) => [t.id, t.tiempo_por_pregunta])))
    setCargando(false)
    if (cursoData?.organizacion_id) cargarMiembros(cursoData.organizacion_id)
    else if (cursoData?.creado_por === perfil?.id && !cursoData?.permite_individual) cargarAmigosParaInvitar()

    const temaIds = (temasData || []).map((t) => t.id)
    if (temaIds.length > 0) {
      const { data: materialesData } = await supabase
        .from('materiales_tema')
        .select('id, tema_id, nombre_archivo, url')
        .in('tema_id', temaIds)
        .order('creado_en', { ascending: true })

      const agrupados = {}
      for (const m of materialesData || []) {
        if (!agrupados[m.tema_id]) agrupados[m.tema_id] = []
        agrupados[m.tema_id].push(m)
      }
      setMaterialesPorTema(agrupados)

      const { data: preguntasData } = await supabase
        .from('preguntas')
        .select('id, tema_id, enunciado, alternativas, correcta, dificultad, activa, imagen_url')
        .in('tema_id', temaIds)
        .order('creado_en', { ascending: false })

      const preguntasAgrupadas = {}
      for (const p of preguntasData || []) {
        if (!preguntasAgrupadas[p.tema_id]) preguntasAgrupadas[p.tema_id] = []
        preguntasAgrupadas[p.tema_id].push(p)
      }
      setPreguntasPorTema(preguntasAgrupadas)
    }
  }

  async function cargarSolicitudesPlazo() {
    const { data } = await supabase
      .from('solicitudes_plazo')
      .select('id, mensaje, creado_en, perfiles!solicitudes_plazo_usuario_id_fkey(nombre, email)')
      .eq('curso_id', id)
      .eq('estado', 'pendiente')
      .order('creado_en', { ascending: true })
    setSolicitudesPlazo(data || [])
  }

  async function resolverSolicitud(solicitudId) {
    await supabase
      .from('solicitudes_plazo')
      .update({ estado: 'resuelta', resuelto_en: new Date().toISOString(), resuelto_por: perfil.id })
      .eq('id', solicitudId)
    cargarSolicitudesPlazo()
  }

  async function cargarMiembros(organizacionId) {
    const [{ data: miembrosData }, { data: inscripcionesData }] = await Promise.all([
      supabase
        .from('miembros_organizacion')
        .select('usuario_id, perfiles(nombre, email)')
        .eq('organizacion_id', organizacionId),
      supabase.from('inscripciones_curso').select('id, usuario_id, estado').eq('curso_id', id),
    ])
    setMiembros(miembrosData || [])
    const agrupadas = {}
    for (const i of inscripcionesData || []) agrupadas[i.usuario_id] = i
    setInscripcionesPorUsuario(agrupadas)
  }

  async function cargarAmigosParaInvitar() {
    const [{ data: amistades }, { data: inscripcionesData }] = await Promise.all([
      supabase
        .from('amistades')
        .select('usuario_a, usuario_b, perfil_a:usuario_a(nombre, email), perfil_b:usuario_b(nombre, email)')
        .eq('estado', 'aceptada')
        .or(`usuario_a.eq.${perfil.id},usuario_b.eq.${perfil.id}`),
      supabase.from('inscripciones_curso').select('id, usuario_id, estado').eq('curso_id', id),
    ])
    const lista = (amistades || []).map((a) => {
      const esA = a.usuario_a === perfil.id
      return { usuario_id: esA ? a.usuario_b : a.usuario_a, perfiles: esA ? a.perfil_b : a.perfil_a }
    })
    setMiembros(lista)
    const agrupadas = {}
    for (const i of inscripcionesData || []) agrupadas[i.usuario_id] = i
    setInscripcionesPorUsuario(agrupadas)
  }

  function recargarAsignables() {
    if (curso?.organizacion_id) cargarMiembros(curso.organizacion_id)
    else cargarAmigosParaInvitar()
  }

  function alternarSeleccionado(usuarioId) {
    setSeleccionados((prev) =>
      prev.includes(usuarioId) ? prev.filter((u) => u !== usuarioId) : [...prev, usuarioId]
    )
  }

  async function asignarSeleccionados() {
    if (seleccionados.length === 0) return
    setAsignando(true)
    const filas = seleccionados.map((usuarioId) => ({
      curso_id: id,
      usuario_id: usuarioId,
      estado: 'asignado',
      asignado_por: perfil.id,
      visto: false,
    }))
    await supabase.from('inscripciones_curso').insert(filas)
    setSeleccionados([])
    setAsignando(false)
    recargarAsignables()
  }

  async function quitarAcceso(inscripcionId) {
    await supabase.from('inscripciones_curso').delete().eq('id', inscripcionId)
    recargarAsignables()
  }

  async function crearTema(e) {
    e.preventDefault()
    if (!nombreTema.trim()) return
    setCreandoTema(true)
    const siguienteOrden = temas.length > 0 ? Math.max(...temas.map((t) => t.orden || 0)) + 1 : 1

    const { error } = await supabase.from('temas').insert({
      curso_id: id,
      nombre: nombreTema.trim(),
      orden: siguienteOrden,
    })

    if (!error) {
      setNombreTema('')
      cargarCurso()
    }
    setCreandoTema(false)
  }

  async function guardarNombreTema(temaId) {
    if (!nombreEditado.trim()) return
    await supabase.from('temas').update({ nombre: nombreEditado.trim() }).eq('id', temaId)
    setTemaEditando(null)
    cargarCurso()
  }

  function actualizarTiempoTema(temaId, valor) {
    setTemas((prev) => prev.map((t) => (t.id === temaId ? { ...t, tiempo_por_pregunta: valor } : t)))
  }

  async function guardarTiempoTema(temaId) {
    const tema = temas.find((t) => t.id === temaId)
    await supabase.from('temas').update({ tiempo_por_pregunta: tema.tiempo_por_pregunta }).eq('id', temaId)
    setTemasGuardados((prev) => ({ ...prev, [temaId]: tema.tiempo_por_pregunta }))
  }

  async function moverTema(index, direccion) {
    const nuevoIndex = index + direccion
    if (nuevoIndex < 0 || nuevoIndex >= temas.length) return
    const a = temas[index]
    const b = temas[nuevoIndex]

    const nuevosTemas = [...temas]
    nuevosTemas[index] = { ...b, orden: a.orden }
    nuevosTemas[nuevoIndex] = { ...a, orden: b.orden }
    setTemas(nuevosTemas)

    await Promise.all([
      supabase.from('temas').update({ orden: b.orden }).eq('id', a.id),
      supabase.from('temas').update({ orden: a.orden }).eq('id', b.id),
    ])
  }

  async function borrarTema(temaId) {
    setErrorTema('')
    const { count } = await supabase
      .from('preguntas')
      .select('id', { count: 'exact', head: true })
      .eq('tema_id', temaId)

    if ((count || 0) > 0) {
      setConfirmandoBorrarTema(null)
      setErrorTema('Este contenido tiene preguntas — desactívalas todas antes de poder borrarlo.')
      return
    }

    await supabase.from('temas').delete().eq('id', temaId)
    setConfirmandoBorrarTema(null)
    cargarCurso()
  }

  async function cargarPreguntas(temaId) {
    const { data } = await supabase
      .from('preguntas')
      .select('id, enunciado, alternativas, correcta, dificultad, activa, imagen_url')
      .eq('tema_id', temaId)
      .order('creado_en', { ascending: false })
    setPreguntasPorTema((prev) => ({ ...prev, [temaId]: data || [] }))
  }

  async function cargarMateriales(temaId) {
    const { data } = await supabase
      .from('materiales_tema')
      .select('id, nombre_archivo, url, creado_en')
      .eq('tema_id', temaId)
      .order('creado_en', { ascending: true })
    setMaterialesPorTema((prev) => ({ ...prev, [temaId]: data || [] }))
  }

  async function subirMaterial(temaId, file) {
    if (!file) return
    setSubiendoMaterial(true)

    const rutaArchivo = `${temaId}/${Date.now()}-${file.name}`
    const { error: errorSubida } = await supabase.storage.from('materiales').upload(rutaArchivo, file)

    if (!errorSubida) {
      const { data } = supabase.storage.from('materiales').getPublicUrl(rutaArchivo)
      await supabase.from('materiales_tema').insert({
        tema_id: temaId,
        nombre_archivo: file.name,
        url: data.publicUrl,
        subido_por: perfil.id,
      })
      cargarMateriales(temaId)
    }
    setSubiendoMaterial(false)
  }

  async function borrarMaterial(materialId, temaId) {
    await supabase.from('materiales_tema').delete().eq('id', materialId)
    setConfirmandoBorrarMaterial(null)
    cargarMateriales(temaId)
  }

  async function alternarActiva(pregunta, temaId) {
    await supabase.from('preguntas').update({ activa: !pregunta.activa }).eq('id', pregunta.id)
    cargarPreguntas(temaId)
  }

  function actualizarConfig(campo, valor) {
    setCurso((prev) => ({ ...prev, [campo]: valor }))
    setConfigSucia(true)
  }

  function actualizarTipo(tipo) {
    const cambios = {
      permite_duelos: tipo !== 'certificacion',
      permite_individual: tipo === 'certificacion',
      permite_practica_individual: tipo === 'prueba',
    }
    if (tipo === 'certificacion') cambios.fecha_fin_duelos = null
    if (tipo !== 'certificacion' && seccion === 'material') setSeccion('configuracion')
    setCurso((prev) => ({ ...prev, ...cambios }))
    setConfigSucia(true)
  }

  function actualizarFechaFin(valor) {
    const cambios = { fecha_fin: valor || null }
    if (valor && curso?.fecha_fin_duelos && curso.fecha_fin_duelos > valor) {
      cambios.fecha_fin_duelos = valor
    }
    setCurso((prev) => ({ ...prev, ...cambios }))
    setConfigSucia(true)
  }

  async function guardarConfiguracion() {
    setConfirmandoGuardarConfig(false)
    setGuardandoConfig(true)
    await supabase
      .from('cursos')
      .update({
        cantidad_preguntas: curso.cantidad_preguntas,
        tiempo_por_pregunta: curso.tiempo_por_pregunta,
        fecha_fin: curso.fecha_fin,
        permite_duelos: curso.permite_duelos,
        permite_individual: curso.permite_individual,
        permite_practica_individual: curso.permite_practica_individual,
        porcentaje_certificacion: curso.porcentaje_certificacion,
        fecha_fin_duelos: curso.fecha_fin_duelos,
        mostrar_ranking: curso.mostrar_ranking,
      })
      .eq('id', id)
    setGuardandoConfig(false)
    setConfigSucia(false)
    setCursoGuardado(curso)
  }

  function cancelarCambios() {
    setCurso(cursoGuardado)
    setConfigSucia(false)
  }

  async function actualizarFechaFinDuelos(valor) {
    let final = valor || null
    if (final && curso?.fecha_fin && final > curso.fecha_fin) final = curso.fecha_fin
    await actualizarConfig('fecha_fin_duelos', final)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-6 text-sm text-slate-400">Cargando...</main>
      </div>
    )
  }

  const esAdminReal = esSuperAdmin || (curso?.organizacion_id && orgsAdmin.includes(curso.organizacion_id))
  const esCreadorPropio = !esAdminReal && curso?.creado_por === perfil?.id && !curso?.organizacion_id && !curso?.permite_individual
  const tieneAcceso = esAdminReal || esCreadorPropio
  // A diferencia de esCreadorPropio, no excluye admins: un curso personal
  // sin organización (privado con invitación, o público autogestionado)
  // se puede invitar a amigos sin importar si el creador es admin.
  const esCursoPersonalPropio = curso?.creado_por === perfil?.id && !curso?.organizacion_id && !curso?.permite_individual

  if (!tieneAcceso) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-6">
          <p className="text-sm text-slate-500">No tienes permisos para ver esta página.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-6 relative">
        <div
          className="absolute inset-x-0 top-0 h-28 pointer-events-none"
          style={{
            background:
              'radial-gradient(80% 100% at 15% 0%, rgba(0,175,242,0.12), rgba(0,0,0,0) 70%), ' +
              'radial-gradient(70% 100% at 100% 0%, rgba(255,187,0,0.12), rgba(0,0,0,0) 65%)',
          }}
        />

        <div className="relative">
        <button onClick={volverACursos} className="text-xs text-slate-400 hover:text-brand-blue-700">
          ← Volver a {esAdminReal ? 'actividades' : curso?.permite_practica_individual ? 'pruebas' : 'trivias'}
        </button>
        <h1 className="text-xl font-semibold text-slate-800 mt-2 mb-4">{curso?.nombre}</h1>

        {solicitudesPlazo.length > 0 && (
          <div className="bg-white shadow-sm border-[1.5px] border-brand-amber-500 rounded-2xl p-4 mb-6">
            <p className="text-sm font-medium text-brand-amber-700 mb-2">
              ⏳ Solicitudes de más plazo ({solicitudesPlazo.length})
            </p>
            <div className="flex flex-col gap-2">
              {solicitudesPlazo.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm text-slate-700">{s.perfiles?.nombre}</p>
                    <p className="text-xs text-slate-400">{s.perfiles?.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/curso/${id}`}
                      className="text-xs bg-white text-brand-blue-700 border-[1.5px] border-brand-blue-500 px-2.5 py-1 rounded-full font-semibold"
                    >
                      Ir a la actividad
                    </Link>
                    <button
                      onClick={() => resolverSolicitud(s.id)}
                      className="text-xs text-slate-400 hover:text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full"
                    >
                      Marcar como resuelta
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-brand-amber-700/80 mt-2">
              Cambia y guarda la fecha límite en Configuración para reactivar la actividad antes de marcar como resuelta.
            </p>
          </div>
        )}

        <nav className="flex items-center gap-4 border-b border-slate-200 mb-6 text-sm">
          {[
            { id: 'configuracion', label: 'Configuración' },
            { id: 'temas', label: 'Contenido' },
            ...(curso?.permite_individual ? [{ id: 'material', label: 'Material de estudio' }] : []),
            { id: 'preguntas', label: 'Preguntas' },
            ...(curso?.organizacion_id
              ? [{ id: 'asignar', label: 'Asignar' }]
              : esCursoPersonalPropio
                ? [{ id: 'asignar', label: 'Invitar amigos' }]
                : []),
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSeccion(s.id)}
              className={`pb-2 border-b-2 -mb-px ${
                seccion === s.id
                  ? 'border-brand-blue-500 text-brand-blue-700 font-medium'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {seccion === 'configuracion' && (
        <div className="bg-white shadow-sm rounded-2xl p-4 mb-6 flex flex-col gap-2">
          <p className="text-sm font-medium text-slate-700 mb-1">Configuración</p>
          <p className="text-xs text-slate-500 mb-2">
            Acá defines los ajustes generales: cuántas preguntas se hacen por intento, el tiempo
            por pregunta, la fecha límite, si es Certificación, Prueba o Trivia, y si se
            muestra el ranking.
          </p>

          <label className="text-xs text-slate-500 border-b border-slate-100 pb-3 mb-1">
            Tipo de actividad
            <select
              value={
                curso?.permite_individual
                  ? 'certificacion'
                  : curso?.permite_practica_individual
                    ? 'prueba'
                    : 'trivia'
              }
              onChange={(e) => actualizarTipo(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
            >
              {esAdminReal && <option value="certificacion">Certificación (evaluación individual)</option>}
              <option value="prueba">Pruebas (duelos + práctica libre)</option>
              <option value="trivia">Trivias (solo duelos, sin práctica)</option>
            </select>
          </label>
          {curso?.permite_individual && (
            <>
              <label className="text-xs text-slate-500 ml-5">
                % para aprobar en el modo individual
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={curso?.porcentaje_certificacion ?? 70}
                  onChange={(e) => actualizarConfig('porcentaje_certificacion', Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
                />
              </label>
              <label className="flex items-center gap-1.5 text-sm text-slate-600 ml-5">
                <input
                  type="checkbox"
                  checked={curso?.permite_duelos || false}
                  onChange={(e) => actualizarConfig('permite_duelos', e.target.checked)}
                  className="accent-brand-blue-500"
                />
                Permitir duelos durante un periodo (para practicar antes del examen)
              </label>
              {curso?.permite_duelos && (
                <>
                  <label className="text-xs text-slate-500 ml-8">
                    Fecha límite de duelos (vacío = sin límite; no puede ser posterior a la fecha del examen)
                    <input
                      type="date"
                      value={curso?.fecha_fin_duelos ?? ''}
                      max={curso?.fecha_fin || undefined}
                      onChange={(e) => actualizarFechaFinDuelos(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
                    />
                  </label>
                </>
              )}
            </>
          )}

          <label className="text-xs text-slate-500 mb-1">
            Preguntas por intento (duelos y modo individual)
            <input
              type="number"
              min={1}
              max={50}
              value={curso?.cantidad_preguntas ?? 5}
              onChange={(e) => actualizarConfig('cantidad_preguntas', Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </label>

          <label className="text-xs text-slate-500 mb-1">
            Tiempo por pregunta en segundos (0 = sin límite)
            <input
              type="number"
              min={0}
              max={600}
              value={curso?.tiempo_por_pregunta ?? 0}
              onChange={(e) => actualizarConfig('tiempo_por_pregunta', Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
            />
            <span className="block text-slate-400 mt-0.5 font-normal">
              Valor por defecto para toda la actividad. Cada contenido puede definir su propio tiempo
              más abajo, que tiene prioridad sobre este.
            </span>
          </label>

          <label className="text-xs text-slate-500 mb-1">
            Fecha límite (vacío = sin fecha de término)
            <input
              type="date"
              value={curso?.fecha_fin ?? ''}
              onChange={(e) => actualizarFechaFin(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </label>
          {curso?.fecha_fin && curso.fecha_fin < new Date().toISOString().slice(0, 10) && (
            <p className="text-xs text-red-500 -mt-1">
              ⚠️ Esta actividad ya venció y está oculta para los usuarios. Cambia o borra la fecha para reactivarla.
            </p>
          )}

          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={curso?.mostrar_ranking || false}
              onChange={(e) => actualizarConfig('mostrar_ranking', e.target.checked)}
              className="accent-brand-blue-500"
            />
            Mostrar ranking
          </label>

          <div className="flex items-center gap-3 border-t border-slate-100 pt-3 mt-1">
            {confirmandoGuardarConfig ? (
              <>
                <span className="text-sm text-slate-600">¿Guardar los cambios?</span>
                <button
                  onClick={guardarConfiguracion}
                  disabled={guardandoConfig}
                  className="bg-brand-blue-500 text-white rounded-full py-2 px-4 text-sm font-semibold disabled:opacity-50"
                >
                  {guardandoConfig ? 'Guardando...' : 'Sí, guardar'}
                </button>
                <button
                  onClick={() => setConfirmandoGuardarConfig(false)}
                  disabled={guardandoConfig}
                  className="text-sm text-slate-500 hover:text-red-500 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setConfirmandoGuardarConfig(true)}
                  disabled={!configSucia || guardandoConfig}
                  className="bg-brand-blue-500 text-white rounded-full py-2 px-4 text-sm font-semibold disabled:opacity-50"
                >
                  Guardar cambios
                </button>
                {configSucia && (
                  <button
                    onClick={cancelarCambios}
                    disabled={guardandoConfig}
                    className="text-sm text-slate-500 hover:text-red-500 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                )}
                {configSucia && <p className="text-xs text-amber-600 ml-auto">Tienes cambios sin guardar.</p>}
              </>
            )}
          </div>
        </div>
        )}

        {seccion === 'temas' && (
        <>
        <div className="bg-white shadow-sm rounded-2xl p-4 mb-6">
          <p className="text-sm font-medium text-slate-700 mb-1">Contenido</p>
          <p className="text-xs text-slate-500 mb-3">
            Cada contenido agrupa sus propias preguntas — crea varios si quieres separarlo por
            módulos o capítulos, o uno solo si no necesitas dividirlo. Desde acá puedes renombrarlos,
            borrarlos y definir un tiempo por pregunta específico para cada uno.
          </p>
          <form onSubmit={crearTema} className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre del nuevo contenido"
              value={nombreTema}
              onChange={(e) => setNombreTema(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            />
            <button
              type="submit"
              disabled={creandoTema}
              className="bg-brand-blue-500 text-white text-sm px-4 rounded-full font-semibold disabled:opacity-50"
            >
              {creandoTema ? 'Creando...' : 'Agregar contenido'}
            </button>
          </form>
        </div>

        {errorTema && <p className="text-xs text-red-500 mb-3">{errorTema}</p>}

        <div className="flex flex-col gap-3">
          {temas.map((t, i) => (
            <div key={t.id} className="bg-white shadow-sm rounded-2xl p-4">
              <div className="flex items-center justify-between gap-2">
                {temaEditando !== t.id && (
                  <div className="flex flex-col shrink-0">
                    <button
                      onClick={() => moverTema(i, -1)}
                      disabled={i === 0}
                      className="text-slate-400 hover:text-brand-blue-700 disabled:opacity-30 disabled:hover:text-slate-400 leading-none"
                      title="Subir"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moverTema(i, 1)}
                      disabled={i === temas.length - 1}
                      className="text-slate-400 hover:text-brand-blue-700 disabled:opacity-30 disabled:hover:text-slate-400 leading-none"
                      title="Bajar"
                    >
                      ▼
                    </button>
                  </div>
                )}
                {temaEditando === t.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={nombreEditado}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      className="flex-1 border border-slate-300 rounded-lg px-2 py-1 text-sm"
                      autoFocus
                    />
                    <button onClick={() => guardarNombreTema(t.id)} className="text-xs text-brand-blue-700">Guardar</button>
                    <button onClick={() => setTemaEditando(null)} className="text-xs text-slate-400">Cancelar</button>
                  </div>
                ) : (
                  <p className="font-medium text-slate-800 flex-1">{t.nombre}</p>
                )}

                {temaEditando !== t.id && confirmandoBorrarTema !== t.id && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setTemaEditando(t.id)
                        setNombreEditado(t.nombre)
                      }}
                      className="text-xs text-slate-400 hover:text-slate-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmandoBorrarTema(t.id)}
                      className="text-xs text-slate-400 hover:text-red-500"
                    >
                      Borrar
                    </button>
                  </div>
                )}
                {confirmandoBorrarTema === t.id && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-red-500">¿Borrar?</span>
                    <button onClick={() => borrarTema(t.id)} className="text-xs text-red-600 font-medium">Sí, borrar</button>
                    <button onClick={() => setConfirmandoBorrarTema(null)} className="text-xs text-slate-400">Cancelar</button>
                  </div>
                )}
              </div>

              {temaEditando !== t.id && (
                <div className="mt-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-400">
                    Tiempo solo para este contenido (s)
                    <input
                      type="number"
                      min={0}
                      max={600}
                      placeholder={`usa el del curso: ${curso?.tiempo_por_pregunta ?? 0}`}
                      value={t.tiempo_por_pregunta ?? ''}
                      onChange={(e) =>
                        actualizarTiempoTema(t.id, e.target.value === '' ? null : Number(e.target.value))
                      }
                      className="w-40 border border-slate-200 rounded-md px-2 py-0.5 text-slate-600"
                    />
                    {t.tiempo_por_pregunta !== temasGuardados[t.id] && (
                      <button onClick={() => guardarTiempoTema(t.id)} className="text-xs text-brand-blue-700 font-medium">
                        Guardar
                      </button>
                    )}
                  </label>
                  <p className="text-slate-300 text-xs mt-0.5">
                    Vacío = usa el valor del curso ({curso?.tiempo_por_pregunta ?? 0}s). Solo aplica al
                    practicar o retar en este contenido específico.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
        </>
        )}

        {seccion === 'material' && (
        <div className="flex flex-col gap-3">
          <div className="bg-white shadow-sm rounded-2xl p-4">
            <p className="text-sm font-medium text-slate-700 mb-1">Material de estudio</p>
            <p className="text-xs text-slate-500">
              Sube acá los archivos (PDF, documentos, etc.) que quieras poner a disposición de los
              estudiantes para prepararse, organizados por cada contenido del curso.
            </p>
          </div>
          {temas.length === 0 && (
            <div className="bg-white shadow-sm rounded-2xl p-4 text-sm text-slate-500">
              Esta actividad todavía no tiene contenido cargado.
            </div>
          )}
          {temas.map((t) => (
            <div key={t.id} className="bg-white shadow-sm rounded-2xl p-4">
              <p className="font-medium text-slate-800 mb-2">{t.nombre}</p>
              <div className="flex flex-col gap-2 mb-2">
                {(materialesPorTema[t.id] || []).length === 0 && (
                  <p className="text-xs text-slate-400">Todavía no hay material subido.</p>
                )}
                {(materialesPorTema[t.id] || []).map((m, i) => (
                  <div key={m.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-brand-blue-700 hover:underline truncate"
                    >
                      {i + 1}. {iconoMaterial(m.nombre_archivo)} {m.nombre_archivo}
                    </a>
                    {confirmandoBorrarMaterial === m.id ? (
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <button onClick={() => borrarMaterial(m.id, t.id)} className="text-xs text-red-600 font-medium">
                          Sí, borrar
                        </button>
                        <button onClick={() => setConfirmandoBorrarMaterial(null)} className="text-xs text-slate-400">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmandoBorrarMaterial(m.id)}
                        className="text-xs text-slate-400 hover:text-red-500 shrink-0 ml-2"
                      >
                        Borrar
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <label className="text-xs bg-white text-brand-blue-700 border-[1.5px] border-brand-blue-500 px-3 py-1.5 rounded-full font-semibold cursor-pointer inline-block">
                {subiendoMaterial ? 'Subiendo...' : '+ Subir archivo'}
                <input
                  type="file"
                  className="hidden"
                  disabled={subiendoMaterial}
                  onChange={(e) => subirMaterial(t.id, e.target.files?.[0])}
                />
              </label>
            </div>
          ))}
        </div>
        )}

        {seccion === 'preguntas' && (
        <div className="flex flex-col gap-3">
          <div className="bg-white shadow-sm rounded-2xl p-4">
            <p className="text-sm font-medium text-slate-700 mb-1">Preguntas</p>
            <p className="text-xs text-slate-500">
              Acá creas y editas las preguntas de opción múltiple de cada contenido, defines su
              dificultad, y puedes activarlas o desactivarlas sin borrarlas.
            </p>
          </div>
          {temas.length === 0 && (
            <div className="bg-white shadow-sm rounded-2xl p-4 text-sm text-slate-500">
              Esta actividad todavía no tiene contenido cargado.
            </div>
          )}
          {temas.map((t) => (
            <div key={t.id} className="bg-white shadow-sm rounded-2xl p-4">
              <p className="font-medium text-slate-800">{t.nombre}</p>
              <PreguntasTema
                temaId={t.id}
                preguntas={preguntasPorTema[t.id] || []}
                onCambio={() => cargarPreguntas(t.id)}
                onAlternarActiva={(p) => alternarActiva(p, t.id)}
              />
            </div>
          ))}
        </div>
        )}

        {seccion === 'asignar' && (
        <div className="bg-white shadow-sm rounded-2xl p-4">
          {curso?.organizacion_id ? (
            <>
              <p className="text-sm font-medium text-slate-700 mb-1">Asignar actividad a miembros de la organización</p>
              <p className="text-xs text-slate-500 mb-3">
                Selecciona a los miembros de tu organización que quieres que tengan acceso a esta actividad
                privada. Quedan inscritos de inmediato y les aparece en su lista de actividades; también puedes
                quitarles el acceso cuando quieras.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-700 mb-1">Invitar amigos</p>
              <p className="text-xs text-slate-500 mb-3">
                Selecciona a los amigos que quieres invitar a esta actividad privada. Quedan inscritos
                de inmediato y les aparece en su lista de actividades; también puedes quitarles el acceso
                cuando quieras.
              </p>
            </>
          )}

          {miembros.length === 0 && curso?.organizacion_id && (
            <p className="text-sm text-slate-500">Esta organización todavía no tiene miembros.</p>
          )}
          {miembros.length === 0 && !curso?.organizacion_id && (
            <p className="text-sm text-slate-500">
              Todavía no tienes amigos agregados. Ve a{' '}
              <Link to="/amigos" className="text-brand-blue-700">Amigos</Link>.
            </p>
          )}

          <div className="flex flex-col gap-1">
            {miembros.map((m) => {
              const inscripcion = inscripcionesPorUsuario[m.usuario_id]
              return (
                <div key={m.usuario_id} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    {!inscripcion && (
                      <input
                        type="checkbox"
                        checked={seleccionados.includes(m.usuario_id)}
                        onChange={() => alternarSeleccionado(m.usuario_id)}
                        className="accent-brand-blue-500"
                      />
                    )}
                    <span>
                      {m.perfiles?.nombre}
                      <span className="text-xs text-slate-400"> · {m.perfiles?.email}</span>
                    </span>
                  </label>
                  {inscripcion ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md">
                        {inscripcion.estado === 'asignado' ? 'Asignado' : 'Inscrito'}
                      </span>
                      <button
                        onClick={() => quitarAcceso(inscripcion.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          {miembros.length > 0 && (
            <button
              onClick={asignarSeleccionados}
              disabled={seleccionados.length === 0 || asignando}
              className="mt-4 bg-brand-blue-500 text-white rounded-full py-2 px-4 text-sm font-semibold disabled:opacity-50"
            >
              {asignando ? 'Asignando...' : `Asignar a ${seleccionados.length} seleccionado(s)`}
            </button>
          )}
        </div>
        )}
        </div>
      </main>

      {confirmandoSalida && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 max-w-sm w-full">
            <p className="text-sm text-slate-700 mb-4">
              Tienes cambios de configuración sin guardar. ¿Seguro que quieres salir sin guardar?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmandoSalida(false)}
                className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5"
              >
                Seguir editando
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="text-sm bg-red-600 text-white rounded-lg px-3 py-1.5"
              >
                Salir sin guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PreguntasTema({ temaId, preguntas, onCambio, onAlternarActiva }) {
  const [enunciado, setEnunciado] = useState('')
  const [alternativas, setAlternativas] = useState(['', '', '', ''])
  const [correcta, setCorrecta] = useState(0)
  const [dificultad, setDificultad] = useState('facil')
  const [imagenUrl, setImagenUrl] = useState('')
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [editandoId, setEditandoId] = useState(null)

  function actualizarAlternativa(i, valor) {
    setAlternativas((prev) => prev.map((a, idx) => (idx === i ? valor : a)))
  }

  async function subirImagen(file) {
    if (!file) return
    setSubiendoImagen(true)
    const ruta = `${temaId}/${Date.now()}-${file.name}`
    const { error: errorSubida } = await supabase.storage.from('preguntas-imagenes').upload(ruta, file)
    if (!errorSubida) {
      const { data } = supabase.storage.from('preguntas-imagenes').getPublicUrl(ruta)
      setImagenUrl(data.publicUrl)
    }
    setSubiendoImagen(false)
  }

  async function crearPregunta(e) {
    e.preventDefault()
    if (!enunciado.trim() || alternativas.some((a) => !a.trim())) {
      setError('Completa el enunciado y las 4 alternativas.')
      return
    }
    setCreando(true)
    setError('')

    const { error } = await supabase.from('preguntas').insert({
      tema_id: temaId,
      enunciado: enunciado.trim(),
      alternativas: alternativas.map((a) => a.trim()),
      correcta,
      dificultad,
      imagen_url: imagenUrl || null,
      activa: true,
    })

    if (error) setError('No se pudo crear la pregunta.')
    else {
      setEnunciado('')
      setAlternativas(['', '', '', ''])
      setCorrecta(0)
      setDificultad('facil')
      setImagenUrl('')
      onCambio()
    }
    setCreando(false)
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <form onSubmit={crearPregunta} className="flex flex-col gap-2 mb-4 bg-slate-50 rounded-lg p-3">
        <input
          type="text"
          placeholder="Enunciado de la pregunta"
          value={enunciado}
          onChange={(e) => setEnunciado(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />

        <div className="flex items-center gap-2">
          {imagenUrl ? (
            <div className="flex items-center gap-2">
              <img src={imagenUrl} alt="" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
              <button type="button" onClick={() => setImagenUrl('')} className="text-xs text-slate-400 hover:text-red-500">
                Quitar imagen
              </button>
            </div>
          ) : (
            <label className="text-xs bg-white text-brand-blue-700 border-[1.5px] border-brand-blue-500 px-3 py-1.5 rounded-full font-semibold cursor-pointer inline-block">
              {subiendoImagen ? 'Subiendo...' : '+ Agregar imagen (opcional)'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={subiendoImagen}
                onChange={(e) => subirImagen(e.target.files?.[0])}
              />
            </label>
          )}
        </div>

        {alternativas.map((alt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correcta-${temaId}`}
              checked={correcta === i}
              onChange={() => setCorrecta(i)}
            />
            <input
              type="text"
              placeholder={`Alternativa ${i + 1}`}
              value={alt}
              onChange={(e) => actualizarAlternativa(i, e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        ))}
        <p className="text-xs text-slate-400">Marca con el círculo cuál alternativa es la correcta.</p>

        <select
          value={dificultad}
          onChange={(e) => setDificultad(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="facil">Fácil</option>
          <option value="media">Media</option>
          <option value="dificil">Difícil</option>
        </select>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={creando}
          className="bg-brand-blue-500 text-white text-sm rounded-full py-2 font-semibold disabled:opacity-50"
        >
          {creando ? 'Creando...' : 'Agregar pregunta'}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {preguntas.length === 0 && <p className="text-xs text-slate-400">Este contenido no tiene preguntas todavía.</p>}
        {preguntas.map((p) =>
          editandoId === p.id ? (
            <PreguntaEdicion
              key={p.id}
              pregunta={p}
              temaId={temaId}
              onCancelar={() => setEditandoId(null)}
              onGuardado={() => {
                setEditandoId(null)
                onCambio()
              }}
            />
          ) : (
            <div key={p.id} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  {p.imagen_url && (
                    <img src={p.imagen_url} alt="" className="w-10 h-10 object-cover rounded-md border border-slate-200 shrink-0" />
                  )}
                  <p className="text-sm text-slate-700">{p.enunciado}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setEditandoId(p.id)} className="text-xs text-slate-400 hover:text-slate-700">
                    Editar
                  </button>
                  <button
                    onClick={() => onAlternarActiva(p)}
                    className={`text-xs px-2 py-1 rounded-md ${
                      p.activa ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {p.activa ? 'Activa' : 'Inactiva'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Correcta: {p.alternativas?.[p.correcta]} · Dificultad: {p.dificultad}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

function PreguntaEdicion({ pregunta, temaId, onCancelar, onGuardado }) {
  const [enunciado, setEnunciado] = useState(pregunta.enunciado)
  const [alternativas, setAlternativas] = useState([...pregunta.alternativas])
  const [correcta, setCorrecta] = useState(pregunta.correcta)
  const [dificultad, setDificultad] = useState(pregunta.dificultad)
  const [imagenUrl, setImagenUrl] = useState(pregunta.imagen_url || '')
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function actualizarAlternativa(i, valor) {
    setAlternativas((prev) => prev.map((a, idx) => (idx === i ? valor : a)))
  }

  async function subirImagen(file) {
    if (!file) return
    setSubiendoImagen(true)
    const ruta = `${temaId}/${Date.now()}-${file.name}`
    const { error: errorSubida } = await supabase.storage.from('preguntas-imagenes').upload(ruta, file)
    if (!errorSubida) {
      const { data } = supabase.storage.from('preguntas-imagenes').getPublicUrl(ruta)
      setImagenUrl(data.publicUrl)
    }
    setSubiendoImagen(false)
  }

  async function guardar() {
    if (!enunciado.trim() || alternativas.some((a) => !a.trim())) {
      setError('Completa el enunciado y las 4 alternativas.')
      return
    }
    setGuardando(true)
    setError('')

    const { error } = await supabase
      .from('preguntas')
      .update({
        enunciado: enunciado.trim(),
        alternativas: alternativas.map((a) => a.trim()),
        correcta,
        dificultad,
        imagen_url: imagenUrl || null,
      })
      .eq('id', pregunta.id)

    if (error) {
      setError('No se pudo guardar.')
      setGuardando(false)
    } else {
      onGuardado()
    }
  }

  return (
    <div className="border border-brand-blue-500/30 rounded-lg p-3 bg-brand-blue-50 flex flex-col gap-2">
      <input
        type="text"
        value={enunciado}
        onChange={(e) => setEnunciado(e.target.value)}
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
      />

      <div className="flex items-center gap-2">
        {imagenUrl ? (
          <div className="flex items-center gap-2">
            <img src={imagenUrl} alt="" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
            <button type="button" onClick={() => setImagenUrl('')} className="text-xs text-slate-400 hover:text-red-500">
              Quitar imagen
            </button>
          </div>
        ) : (
          <label className="text-xs bg-white text-brand-blue-700 border-[1.5px] border-brand-blue-500 px-3 py-1.5 rounded-full font-semibold cursor-pointer inline-block">
            {subiendoImagen ? 'Subiendo...' : '+ Agregar imagen (opcional)'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={subiendoImagen}
              onChange={(e) => subirImagen(e.target.files?.[0])}
            />
          </label>
        )}
      </div>

      {alternativas.map((alt, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="radio"
            name={`editar-correcta-${pregunta.id}`}
            checked={correcta === i}
            onChange={() => setCorrecta(i)}
          />
          <input
            type="text"
            value={alt}
            onChange={(e) => actualizarAlternativa(i, e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      ))}
      <select
        value={dificultad}
        onChange={(e) => setDificultad(e.target.value)}
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
      >
        <option value="facil">Fácil</option>
        <option value="media">Media</option>
        <option value="dificil">Difícil</option>
      </select>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex-1 bg-brand-blue-500 text-white text-sm rounded-full py-2 font-semibold disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
        <button onClick={onCancelar} className="text-sm text-slate-500 px-3">
          Cancelar
        </button>
      </div>
    </div>
  )
}
