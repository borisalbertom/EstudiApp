import { Link } from 'react-router-dom'

const CARACTERISTICAS = [
  {
    icono: '📚',
    titulo: 'Cursos',
    texto: 'Certificación con examen final, material de estudio y avance paso a paso.',
  },
  {
    icono: '🎯',
    titulo: 'Pruebas',
    texto: 'Duelos y práctica libre para estudiar en serio de cara a un examen real.',
  },
  {
    icono: '🎉',
    titulo: 'Trivias',
    texto: 'Puro duelo entre amigos, sin presión — para pasarlo bien mientras aprendes.',
  },
  {
    icono: '🔥',
    titulo: 'Racha y logros',
    texto: 'Mantén tu racha de días seguidos y desbloquea logros a medida que avanzas.',
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <header className="sticky top-4 z-20 max-w-3xl mx-auto px-4">
        <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-full shadow-sm px-5 py-3 flex items-center justify-between">
          <span className="font-semibold text-slate-800">🎯 EstudiApp</span>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-sm text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-full"
            >
              Ingresar
            </Link>
            <Link
              to="/login?modo=registrar"
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-1.5 rounded-full hover:bg-indigo-700"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center py-16 sm:py-24">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl font-semibold text-slate-800 leading-tight">
              Aprende <span className="text-indigo-600">jugando</span>,
              <br />
              con <span className="text-indigo-600">amigos</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-500 mt-5 max-w-lg mx-auto lg:mx-0">
              EstudiApp mezcla estudio y trivia: prepárate para una prueba real, reta a un amigo,
              o simplemente juega por diversión — todo en un solo lugar.
            </p>
            <div className="flex items-center justify-center lg:justify-start gap-3 mt-8">
              <Link
                to="/login?modo=registrar"
                className="bg-indigo-600 text-white rounded-full px-7 py-3.5 text-sm font-medium hover:bg-indigo-700 shadow-sm"
              >
                Crear cuenta gratis
              </Link>
              <Link
                to="/login"
                className="bg-white border border-slate-300 text-slate-700 rounded-full px-7 py-3.5 text-sm font-medium hover:border-indigo-300"
              >
                Ingresar
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-tr from-indigo-200 via-indigo-100 to-amber-100 rounded-[2rem] blur-2xl opacity-60" />
            <div className="relative bg-white rounded-2xl shadow-xl border border-slate-100 p-5 w-full max-w-xs mx-auto">
              <p className="text-sm text-slate-500 mb-3">Hola, Ana 👋</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                  <p className="text-sm font-semibold text-slate-800">🔥 12</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Racha</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                  <p className="text-sm font-semibold text-slate-800">🏆 8/12</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Logros</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                  <p className="text-sm font-semibold text-slate-800">📝 2</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Pendientes</p>
                </div>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between mb-2">
                <span className="text-xs text-indigo-900 font-medium">vs Diego</span>
                <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                  Te toca jugar
                </span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                🔥 Racha en riesgo — juega hoy
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-16 sm:pb-24">
          {CARACTERISTICAS.map((c) => (
            <div
              key={c.titulo}
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition"
            >
              <p className="text-2xl mb-2">{c.icono}</p>
              <p className="font-medium text-slate-800 mb-1">{c.titulo}</p>
              <p className="text-sm text-slate-500">{c.texto}</p>
            </div>
          ))}
        </section>

        <section className="relative overflow-hidden bg-indigo-600 rounded-[2rem] text-center px-6 py-14 mb-24">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full opacity-50" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-400 rounded-full opacity-30" />
          <p className="relative text-2xl sm:text-3xl font-semibold text-white">
            ¿Tu empresa u organización quiere sumarse?
          </p>
          <p className="relative text-sm text-indigo-100 mt-2 max-w-md mx-auto">
            Cursos privados por dominio de correo, asignación por administrador, y seguimiento de avance.
          </p>
          <Link
            to="/login?modo=registrar"
            className="relative inline-block bg-white text-indigo-600 rounded-full px-7 py-3.5 text-sm font-medium mt-6 hover:bg-indigo-50 shadow-sm"
          >
            Crear cuenta gratis
          </Link>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        🎯 EstudiApp
      </footer>

      <div className="sm:hidden sticky bottom-4 px-4 z-20">
        <Link
          to="/login?modo=registrar"
          className="block text-center bg-indigo-600 text-white rounded-full py-3.5 text-sm font-medium shadow-lg"
        >
          Crear cuenta gratis
        </Link>
      </div>
    </div>
  )
}
