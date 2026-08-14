import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import RutaProtegida from './components/RutaProtegida'
import Login from './pages/Login'
import Home from './pages/Home'
import Amigos from './pages/Amigos'
import Perfil from './pages/Perfil'
import CursoDetalle from './pages/CursoDetalle'
import JugarDuelo from './pages/JugarDuelo'
import ResultadoDuelo from './pages/ResultadoDuelo'
import PracticaIndividual from './pages/PracticaIndividual'
import RankingCurso from './pages/RankingCurso'
import AdminCursos from './pages/AdminCursos'
import AdminCurso from './pages/AdminCurso'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RutaProtegida>
                <Home />
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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
