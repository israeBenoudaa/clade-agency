import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { CladeBrand } from './ui/Logo'

export function ProtectedRoute({ children, requireStaff, requireClient, requireDirector, requireRoles, requireModule }) {
  const { session, profile, loading, isStaff, isClient, isDirector, isDemoMode, pinPending } = useAuth()
  const { employes } = useData()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="animate-pulse">
          <CladeBrand size="lg" />
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Directeur authentifié Supabase mais PIN pas encore validé → retour login (step PIN)
  if (pinPending) {
    return <Navigate to="/login" replace />
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

  const hasModuleGrant = requireModule
    ? (employes?.find(e => String(e.id) === String(profile?.employe_id))?.permissions?.modules || []).includes(requireModule)
    : false

  if (requireRoles && !isDemoMode && !requireRoles.includes(profile.role) && !hasModuleGrant) {
    return <Navigate to="/app" replace />
  }

  return children
}
