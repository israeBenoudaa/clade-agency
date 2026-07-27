-- ═══════════════════════════════════════════════════════════════════════════
-- CLADE AGENCY — Patch : Prospect → Client (à coller dans Supabase SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Ajouter la colonne prospect_id à la table clients
alter table clients add column if not exists prospect_id text;


-- 2. RLS : le client peut lire sa propre fiche dans la table clients
drop policy if exists "clients_client_read_own" on clients;

create policy "clients_client_read_own" on clients
  for select using (
    get_my_role() = 'client'
    and prospect_id = (select prospect_id from profiles where id = auth.uid())
  );


-- 3. Rétro-remplir : créer une entrée dans clients pour chaque prospect
--    avec statut = 'contrat_signe' qui n'a pas encore de client associé.
insert into clients (id, nom, email, telephone, secteur, sante, projets, depuis, ca, prospect_id)
select
  ((extract(epoch from now()) * 1000)::bigint + row_number() over ())  as id,
  trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, ''))           as nom,
  p.email,
  p.telephone,
  p.type_projet                                                         as secteur,
  85                                                                    as sante,
  0                                                                     as projets,
  extract(year from now())::text                                        as depuis,
  '0 DH'                                                               as ca,
  p.id                                                                  as prospect_id
from prospects p
where p.statut = 'contrat_signe'
  and not exists (
    select 1 from clients c
    where c.prospect_id = p.id
       or (p.email is not null and c.email = p.email)
  );


-- Vérification : tu dois voir tes clients apparaître ici
select id, nom, email, prospect_id from clients order by id;
