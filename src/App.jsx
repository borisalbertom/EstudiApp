import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import RutaProtegida from './components/RutaProtegida'
import Login from './pages/Login'
import Home from './pages/Home'
import Amigos from './pages/Amigos'
import Ranking from './pages/Ranking'
import Perfil from './pages/Perfil'
import CursoDetalle from './pages/CursoDetalle'
import JugarDuelo from './pages/JugarDuelo'
import ResultadoDuelo from './pages/ResultadoDuelo'

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
            path="/amigos"
            element={
              <RutaProtegida>
                <Amigos />
              </RutaProtegida>
            }
          />
          <Route
            path="/ranking"
            element={
              <RutaProtegida>
                <Ranking />
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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
