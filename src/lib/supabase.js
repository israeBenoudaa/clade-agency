import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️  Variables Supabase manquantes. Copie .env.example en .env et renseigne tes clés.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

// Helpers métiers
export const ROLES = {
  DIRECTEUR: 'directeur',
  CHEF_PROJET: 'chef_projet',
  ARCHITECTE: 'architecte',
  RH: 'rh',
  FINANCE: 'finance',
  CLIENT: 'client',
}

export const ROLE_LABELS = {
  directeur: 'Directeur Général',
  chef_projet: 'Chef de Projet',
  architecte: 'Architecte / Collaborateur',
  rh: 'Ressources Humaines',
  finance: 'Direction Financière',
  client: 'Client',
}

export const STAFF_ROLES = ['directeur', 'chef_projet', 'architecte', 'rh', 'finance']
