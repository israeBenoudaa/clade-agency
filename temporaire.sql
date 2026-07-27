-- ============================================================
-- CLADE AGENCY — Initialisation Supabase
-- Colle ça dans SQL Editor → Run
-- ============================================================

-- ── PROFILES (Auth Supabase) ─────────────────────────────────
create table if not exists profiles (
  id          uuid references auth.users on delete cascade primary key,
  email       text,
  full_name   text,
  role        text check (role in ('directeur','chef_projet','architecte','rh','finance','client')),
  avatar_url  text,
  created_at  timestamptz default now()
);

-- ── CLIENTS ──────────────────────────────────────────────────
create table if not exists clients (
  id         bigint primary key,
  nom        text not null,
  email      text,
  telephone  text,
  secteur    text,
  ville      text,
  pays       text,
  sante      integer default 85,
  projets    integer default 0,
  depuis     text,
  ca         text,
  contact    text,
  notes      text,
  created_at timestamptz default now()
);

-- ── PROSPECTS (CRM) ──────────────────────────────────────────
create table if not exists prospects (
  id                  text primary key,
  prenom              text,
  nom                 text,
  email               text,
  telephone           text,
  statut              text,
  type_projet         text,
  budget              text,
  created_at          date default current_date,
  sim                 jsonb default '{}',
  devis_missions      jsonb default '[]',
  client_expenses     jsonb default '[]',
  client_credentials  jsonb,
  rdvs                jsonb default '[]',
  notes               text,
  updated_at          timestamptz default now()
);

-- ── EMPLOYES ─────────────────────────────────────────────────
create table if not exists employes (
  id                 text primary key,
  nom                text not null,
  prenom             text,
  nom_famille        text,
  poste              text,
  dept               text,
  email              text,
  telephone          text,
  cin                text,
  adresse            text,
  contrat            text,
  salaire_net        numeric default 0,
  salaire_brut       numeric default 0,
  statut             text default 'actif',
  is_directeur       boolean default false,
  manager_id         text,
  avatar             text,
  planning           jsonb default '[]',
  conges             jsonb default '{"solde":25,"history":[]}',
  work_sessions      jsonb default '[]',
  credentials        jsonb,
  evaluations        jsonb default '[]',
  heures_sup_manual  jsonb default '[]',
  from_recruitment   text,
  created_at         timestamptz default now()
);

-- ── PROJECTS ─────────────────────────────────────────────────
create table if not exists projects (
  id              bigint primary key,
  nom             text not null,
  client          text,
  client_id       bigint references clients(id),
  prospect_id     text references prospects(id),
  statut          text default 'En cours',
  avancement      integer default 0,
  type_projet     text,
  budget          text,
  date_debut      date,
  date_fin        date,
  description     text,
  equipe          integer default 0,
  equipe_projet   jsonb default '[]',
  missions        jsonb default '[]',
  tasks           jsonb default '[]',
  livrables       jsonb default '[]',
  finances        jsonb default '{"honoraires":{},"paiements":{}}',
  concept         jsonb,
  programme       jsonb,
  estimation      jsonb,
  client_feedback jsonb default '[]',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── TRANSACTIONS ─────────────────────────────────────────────
create table if not exists transactions (
  id          text primary key,
  type        text check (type in ('entree','sortie')) not null,
  montant     numeric not null default 0,
  libelle     text,
  date        date not null,
  categorie   text,
  auto        boolean default false,
  charge_id   text,
  employe_id  text,
  project_id  text,
  created_at  timestamptz default now()
);

-- ── CHARGES FIXES ────────────────────────────────────────────
create table if not exists charges_fixes (
  id           text primary key,
  libelle      text not null,
  montant      numeric not null default 0,
  categorie    text,
  periodicite  text,
  date_debut   date,
  created_at   timestamptz default now()
);

-- ── MESSAGES ─────────────────────────────────────────────────
create table if not exists messages (
  id               text primary key,
  conversation_id  text not null,
  sender_id        text not null,
  sender_name      text,
  sender_role      text,
  content          text,
  type             text default 'text',
  reply_to         jsonb,
  attachments      jsonb default '[]',
  reactions        jsonb default '{}',
  members          jsonb,
  edited_at        timestamptz,
  timestamp        timestamptz default now()
);

-- ── DEMANDES RH ──────────────────────────────────────────────
create table if not exists demandes_rh (
  id                    text primary key,
  employe_id            text not null,
  employe_nom           text,
  type                  text not null,
  statut                text default 'en_attente',
  manager_approval      text default 'non_requis',
  rh_approval           text default 'en_attente',
  manager_id            text,
  date_debut            date,
  date_fin              date,
  commentaire           text,
  commentaire_rh        text,
  commentaire_manager   text,
  archived_by_managers  jsonb default '[]',
  created_at            timestamptz default now(),
  processed_at          timestamptz
);

-- ── RECRUTEMENTS ─────────────────────────────────────────────
create table if not exists recrutements (
  id            text primary key,
  intitule      text not null,
  dept          text,
  type_contrat  text,
  description   text,
  statut        text default 'ouvert',
  candidats     jsonb default '[]',
  created_at    date default current_date,
  updated_at    timestamptz default now()
);

-- ── CANDIDATURES SPONTANÉES ──────────────────────────────────
create table if not exists candidatures_spont (
  id              text primary key,
  prenom          text,
  nom             text,
  email           text,
  telephone       text,
  poste_vise      text,
  message         text,
  cv_url          text,
  statut          text default 'nouveau',
  date_reception  date default current_date,
  notes           text,
  created_at      timestamptz default now()
);

-- ── FORMATIONS ───────────────────────────────────────────────
create table if not exists formations (
  id           text primary key,
  nom          text not null,
  date         date,
  duree        text,
  formateur    text,
  participants jsonb default '[]',
  budget       numeric,
  statut       text,
  description  text,
  created_at   timestamptz default now()
);

-- ── COLLABORATEURS EXTERNES ──────────────────────────────────
create table if not exists collaborateurs (
  id           text primary key,
  nom          text not null,
  specialite   text,
  categorie_id text,
  email        text,
  telephone    text,
  tarif        numeric,
  notes        text,
  created_at   timestamptz default now()
);

create table if not exists categories_collab (
  id   text primary key,
  nom  text not null
);

-- ── JOURS FÉRIÉS ─────────────────────────────────────────────
create table if not exists jours_ferier (
  id   text primary key,
  date date not null,
  nom  text not null
);

-- ── WORKFLOWS ────────────────────────────────────────────────
create table if not exists workflows (
  id           text primary key,
  title        text,
  description  text,
  blocks       jsonb default '[]',
  shared_with  jsonb default '[]',
  versions     jsonb default '[]',
  deleted_at   timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── NOTIFICATIONS ────────────────────────────────────────────
create table if not exists notifications (
  id              text primary key,
  type            text,
  message         text not null,
  target_user_id  text,
  read            boolean default false,
  link            text,
  for_hr          boolean default false,
  created_at      timestamptz default now()
);

-- ── AGENCE SETTINGS (ligne unique) ───────────────────────────
create table if not exists agence_settings (
  id                  integer primary key default 1 check (id = 1),
  nb_collaborateurs   integer default 5,
  heures_par_an       integer default 1500,
  tjh                 numeric default 250,
  taux_impot          numeric default 20,
  updated_at          timestamptz default now()
);
insert into agence_settings default values on conflict do nothing;

-- ── ACTIVITY LOG ─────────────────────────────────────────────
create table if not exists activity_log (
  id         text primary key,
  action     text not null,
  details    text,
  category   text,
  by         text,
  timestamp  timestamptz default now()
);


-- ============================================================
-- RLS — Row Level Security
-- ============================================================

-- ── FONCTIONS HELPER ─────────────────────────────────────────

create or replace function get_my_role()
returns text language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_staff()
returns boolean language sql security definer stable as $$
  select role in ('directeur','chef_projet','architecte','rh','finance')
  from profiles where id = auth.uid()
$$;

create or replace function is_director()
returns boolean language sql security definer stable as $$
  select role = 'directeur' from profiles where id = auth.uid()
$$;

create or replace function is_finance()
returns boolean language sql security definer stable as $$
  select role in ('directeur','finance') from profiles where id = auth.uid()
$$;

create or replace function is_hr()
returns boolean language sql security definer stable as $$
  select role in ('directeur','rh') from profiles where id = auth.uid()
$$;

-- ── ACTIVER RLS ──────────────────────────────────────────────

alter table profiles           enable row level security;
alter table clients            enable row level security;
alter table prospects          enable row level security;
alter table employes           enable row level security;
alter table projects           enable row level security;
alter table transactions       enable row level security;
alter table charges_fixes      enable row level security;
alter table messages           enable row level security;
alter table demandes_rh        enable row level security;
alter table recrutements       enable row level security;
alter table candidatures_spont enable row level security;
alter table formations         enable row level security;
alter table collaborateurs     enable row level security;
alter table categories_collab  enable row level security;
alter table jours_ferier       enable row level security;
alter table workflows          enable row level security;
alter table notifications      enable row level security;
alter table agence_settings    enable row level security;
alter table activity_log       enable row level security;

-- ── PROFILES ─────────────────────────────────────────────────

create policy "profiles_select"
  on profiles for select
  using (id = auth.uid() or is_director());

create policy "profiles_insert"
  on profiles for insert
  with check (id = auth.uid());

create policy "profiles_update"
  on profiles for update
  using (id = auth.uid() or is_director());

-- ── CLIENTS ──────────────────────────────────────────────────

create policy "clients_staff_all"
  on clients for all
  using (is_staff())
  with check (is_staff());

-- ── PROSPECTS ────────────────────────────────────────────────

create policy "prospects_staff_all"
  on prospects for all
  using (is_staff())
  with check (is_staff());

create policy "prospects_client_read_own"
  on prospects for select
  using (
    get_my_role() = 'client'
    and id = (select raw_user_meta_data->>'prospect_id' from auth.users where id = auth.uid())
  );

-- ── EMPLOYES ─────────────────────────────────────────────────

create policy "employes_staff_read"
  on employes for select
  using (is_staff() or id = auth.uid()::text);

create policy "employes_director_insert"
  on employes for insert
  with check (is_director());

create policy "employes_update"
  on employes for update
  using (id = auth.uid()::text or is_director());

create policy "employes_director_delete"
  on employes for delete
  using (is_director());

-- ── PROJECTS ─────────────────────────────────────────────────

create policy "projects_staff_all"
  on projects for all
  using (is_staff())
  with check (is_staff());

create policy "projects_client_read_own"
  on projects for select
  using (
    get_my_role() = 'client'
    and prospect_id = (select raw_user_meta_data->>'prospect_id' from auth.users where id = auth.uid())
  );

-- ── TRANSACTIONS ─────────────────────────────────────────────

create policy "transactions_staff_read"
  on transactions for select
  using (is_staff());

create policy "transactions_finance_insert"
  on transactions for insert
  with check (is_finance());

create policy "transactions_finance_update"
  on transactions for update
  using (is_finance());

create policy "transactions_director_delete"
  on transactions for delete
  using (is_director());

-- ── CHARGES FIXES ────────────────────────────────────────────

create policy "charges_staff_read"
  on charges_fixes for select
  using (is_staff());

create policy "charges_finance_write"
  on charges_fixes for insert
  with check (is_finance());

create policy "charges_finance_update"
  on charges_fixes for update
  using (is_finance());

create policy "charges_director_delete"
  on charges_fixes for delete
  using (is_director());

-- ── MESSAGES ─────────────────────────────────────────────────

create policy "messages_read"
  on messages for select
  using (
    sender_id = auth.uid()::text
    or conversation_id like '%' || auth.uid()::text || '%'
    or (members is not null and members @> to_jsonb(auth.uid()::text))
    or is_staff()
  );

create policy "messages_insert"
  on messages for insert
  with check (sender_id = auth.uid()::text);

create policy "messages_update"
  on messages for update
  using (sender_id = auth.uid()::text or is_director());

create policy "messages_delete"
  on messages for delete
  using (sender_id = auth.uid()::text or is_director());

-- ── DEMANDES RH ──────────────────────────────────────────────

create policy "demandesrh_read"
  on demandes_rh for select
  using (
    employe_id = auth.uid()::text
    or manager_id = auth.uid()::text
    or is_hr()
  );

create policy "demandesrh_insert"
  on demandes_rh for insert
  with check (employe_id = auth.uid()::text);

create policy "demandesrh_update"
  on demandes_rh for update
  using (manager_id = auth.uid()::text or is_hr());

create policy "demandesrh_delete"
  on demandes_rh for delete
  using (is_hr());

-- ── RECRUTEMENTS ─────────────────────────────────────────────

create policy "recrutements_staff_read"
  on recrutements for select
  using (is_staff());

create policy "recrutements_hr_write"
  on recrutements for insert
  with check (is_hr());

create policy "recrutements_hr_update"
  on recrutements for update
  using (is_hr());

create policy "recrutements_hr_delete"
  on recrutements for delete
  using (is_hr());

-- ── CANDIDATURES SPONTANÉES ──────────────────────────────────

create policy "candidatures_public_insert"
  on candidatures_spont for insert
  with check (true);

create policy "candidatures_hr_read"
  on candidatures_spont for select
  using (is_hr());

create policy "candidatures_hr_update"
  on candidatures_spont for update
  using (is_hr());

create policy "candidatures_hr_delete"
  on candidatures_spont for delete
  using (is_hr());

-- ── FORMATIONS ───────────────────────────────────────────────

create policy "formations_staff_read"
  on formations for select
  using (is_staff());

create policy "formations_hr_write"
  on formations for insert
  with check (is_hr());

create policy "formations_hr_update"
  on formations for update
  using (is_hr());

create policy "formations_hr_delete"
  on formations for delete
  using (is_hr());

-- ── COLLABORATEURS & CATÉGORIES ──────────────────────────────

create policy "collabs_staff_all"
  on collaborateurs for all
  using (is_staff())
  with check (is_staff());

create policy "catcollabs_staff_all"
  on categories_collab for all
  using (is_staff())
  with check (is_staff());

-- ── JOURS FÉRIÉS ─────────────────────────────────────────────

create policy "joursferier_read"
  on jours_ferier for select
  using (auth.uid() is not null);

create policy "joursferier_director_write"
  on jours_ferier for insert
  with check (is_director());

create policy "joursferier_director_update"
  on jours_ferier for update
  using (is_director());

create policy "joursferier_director_delete"
  on jours_ferier for delete
  using (is_director());

-- ── WORKFLOWS ────────────────────────────────────────────────

create policy "workflows_staff_read"
  on workflows for select
  using (is_staff());

create policy "workflows_staff_write"
  on workflows for insert
  with check (is_staff());

create policy "workflows_staff_update"
  on workflows for update
  using (is_staff());

create policy "workflows_staff_delete"
  on workflows for delete
  using (is_staff());

-- ── NOTIFICATIONS ────────────────────────────────────────────

create policy "notifs_read"
  on notifications for select
  using (
    target_user_id = auth.uid()::text
    or (for_hr = true and is_hr())
    or is_director()
  );

create policy "notifs_insert"
  on notifications for insert
  with check (auth.uid() is not null);

create policy "notifs_update"
  on notifications for update
  using (target_user_id = auth.uid()::text or is_director());

create policy "notifs_delete"
  on notifications for delete
  using (target_user_id = auth.uid()::text or is_director());

-- ── AGENCE SETTINGS ──────────────────────────────────────────

create policy "settings_staff_read"
  on agence_settings for select
  using (is_staff());

create policy "settings_director_write"
  on agence_settings for insert
  with check (is_director());

create policy "settings_director_update"
  on agence_settings for update
  using (is_director());

-- ── ACTIVITY LOG ─────────────────────────────────────────────

create policy "actlog_director_read"
  on activity_log for select
  using (is_director());

create policy "actlog_staff_insert"
  on activity_log for insert
  with check (is_staff());

create policy "actlog_director_delete"
  on activity_log for delete
  using (is_director());
