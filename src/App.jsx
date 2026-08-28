import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import RutaProtegida from './components/RutaProtegida'
import Login from './pages/Login'
import Portada from './pages/Portada'
import Cursos from './pages/Cursos'
import Pruebas from './pages/Pruebas'
import Trivias from './pages/Trivias'
import Amigos from './pages/Amigos'
import Perfil from './pages/Perfil'
import CursoDetalle from './pages/CursoDetalle'
import JuegoLocal from './pages/JuegoLocal'
import JugarDuelo from './pages/JugarDuelo'
import ResultadoDuelo from './pages/ResultadoDuelo'
import PracticaIndividual from './pages/PracticaIndividual'
import ExamenCurso from './pages/ExamenCurso'
import RankingCurso from './pages/RankingCurso'
import AdminCursos from './pages/AdminCursos'
import AdminCurso from './pages/AdminCurso'
import AdminOrganizaciones from './pages/AdminOrganizaciones'
import MiOrganizacion from './pages/MiOrganizacion'
import LogrosPage from './pages/LogrosPage'
import AdminLogros from './pages/AdminLogros'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Portada />} />
          <Route
            path="/cursos"
            element={
              <RutaProtegida>
                <Cursos />
              </RutaProtegida>
            }
          />
          <Route
            path="/pruebas"
            element={
              <RutaProtegida>
                <Pruebas />
              </RutaProtegida>
            }
          />
          <Route
            path="/trivias"
            element={
              <RutaProtegida>
                <Trivias />
              </RutaProtegida>
            }
          />
          <Route
            path="/curso/:id"
            element={
              <RutaProtegida>
                <CursoDetalle />
              </RutaProtegida>
            }
          />
          <Route
            path="/curso/:id/local"
            element={
              <RutaProtegida>
                <JuegoLocal />
              </RutaProtegida>
            }
          />
          <Route
            path="/duelo/:id"
            element={
              <RutaProtegida>
                <JugarDuelo />
              </RutaProtegida>
            }
          />
          <Route
            path="/duelo/:id/resultado"
            element={
              <RutaProtegida>
                <ResultadoDuelo />
              </RutaProtegida>
            }
          />
          <Route
            path="/curso/:cursoId/tema/:temaId/individual"
            element={
              <RutaProtegida>
                <PracticaIndividual />
              </RutaProtegida>
            }
          />
          <Route
            path="/curso/:cursoId/individual"
            element={
              <RutaProtegida>
                <PracticaIndividual />
              </RutaProtegida>
            }
          />
          <Route
            path="/curso/:cursoId/examen"
            element={
              <RutaProtegida>
                <ExamenCurso />
              </RutaProtegida>
            }
          />
          <Route
            path="/curso/:id/ranking"
            element={
              <RutaProtegida>
                <RankingCurso />
              </RutaProtegida>
            }
          />
          <Route
            path="/amigos"
            element={
              <RutaProtegida>
                <Amigos />
              </RutaProtegida>
            }
          />
          <Route
            path="/perfil"
            element={
              <RutaProtegida>
                <Perfil />
              </RutaProtegida>
            }
          />
          <Route
            path="/admin"
            element={
              <RutaProtegida>
                <AdminCursos />
              </RutaProtegida>
            }
          />
          <Route
            path="/admin/curso/:id"
            element={
              <RutaProtegida>
                <AdminCurso />
              </RutaProtegida>
            }
          />
          <Route
            path="/admin/organizaciones"
            element={
              <RutaProtegida>
                <AdminOrganizaciones />
              </RutaProtegida>
            }
          />
          <Route
            path="/admin/organizacion"
            element={
              <RutaProtegida>
                <MiOrganizacion />
              </RutaProtegida>
            }
          />
          <Route
            path="/logros"
            element={
              <RutaProtegida>
                <LogrosPage />
              </RutaProtegida>
            }
          />
          <Route
            path="/admin/logros"
            element={
              <RutaProtegida>
                <AdminLogros />
              </RutaProtegida>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
