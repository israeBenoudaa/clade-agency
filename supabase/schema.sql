-- ============================================================
-- CLADE — Schéma Supabase pour agence d'architecture
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================

-- ============================================================
-- 1. TYPES & ENUMS
-- ============================================================

create type user_role as enum (
  'directeur',
  'chef_projet',
  'architecte',
  'rh',
  'finance',
  'client'
);

create type project_phase as enum (
  'ESQ',  -- Esquisse
  'APS',  -- Avant-Projet Sommaire
  'APD',  -- Avant-Projet Détaillé
  'PRO',  -- Études Projet
  'DCE',  -- Dossier Consultation Entreprises
  'EXE'   -- Suivi d'Exécution
);

create type project_status as enum ('en_cours', 'a_valider', 'termine', 'retarde', 'annule');
create type invoice_status as enum ('payee', 'en_attente', 'en_retard', 'annulee');
create type leave_status as enum ('en_attente', 'approuve', 'refuse');

-- ============================================================
-- 2. PROFILS UTILISATEURS
-- Lié à auth.users via id (UUID)
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role user_role not null default 'architecte',
  phone text,
  active boolean not null default true,
  avatar_url text,
  client_id uuid, -- si role = 'client', référence vers clients.id
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 3. CLIENTS
-- ============================================================

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  secteur text,
  email_principal text,
  telephone text,
  adresse text,
  notes text,
  sante_score int check (sante_score between 0 and 100),
  created_at timestamptz not null default now()
);

-- Ajoute la FK profiles.client_id maintenant que clients existe
alter table public.profiles
  add constraint profiles_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete set null;

-- ============================================================
-- 4. PROJETS
-- ============================================================

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  description text,
  client_id uuid references public.clients(id) on delete restrict,
  chef_projet_id uuid references public.profiles(id),
  type text, -- "Résidentiel haut de gamme", "Tertiaire", etc.
  surface_m2 numeric,
  localisation text,
  budget_total numeric,
  phase project_phase not null default 'ESQ',
  avancement int not null default 0 check (avancement between 0 and 100),
  statut project_status not null default 'en_cours',
  date_debut date,
  date_livraison_prevue date,
  priorite text default 'Moyenne',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 5. PHASES DE PROJET (pour Gantt)
-- ============================================================

create table public.project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  phase project_phase not null,
  date_debut date,
  date_fin date,
  avancement int not null default 0 check (avancement between 0 and 100),
  responsable_id uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. ÉQUIPES PROJET
-- ============================================================

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_in_project text, -- "Architecte principal", "Dessinateur", etc.
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- ============================================================
-- 7. CONGÉS / RH
-- ============================================================

create table public.leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type_conge text not null, -- "Congés annuels", "RTT", "Maladie"
  date_debut date not null,
  date_fin date not null,
  jours int not null,
  statut leave_status not null default 'en_attente',
  motif text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 8. FACTURES
-- ============================================================

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique, -- ex. "FAC-2025-0142"
  client_id uuid references public.clients(id),
  project_id uuid references public.projects(id),
  libelle text not null,
  montant numeric not null,
  date_emission date not null default current_date,
  date_echeance date,
  statut invoice_status not null default 'en_attente',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 9. DÉPENSES PROJET (côté client)
-- ============================================================

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  categorie text not null,
  montant numeric not null,
  total_prevu numeric,
  statut text default 'en_cours',
  date_engagement date default current_date,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 10. LIVRABLES (documents projet partagés avec le client)
-- ============================================================

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  nom text not null,
  type_fichier text, -- "PDF", "DWG", "RVT"
  taille text,
  phase project_phase,
  storage_path text, -- chemin dans Supabase Storage
  url text,
  uploaded_by uuid references public.profiles(id),
  visible_client boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 11. MESSAGES (échanges client / équipe)
-- ============================================================

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  auteur_id uuid not null references public.profiles(id),
  contenu text not null,
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 12. INDEXES
-- ============================================================

create index idx_projects_chef on public.projects(chef_projet_id);
create index idx_projects_client on public.projects(client_id);
create index idx_phases_project on public.project_phases(project_id);
create index idx_members_user on public.project_members(user_id);
create index idx_leaves_user on public.leaves(user_id);
create index idx_invoices_client on public.invoices(client_id);
create index idx_invoices_project on public.invoices(project_id);
create index idx_expenses_project on public.expenses(project_id);
create index idx_deliverables_project on public.deliverables(project_id);
create index idx_messages_project on public.messages(project_id);
create index idx_profiles_role on public.profiles(role);

-- ============================================================
-- 13. TRIGGER : créer un profile auto à l'inscription
-- (NON utilisé dans cette app car la création se fait via Edge Function
--  qui insère manuellement le profile. Conservé pour référence.)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'architecte')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Décommenter si tu veux activer la création auto :
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute function public.handle_new_user();

-- ============================================================
-- 14. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles        enable row level security;
alter table public.clients         enable row level security;
alter table public.projects        enable row level security;
alter table public.project_phases  enable row level security;
alter table public.project_members enable row level security;
alter table public.leaves          enable row level security;
alter table public.invoices        enable row level security;
alter table public.expenses        enable row level security;
alter table public.deliverables    enable row level security;
alter table public.messages        enable row level security;

-- Helper : rôle de l'utilisateur courant
create or replace function public.current_user_role()
returns user_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select role <> 'client' from public.profiles where id = auth.uid();
$$;

create or replace function public.is_director()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select role = 'directeur' from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_client_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- =============== PROFILES ===============

-- Tout le monde peut lire son propre profil
create policy "Read own profile"
  on public.profiles for select
  using (id = auth.uid());

-- Le staff peut voir tous les profils
create policy "Staff read all profiles"
  on public.profiles for select
  using (public.is_staff());

-- Seul le directeur peut créer / modifier / supprimer
create policy "Director manage profiles"
  on public.profiles for all
  using (public.is_director())
  with check (public.is_director());

-- Chacun peut modifier son propre profil
create policy "Update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- =============== CLIENTS ===============

create policy "Staff manage clients"
  on public.clients for all
  using (public.is_staff())
  with check (public.is_staff());

-- Un client peut lire sa propre fiche
create policy "Client read self"
  on public.clients for select
  using (id = public.current_user_client_id());

-- =============== PROJECTS ===============

create policy "Staff manage projects"
  on public.projects for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "Client read own projects"
  on public.projects for select
  using (client_id = public.current_user_client_id());

-- =============== PROJECT PHASES ===============

create policy "Staff manage phases"
  on public.project_phases for all
  using (public.is_staff());

create policy "Client read own phases"
  on public.project_phases for select
  using (
    project_id in (
      select id from public.projects
      where client_id = public.current_user_client_id()
    )
  );

-- =============== PROJECT MEMBERS ===============

create policy "Staff read members"
  on public.project_members for select
  using (public.is_staff());

create policy "Director manage members"
  on public.project_members for all
  using (public.is_director());

-- =============== LEAVES ===============

create policy "Read own leaves"
  on public.leaves for select
  using (user_id = auth.uid());

create policy "Staff read all leaves"
  on public.leaves for select
  using (public.is_staff());

create policy "Insert own leaves"
  on public.leaves for insert
  with check (user_id = auth.uid());

create policy "RH manage leaves"
  on public.leaves for all
  using (public.current_user_role() in ('directeur', 'rh'));

-- =============== INVOICES ===============

create policy "Finance manage invoices"
  on public.invoices for all
  using (public.current_user_role() in ('directeur', 'finance'));

create policy "Staff read invoices"
  on public.invoices for select
  using (public.is_staff());

create policy "Client read own invoices"
  on public.invoices for select
  using (client_id = public.current_user_client_id());

-- =============== EXPENSES ===============

create policy "Staff manage expenses"
  on public.expenses for all
  using (public.is_staff());

create policy "Client read own expenses"
  on public.expenses for select
  using (
    project_id in (
      select id from public.projects
      where client_id = public.current_user_client_id()
    )
  );

-- =============== DELIVERABLES ===============

create policy "Staff manage deliverables"
  on public.deliverables for all
  using (public.is_staff());

create policy "Client read own visible deliverables"
  on public.deliverables for select
  using (
    visible_client = true
    and project_id in (
      select id from public.projects
      where client_id = public.current_user_client_id()
    )
  );

-- =============== MESSAGES ===============

create policy "Staff read all messages"
  on public.messages for select
  using (public.is_staff());

create policy "Client read own messages"
  on public.messages for select
  using (
    project_id in (
      select id from public.projects
      where client_id = public.current_user_client_id()
    )
  );

create policy "Authenticated insert messages"
  on public.messages for insert
  with check (
    auteur_id = auth.uid()
    and (
      public.is_staff()
      or project_id in (
        select id from public.projects
        where client_id = public.current_user_client_id()
      )
    )
  );

-- ============================================================
-- 15. SEED DATA (données d'exemple, optionnel)
-- À exécuter APRÈS avoir créé manuellement un compte directeur via Supabase Auth
-- ============================================================

-- Exemple : insérer des clients (décommenter pour utiliser)
-- insert into public.clients (nom, secteur, email_principal, sante_score) values
--   ('Famille Bensouda', 'Particulier', 'bensouda@example.com', 92),
--   ('TechMaroc SA', 'Tertiaire', 'contact@techmaroc.ma', 88),
--   ('Hôtels du Sud', 'Hospitalité', 'direction@hotelsdusud.ma', 95);

-- ============================================================
-- FIN DU SCHÉMA
-- ============================================================
