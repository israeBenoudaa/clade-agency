import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// PIN directeur (second facteur après le mot de passe Supabase) — défini dans .env

// ── Demo helpers (mode démo local, pas de vraie session Supabase) ─────────────
const DEMO_NAMES = {
  directeur:   'Directeur Général',
  chef_projet: 'Chef de Projet',
  architecte:  'Architecte Senior',
  rh:          'Responsable RH',
  finance:     'Directeur Financier',
  client:      'Client — Villa Anfa',
}

function makeDemoProfile(role = 'directeur') {
  const base = { id: 'demo-user-id', email: 'demo@clade.ma', full_name: DEMO_NAMES[role] || 'Démo', role, avatar_url: null, username: 'demo', employe_id: null, prospect_id: null }
  if (role === 'client') base.prospect_id = 'demo_prospect_1'
  return base
}

const DEMO_SESSION = { user: { id: 'demo-user-id', email: 'demo@clade.ma' } }

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [session,    setSession]    = useState(null)
  const [profile,    setProfile]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)
  // true = directeur authentifié côté Supabase mais PIN non encore vérifié
  const [pinPending, setPinPending] = useState(false)

  // ── Charge le profil depuis la table profiles ─────────────────────────────
  const loadProfile = async (userId) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) { console.warn('[Auth] Profil introuvable:', error.message); return null }
    return data
  }

  // ── Recrée un profil supprimé depuis les métadonnées de l'auth user ───────
  const restoreProfileFromMetadata = async (user) => {
    const meta = user.user_metadata || {}
    if (!meta.role) return null
    const profileData = {
      id: user.id,
      username: meta.username || user.email?.split('@')[0] || '',
      full_name: meta.full_name || '',
      role: meta.role,
      employe_id: meta.employe_id || null,
      prospect_id: meta.prospect_id || null,
      avatar_url: null,
    }
    const { error } = await supabase.from('profiles').insert(profileData)
    if (error) { console.warn('[Auth] Restauration profil échouée:', error.message); return null }
    console.info('[Auth] Profil restauré depuis les métadonnées pour', user.id)
    return profileData
  }

  // ── Restauration de session au démarrage ──────────────────────────────────
  useEffect(() => {
    // Mode démo uniquement en environnement de développement local
    if (import.meta.env.DEV && localStorage.getItem('clade_demo') === 'true') {
      const role = localStorage.getItem('clade_demo_role') || 'directeur'
      setSession(DEMO_SESSION)
      setProfile(makeDemoProfile(role))
      setIsDemoMode(true)
      setLoading(false)
      return
    }

    // onAuthStateChange gère INITIAL_SESSION + SIGNED_IN + TOKEN_REFRESHED + SIGNED_OUT
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'SIGNED_OUT' || !s) {
        setSession(null)
        setProfile(null)
        setPinPending(false)
        setLoading(false)
        return
      }

      if (event === 'INITIAL_SESSION') {
        // Session restaurée depuis localStorage par Supabase
        setSession(s)
        const prof = await loadProfile(s.user.id)
        if (prof) {
          if (prof.role === 'directeur' && sessionStorage.getItem('clade_pin_ok') !== 'true') {
            // Directeur : le PIN doit être re-vérifié à chaque ouverture de navigateur
            setPinPending(true)
          } else {
            setProfile(prof)
          }
        }
        setLoading(false)
        return
      }

      if (event === 'TOKEN_REFRESHED') {
        // Juste mettre à jour le token, ne pas toucher au profil
        setSession(s)
        return
      }

      // SIGNED_IN géré par signIn() — pas besoin de recharger le profil ici
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line

  // ── signIn ────────────────────────────────────────────────────────────────
  const signIn = async (usernameOrEmail, password) => {
    let email = usernameOrEmail
    if (!usernameOrEmail.includes('@')) {
      const { data: emailVal, error: rpcErr } = await supabase.rpc('get_email_from_username', { uname: usernameOrEmail })
      if (rpcErr || !emailVal) {
        // Le profil a peut-être été supprimé (bug blocage). Essayer les patterns par défaut.
        email = null
      } else {
        email = emailVal
      }
    }

    let authData
    if (email) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid login')) throw new Error('Identifiant ou mot de passe incorrect.')
        throw new Error(error.message)
      }
      authData = data
    } else {
      // Fallback : essayer les patterns d'email par défaut (collaborateur / client)
      const fallbacks = [
        `${usernameOrEmail}@clade.ma`,
        `${usernameOrEmail}@client.clade.ma`,
      ]
      let lastError
      for (const tryEmail of fallbacks) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: tryEmail, password })
        if (!error) { authData = data; break }
        lastError = error
      }
      if (!authData) {
        if (lastError?.message?.includes('Invalid login')) throw new Error('Identifiant ou mot de passe incorrect.')
        throw new Error('Utilisateur introuvable. Vérifiez votre identifiant.')
      }
    }

    // Charger le profil — si manquant (profil supprimé lors d'un blocage), le restaurer
    let prof = await loadProfile(authData.user.id)
    if (!prof) prof = await restoreProfileFromMetadata(authData.user)
    if (!prof) throw new Error('Profil introuvable. Contactez l\'administrateur.')

    setSession(authData.session)

    if (prof.role === 'directeur') {
      setPinPending(true)
      sessionStorage.removeItem('clade_pin_ok')
      return { requiresPin: true }
    }

    setProfile(prof)
    setLoading(false)
    return { user: authData.user }
  }

  // ── Vérification du PIN directeur ─────────────────────────────────────────
  const verifyDirectorPin = async (pin) => {
    const { data: pinOk, error } = await supabase.rpc('verify_director_pin', { input_pin: String(pin) })
    if (error || !pinOk) throw new Error('PIN incorrect')
    const prof = await loadProfile(session.user.id)
    if (!prof) throw new Error('Profil directeur introuvable.')
    sessionStorage.setItem('clade_pin_ok', 'true')
    setPinPending(false)
    setProfile(prof)
    setLoading(false)
  }

  // ── signOut ───────────────────────────────────────────────────────────────
  const signOut = async () => {
    if (isDemoMode) {
      localStorage.removeItem('clade_demo')
      localStorage.removeItem('clade_demo_role')
      setSession(null); setProfile(null); setIsDemoMode(false)
      return
    }
    sessionStorage.removeItem('clade_pin_ok')
    await supabase.auth.signOut()
    // Les states sont réinitialisés par onAuthStateChange → SIGNED_OUT
  }

  // ── switchDemoRole (mode démo uniquement) ─────────────────────────────────
  const switchDemoRole = (role) => {
    if (!isDemoMode) return
    localStorage.setItem('clade_demo_role', role)
    setProfile(makeDemoProfile(role))
  }

  // ── Dérivés ───────────────────────────────────────────────────────────────
  const isDirectorMode = profile?.role === 'directeur' && !pinPending && !isDemoMode
  const isEmployeeMode = !!profile && !['directeur', 'client'].includes(profile?.role) && !isDemoMode
  const isClientMode   = profile?.role === 'client' && !isDemoMode

  const value = {
    session,
    user:           session?.user || null,
    profile,
    loading,
    isDemoMode,
    isEmployeeMode,
    isDirectorMode,
    isClientMode,
    pinPending,
    // Retrocompatibilité avec les composants qui utilisent ces props
    prospectId:     profile?.prospect_id || null,
    employeId:      profile?.employe_id  || null,
    signIn,
    signOut,
    verifyDirectorPin,
    switchDemoRole,
    isStaff:   profile && ['directeur', 'chef_projet', 'architecte', 'rh', 'finance', 'am'].includes(profile.role),
    isClient:  profile?.role === 'client',
    isDirector: profile?.role === 'directeur',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return context
}
