-- ═══════════════════════════════════════════════════════════════════════════
-- CLADE AGENCY — Colonnes manquantes (à exécuter dans Supabase SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── EMPLOYES : primes, fiches de paie et mode de rémunération ────────────

alter table employes add column if not exists primes           jsonb default '[]';
alter table employes add column if not exists payslips         jsonb default '[]';
alter table employes add column if not exists mode_remuneration text default 'mensuel';
alter table employes add column if not exists role             text;
alter table employes add column if not exists permissions      jsonb;

-- ── JOURS FÉRIÉS : support période (date de fin optionnelle) ─────────────

alter table jours_ferier add column if not exists date_fin date;
