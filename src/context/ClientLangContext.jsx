import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

export const CLIENT_LANGS = ['fr', 'en', 'es']

export const CLIENT_LANG_LABELS = { fr: 'FR', en: 'EN', es: 'ES' }

const T = {
  fr: {
    'nav.projects':  'Projets',
    'nav.concept':   'Concept',
    'nav.livrables': 'Livrables',
    'nav.expenses':  'Mes Dépenses',
    'nav.messages':  'Messages',
    'portal.title':  'Portail Client',
    'signout':       'Déconnexion',
    'search.placeholder': 'Rechercher dans le portail…',
    'search.no_results': 'Aucun résultat',
    'search.close': 'pour fermer',
    'client': 'Client',
  },
  en: {
    'nav.projects':  'Projects',
    'nav.concept':   'Concept',
    'nav.livrables': 'Documents',
    'nav.expenses':  'My Expenses',
    'nav.messages':  'Messages',
    'portal.title':  'Client Portal',
    'signout':       'Sign out',
    'search.placeholder': 'Search in the portal…',
    'search.no_results': 'No results',
    'search.close': 'to close',
    'client': 'Client',
  },
  es: {
    'nav.projects':  'Proyectos',
    'nav.concept':   'Concepto',
    'nav.livrables': 'Documentos',
    'nav.expenses':  'Mis Gastos',
    'nav.messages':  'Mensajes',
    'portal.title':  'Portal Cliente',
    'signout':       'Cerrar sesión',
    'search.placeholder': 'Buscar en el portal…',
    'search.no_results': 'Sin resultados',
    'search.close': 'para cerrar',
    'client': 'Cliente',
  },
}

const Ctx = createContext(null)

export function ClientLangProvider({ children }) {
  const { profile } = useAuth()
  const storageKey = profile ? `clade_client_lang_${profile.id}` : 'clade_client_lang'

  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(storageKey) || 'fr' } catch { return 'fr' }
  })

  // Persist when profile is available
  useEffect(() => {
    if (!profile) return
    const stored = localStorage.getItem(storageKey)
    if (stored && CLIENT_LANGS.includes(stored)) setLangState(stored)
  }, [profile, storageKey])

  const setLang = (l) => {
    if (!CLIENT_LANGS.includes(l)) return
    setLangState(l)
    try { localStorage.setItem(storageKey, l) } catch {}
  }

  const t = (key) => T[lang]?.[key] ?? T.fr?.[key] ?? key

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export const useClientLang = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useClientLang must be used inside ClientLangProvider')
  return ctx
}
