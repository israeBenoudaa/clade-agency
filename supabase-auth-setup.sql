-- ═══════════════════════════════════════════════════════════════════════════
-- CLADE AGENCY — Auth setup (à exécuter dans Supabase SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Colonnes supplémentaires sur profiles
alter table profiles add column if not exists username    text unique;
alter table profiles add column if not exists employe_id  text;
alter table profiles add column if not exists prospect_id text;

-- 2. RLS sur profiles
alter table profiles enable row level security;

drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

-- 3. Fonction : résoudre email depuis username (accessible sans session)
create or replace function get_email_from_username(uname text)
returns text language sql security definer stable as $$
  select email from profiles where lower(username) = lower(uname) limit 1;
$$;
grant execute on function get_email_from_username to anon, authenticated;

-- 4. Trigger : créer/mettre à jour le profil à l'inscription Supabase
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
    full_name    = coalesce(excluded.full_name,    profiles.full_name),
    role         = coalesce(excluded.role,         profiles.role),
    username     = coalesce(excluded.username,     profiles.username),
    employe_id   = coalesce(excluded.employe_id,   profiles.employe_id),
    prospect_id  = coalesce(excluded.prospect_id,  profiles.prospect_id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 5. Profil du directeur (après avoir créé son compte dans Supabase Auth)
--    Remplace <UUID_ACHRAF> par l'UUID réel dans Authentication → Users
-- insert into profiles (id, email, full_name, role, username, employe_id)
-- values ('<UUID_ACHRAF>', 'a.benouda@clade.ma', 'Achraf Benouda', 'directeur', 'a.benouda', 'director-achraf')
-- on conflict (id) do update set role='directeur', username='a.benouda', employe_id='director-achraf';
