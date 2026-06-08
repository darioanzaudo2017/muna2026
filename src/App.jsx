// Proyecto: muna2026 — UNICEF
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { AuthProvider, useAuth } from './context/AuthContext'
import MunicipiosList from './pages/MunicipiosList'
import MunicipioDashboard from './pages/MunicipioDashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import UserManagement from './pages/UserManagement'
import QuestionConfig from './pages/QuestionConfig'
import AutodiagnosticoLayout from './pages/AutodiagnosticoLayout'
import PlanDeAccion from './pages/PlanDeAccion'
import { getOrCreateAutodiagnostico } from './lib/supabase'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return children
}

function SeccionRedirect() {
  const { id, idSeccion } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    getOrCreateAutodiagnostico(Number(id), 2025).then(idAutodiag => {
      if (idAutodiag) {
        navigate(`/municipio/${id}/autodiagnostico/${idAutodiag}`, {
          replace: true,
          state: { initialSectionId: Number(idSeccion) }
        })
      }
    })
  }, [id, idSeccion, navigate])

  return (
    <div className="min-h-screen bg-surface-container flex flex-col items-center justify-center gap-md">
      <span className="material-symbols-outlined text-[48px] text-primary animate-spin">sync</span>
      <p className="font-label-md text-label-md text-on-surface-variant animate-pulse">Redirigiendo al autodiagnóstico...</p>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><MunicipiosList /></ProtectedRoute>} />
      <Route path="/admin/usuarios" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
      <Route path="/admin/preguntas" element={<ProtectedRoute><QuestionConfig /></ProtectedRoute>} />
      <Route path="/municipio/:id" element={<ProtectedRoute><MunicipioDashboard /></ProtectedRoute>} />
      <Route path="/municipio/:id/autodiagnostico/:idAutodiagnostico" element={<ProtectedRoute><AutodiagnosticoLayout /></ProtectedRoute>} />
      <Route path="/municipio/:id/seccion/:idSeccion" element={<ProtectedRoute><SeccionRedirect /></ProtectedRoute>} />
      <Route path="/municipio/:id/plan-de-accion" element={<ProtectedRoute><PlanDeAccion /></ProtectedRoute>} />
    </Routes>
  )
}

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<p className="p-8 text-center text-on-surface-variant">Ocurrió un error inesperado. Por favor recargá la página.</p>}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  )
}

export default App
