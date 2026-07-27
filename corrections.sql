-- ═══════════════════════════════════════════════════════════════════════════
-- CLADE AGENCY — Corrections complètes (à exécuter dans Supabase SQL Editor)
-- Colle tout ça d'un coup et clique Run.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. SUPPRIMER LES CLÉS ÉTRANGÈRES PROBLÉMATIQUES ─────────────────────
--    Les IDs locaux (timestamps, 'director-achraf') ne matchent pas
--    les lignes insérées dans les tables référencées.

alter table projects drop constraint if exists projects_client_id_fkey;
alter table projects drop constraint if exists projects_prospect_id_fkey;


-- ── 2. COLONNES MANQUANTES SUR PROFILES ──────────────────────────────────

alter table profiles add column if not exists username    text unique;
alter table profiles add column if not exists employe_id  text;
alter table profiles add column if not exists prospect_id text;


-- ── 3. FONCTIONS HELPER ───────────────────────────────────────────────────

create or replace function get_my_role()
returns text language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_staff()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select role in ('directeur','chef_projet','architecte','rh','finance')
     from profiles where id = auth.uid()),
    false
  )
$$;

create or replace function is_director()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select role = 'directeur' from profiles where id = auth.uid()),
    false
  )
$$;

create or replace function is_finance()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select role in ('directeur','finance') from profiles where id = auth.uid()),
    false
  )
$$;

create or replace function is_hr()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select role in ('directeur','rh') from profiles where id = auth.uid()),
    false
  )
$$;

-- Résolution username → email pour la page de login (appelable sans session)
create or replace function get_email_from_username(uname text)
returns text language sql security definer stable as $$
  select email from profiles where lower(username) = lower(uname) limit 1;
$$;
grant execute on function get_email_from_username to anon, authenticated;


-- ── 4. TRIGGER AUTO-CRÉATION DE PROFIL ───────────────────────────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role, username, employe_id, prospect_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'architecte'),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'employe_id',
    new.raw_user_meta_data->>'prospect_id'
  )
  on conflict (id) do update set
    email        = excluded.email,
    full_name    = coalesce(excluded.full_name,   profiles.full_name),
    role         = coalesce(excluded.role,        profiles.role),
    username     = coalesce(excluded.username,    profiles.username),
    employe_id   = coalesce(excluded.employe_id,  profiles.employe_id),
    prospect_id  = coalesce(excluded.prospect_id, profiles.prospect_id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ── 5. RECRÉER TOUTES LES POLITIQUES RLS ─────────────────────────────────
--    On drop chaque policy existante avant de la recréer pour éviter les
--    erreurs "policy already exists".
--
--    PROBLÈME PRINCIPAL CORRIGÉ :
--    Les policies originales comparaient sender_id / employe_id / target_user_id
--    avec auth.uid()::text. Ça ne marche pas car l'app utilise ses propres IDs
--    ('director-achraf', timestamps) et non les UUIDs Supabase.
--    On simplifie : is_staff() pour le staff, prospect_id pour les clients.


-- ── PROFILES ──────────────────────────────────────────────────────────────

drop policy if exists "profiles_select"      on profiles;
drop policy if exists "profiles_insert"      on profiles;
drop policy if exists "profiles_update"      on profiles;
drop policy if exists "profiles_insert_own"  on profiles;
drop policy if exists "profiles_update_own"  on profiles;

create policy "profiles_select" on profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_insert" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on profiles
  for update using (auth.uid() = id or is_director());


-- ── CLIENTS ───────────────────────────────────────────────────────────────

drop policy if exists "clients_staff_all" on clients;

create policy "clients_staff_all" on clients
  for all using (is_staff()) with check (is_staff());


-- ── PROSPECTS ─────────────────────────────────────────────────────────────

drop policy if exists "prospects_staff_all"        on prospects;
drop policy if exists "prospects_client_read_own"  on prospects;

create policy "prospects_staff_all" on prospects
  for all using (is_staff()) with check (is_staff());

create policy "prospects_client_read_own" on prospects
  for select using (
    get_my_role() = 'client'
    and id = (select prospect_id from profiles where id = auth.uid())
  );


-- ── EMPLOYES ──────────────────────────────────────────────────────────────

drop policy if exists "employes_staff_read"       on employes;
drop policy if exists "employes_director_insert"  on employes;
drop policy if exists "employes_update"           on employes;
drop policy if exists "employes_director_delete"  on employes;

-- Le staff lit tout (pour les listes déroulantes, etc.)
create policy "employes_staff_read" on employes
  for select using (is_staff());

-- Seul le directeur crée / modifie / supprime des employés
create policy "employes_director_insert" on employes
  for insert with check (is_director());

create policy "employes_director_update" on employes
  for update using (is_director());

create policy "employes_director_delete" on employes
  for delete using (is_director());


-- ── PROJECTS ──────────────────────────────────────────────────────────────

drop policy if exists "projects_staff_all"        on projects;
drop policy if exists "projects_client_read_own"  on projects;

create policy "projects_staff_all" on projects
  for all using (is_staff()) with check (is_staff());

create policy "projects_client_read_own" on projects
  for select using (
    get_my_role() = 'client'
    and prospect_id = (select prospect_id from profiles where id = auth.uid())
  );


-- ── TRANSACTIONS ──────────────────────────────────────────────────────────

drop policy if exists "transactions_staff_read"      on transactions;
drop policy if exists "transactions_finance_insert"  on transactions;
drop policy if exists "transactions_finance_update"  on transactions;
drop policy if exists "transactions_director_delete" on transactions;

create policy "transactions_staff_read" on transactions
  for select using (is_staff());

-- Finance + directeur peuvent écrire
create policy "transactions_finance_write" on transactions
  for insert with check (is_finance());

create policy "transactions_finance_update" on transactions
  for update using (is_finance());

create policy "transactions_director_delete" on transactions
  for delete using (is_director());


-- ── CHARGES FIXES ─────────────────────────────────────────────────────────

drop policy if exists "charges_staff_read"      on charges_fixes;
drop policy if exists "charges_finance_write"   on charges_fixes;
drop policy if exists "charges_finance_update"  on charges_fixes;
drop policy if exists "charges_director_delete" on charges_fixes;

create policy "charges_staff_read"      on charges_fixes for select using (is_staff());
create policy "charges_finance_write"   on charges_fixes for insert with check (is_finance());
create policy "charges_finance_update"  on charges_fixes for update using (is_finance());
create policy "charges_director_delete" on charges_fixes for delete using (is_director());


-- ── MESSAGES ──────────────────────────────────────────────────────────────
--    CORRIGÉ : sender_id dans l'app = ID local, pas UUID Supabase.
--    → Staff peut tout faire, clients peuvent lire leurs conversations.

drop policy if exists "messages_read"   on messages;
drop policy if exists "messages_insert" on messages;
drop policy if exists "messages_update" on messages;
drop policy if exists "messages_delete" on messages;

create policy "messages_staff_all" on messages
  for all using (is_staff()) with check (is_staff());

-- Les clients lisent les conversations qui concernent leur prospect_id
create policy "messages_client_read" on messages
  for select using (
    get_my_role() = 'client'
    and (
      conversation_id like 'client_' || (select prospect_id from profiles where id = auth.uid()) || '%'
      or conversation_id like 'cdm_'  || (select prospect_id from profiles where id = auth.uid()) || '%'
      or conversation_id like 'cgrp_%'
    )
  );

-- Les clients peuvent envoyer des messages dans leurs conversations
create policy "messages_client_insert" on messages
  for insert with check (
    get_my_role() = 'client'
  );


-- ── DEMANDES RH ───────────────────────────────────────────────────────────
--    CORRIGÉ : employe_id = ID local ('director-achraf', timestamp), pas UUID.
--    → Staff/HR peuvent tout gérer.

drop policy if exists "demandesrh_read"   on demandes_rh;
drop policy if exists "demandesrh_insert" on demandes_rh;
drop policy if exists "demandesrh_update" on demandes_rh;
drop policy if exists "demandesrh_delete" on demandes_rh;

-- Le staff lit toutes les demandes (le filtrage se fait côté app)
create policy "demandesrh_staff_read" on demandes_rh
  for select using (is_staff());

-- Tout utilisateur authentifié peut soumettre une demande
create policy "demandesrh_insert" on demandes_rh
  for insert with check (auth.uid() is not null);

-- HR et directeur traitent les demandes
create policy "demandesrh_update" on demandes_rh
  for update using (is_hr());

create policy "demandesrh_delete" on demandes_rh
  for delete using (is_hr());


-- ── RECRUTEMENTS ──────────────────────────────────────────────────────────

drop policy if exists "recrutements_staff_read"  on recrutements;
drop policy if exists "recrutements_hr_write"    on recrutements;
drop policy if exists "recrutements_hr_update"   on recrutements;
drop policy if exists "recrutements_hr_delete"   on recrutements;

create policy "recrutements_staff_read" on recrutements for select using (is_staff());
create policy "recrutements_hr_write"   on recrutements for insert with check (is_hr());
create policy "recrutements_hr_update"  on recrutements for update using (is_hr());
create policy "recrutements_hr_delete"  on recrutements for delete using (is_hr());


-- ── CANDIDATURES SPONTANÉES ───────────────────────────────────────────────

drop policy if exists "candidatures_public_insert" on candidatures_spont;
drop policy if exists "candidatures_hr_read"       on candidatures_spont;
drop policy if exists "candidatures_hr_update"     on candidatures_spont;
drop policy if exists "candidatures_hr_delete"     on candidatures_spont;

create policy "candidatures_public_insert" on candidatures_spont for insert with check (true);
create policy "candidatures_hr_read"       on candidatures_spont for select using (is_hr());
create policy "candidatures_hr_update"     on candidatures_spont for update using (is_hr());
create policy "candidatures_hr_delete"     on candidatures_spont for delete using (is_hr());


-- ── FORMATIONS ────────────────────────────────────────────────────────────

drop policy if exists "formations_staff_read" on formations;
drop policy if exists "formations_hr_write"   on formations;
drop policy if exists "formations_hr_update"  on formations;
drop policy if exists "formations_hr_delete"  on formations;

create policy "formations_staff_read" on formations for select using (is_staff());
create policy "formations_hr_write"   on formations for insert with check (is_hr());
create policy "formations_hr_update"  on formations for update using (is_hr());
create policy "formations_hr_delete"  on formations for delete using (is_hr());


-- ── COLLABORATEURS & CATÉGORIES ───────────────────────────────────────────

drop policy if exists "collabs_staff_all"    on collaborateurs;
drop policy if exists "catcollabs_staff_all" on categories_collab;

create policy "collabs_staff_all"    on collaborateurs    for all using (is_staff()) with check (is_staff());
create policy "catcollabs_staff_all" on categories_collab for all using (is_staff()) with check (is_staff());


-- ── JOURS FÉRIÉS ──────────────────────────────────────────────────────────

drop policy if exists "joursferier_read"           on jours_ferier;
drop policy if exists "joursferier_director_write"  on jours_ferier;
drop policy if exists "joursferier_director_update" on jours_ferier;
drop policy if exists "joursferier_director_delete" on jours_ferier;

create policy "joursferier_read"           on jours_ferier for select using (auth.uid() is not null);
create policy "joursferier_director_write"  on jours_ferier for insert with check (is_director());
create policy "joursferier_director_update" on jours_ferier for update using (is_director());
create policy "joursferier_director_delete" on jours_ferier for delete using (is_director());


-- ── WORKFLOWS ─────────────────────────────────────────────────────────────

drop policy if exists "workflows_staff_read"   on workflows;
drop policy if exists "workflows_staff_write"  on workflows;
drop policy if exists "workflows_staff_update" on workflows;
drop policy if exists "workflows_staff_delete" on workflows;

create policy "workflows_staff_all" on workflows
  for all using (is_staff()) with check (is_staff());


-- ── NOTIFICATIONS ─────────────────────────────────────────────────────────
--    CORRIGÉ : target_user_id = ID local, pas UUID Supabase.
--    → Staff voit tout, clients voient les leurs.

drop policy if exists "notifs_read"   on notifications;
drop policy if exists "notifs_insert" on notifications;
drop policy if exists "notifs_update" on notifications;
drop policy if exists "notifs_delete" on notifications;

create policy "notifs_staff_all" on notifications
  for all using (is_staff()) with check (is_staff());

create policy "notifs_client_read" on notifications
  for select using (
    get_my_role() = 'client'
    and target_user_id = 'client:' || (select prospect_id from profiles where id = auth.uid())
  );


-- ── AGENCE SETTINGS ───────────────────────────────────────────────────────

drop policy if exists "settings_staff_read"      on agence_settings;
drop policy if exists "settings_director_write"  on agence_settings;
drop policy if exists "settings_director_update" on agence_settings;

create policy "settings_staff_read"     on agence_settings for select using (is_staff());
create policy "settings_director_write" on agence_settings for insert with check (is_director());
create policy "settings_director_update" on agence_settings for update using (is_director());


-- ── ACTIVITY LOG ──────────────────────────────────────────────────────────

drop policy if exists "actlog_director_read"  on activity_log;
drop policy if exists "actlog_staff_insert"   on activity_log;
drop policy if exists "actlog_director_delete" on activity_log;

create policy "actlog_director_read"   on activity_log for select using (is_director());
create policy "actlog_staff_insert"    on activity_log for insert with check (is_staff());
create policy "actlog_director_delete" on activity_log for delete using (is_director());


-- ── 6. PROFIL DIRECTEUR (si pas encore créé) ─────────────────────────────
--    Remplace l'UUID si tu as un compte différent.

insert into profiles (id, email, full_name, role, username, employe_id)
values (
  '28350055-b324-4c2b-9138-d575ac4fe8f0',
  'a.benouda@clade.ma',
  'Achraf Benouda',
  'directeur',
  'a.benouda',
  'director-achraf'
)
on conflict (id) do update set
  role       = 'directeur',
  username   = 'a.benouda',
  employe_id = 'director-achraf';
