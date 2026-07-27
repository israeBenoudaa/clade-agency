import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, requireStaff, requireClient, requireDirector }) {
  const { session, profile, loading, isStaff, isClient, isDirector, isDemoMode } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-electric animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-electric animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-electric animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper p-8">
        <div className="text-center max-w-md">
          <h2 className="font-display text-3xl text-ink mb-3">Profil introuvable</h2>
          <p className="text-muted text-sm">
            Votre compte n'est pas associé à un profil. Contactez votre administrateur.
          </p>
        </div>
      </div>
    )
  }

  // En mode démo, toutes les pages sont accessibles librement
  if (isDemoMode) return children

  if (requireStaff && !isStaff) {
    return <Navigate to="/client" replace />
  }

  if (requireClient && !isClient) {
    return <Navigate to="/app" replace />
  }

  if (requireDirector && !isDirector) {
    return <Navigate to="/app" replace />
  }

  return children
}
