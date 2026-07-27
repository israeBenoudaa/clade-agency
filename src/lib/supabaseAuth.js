import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Crée un compte Supabase Auth sans affecter la session du directeur en cours.
 * Utilise un client temporaire isolé (persistSession: false).
 */
export async function createSupabaseUser({ email, password, role = 'architecte', username, fullName, employeId, prospectId }) {
  const tmp = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, storageKey: `_signup_${Date.now()}` },
  })

  const { data, error } = await tmp.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        username: username || email.split('@')[0],
        full_name: fullName || '',
        employe_id:  employeId  ? String(employeId)  : null,
        prospect_id: prospectId ? String(prospectId) : null,
      },
    },
  })

  if (error) throw error
  return data.user
}

/**
 * Met à jour le mot de passe d'un compte Supabase existant.
 * Ne peut être appelé que par l'utilisateur lui-même (session active requise).
 */
export async function updateSupabasePassword(supabase, newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
