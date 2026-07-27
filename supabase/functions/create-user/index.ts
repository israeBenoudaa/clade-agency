// CLADE — Edge Function : create-user
// Permet au Directeur Général de créer des comptes (login + mot de passe)
// pour les collaborateurs et clients.
//
// Sécurité : vérifie que l'appelant est bien directeur via son JWT,
// puis utilise le SERVICE_ROLE_KEY pour créer le user dans auth.users
// et insérer le profile correspondant.
//
// Déploiement :
//   supabase functions deploy create-user
//
// Appel depuis le front (déjà câblé dans UsersPage.jsx) :
//   await supabase.functions.invoke('create-user', { body: { email, password, full_name, role } })

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreateUserBody {
  email: string
  password: string
  full_name: string
  role: 'directeur' | 'chef_projet' | 'architecte' | 'rh' | 'finance' | 'client'
  client_id?: string
  phone?: string
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ===== 1. Authentification de l'appelant =====
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Token manquant' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Client lié à l'utilisateur appelant (pour vérifier son rôle)
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return json({ error: 'Utilisateur non authentifié' }, 401)
    }

    // ===== 2. Vérifier que l'appelant est directeur =====
    const { data: callerProfile, error: profileError } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || callerProfile?.role !== 'directeur') {
      return json({ error: 'Action réservée au Directeur Général' }, 403)
    }

    // ===== 3. Parse + validation du body =====
    const body = (await req.json()) as CreateUserBody
    const { email, password, full_name, role, client_id, phone } = body

    if (!email || !password || !full_name || !role) {
      return json({ error: 'Champs requis : email, password, full_name, role' }, 400)
    }
    if (password.length < 8) {
      return json({ error: 'Le mot de passe doit faire au moins 8 caractères' }, 400)
    }
    const validRoles = ['directeur', 'chef_projet', 'architecte', 'rh', 'finance', 'client']
    if (!validRoles.includes(role)) {
      return json({ error: 'Rôle invalide' }, 400)
    }

    // ===== 4. Création du user avec service_role =====
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // active directement
      user_metadata: { full_name, role },
    })

    if (createError) {
      return json({ error: createError.message }, 400)
    }

    // ===== 5. Insertion du profile =====
    const { error: insertError } = await supabaseAdmin.from('profiles').insert({
      id: newUser.user.id,
      email,
      full_name,
      role,
      phone: phone || null,
      client_id: client_id || null,
      active: true,
    })

    if (insertError) {
      // Rollback : supprimer le user créé si l'insertion du profil échoue
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return json({ error: 'Erreur création profil : ' + insertError.message }, 500)
    }

    return json({
      success: true,
      user: {
        id: newUser.user.id,
        email,
        full_name,
        role,
      },
    })
  } catch (err) {
    return json({ error: (err as Error).message || 'Erreur serveur' }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
