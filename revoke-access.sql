-- ═══════════════════════════════════════════════════════════════════════════
-- CLADE AGENCY — Patch : Accès, blocage et nettoyage
-- À exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Permettre au directeur de supprimer un profil (révocation d'accès)
drop policy if exists "profiles_delete" on profiles;
create policy "profiles_delete" on profiles
  for delete using (is_director());


-- 2. Ajouter le champ portal_blocked aux prospects (blocage sans suppression)
alter table prospects add column if not exists portal_blocked boolean default false;


-- 3. Nettoyer les clients orphelins (sans prospect associé) — données de test
--    Décommente pour exécuter le nettoyage :
-- delete from clients
-- where prospect_id is null
--    or prospect_id not in (select id from prospects);


-- Vérification : voir les clients restants
select id, nom, email, prospect_id from clients order by id;
