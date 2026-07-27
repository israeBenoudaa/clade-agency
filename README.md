# CLADE — Plateforme de gestion d'agence d'architecture

Application web complète pour la gestion intégrée d'une agence d'architecture : projets, équipes, finance, CRM et portail client.

Stack : **React 18 + Vite + Tailwind CSS + Supabase**.

---

## Aperçu

- **Login unique** avec toggle Collaborateur / Client (effet wow, mesh animé, plan architectural)
- **Espace staff** : Vue stratégique, Projets (avec Gantt), RH, Finance, CRM
- **Espace client** : suivi projet, livrables, dépenses, messagerie
- **Administration** : page réservée au Directeur Général pour créer logins/mdp
- **6 rôles** : Directeur, Chef de Projet, Architecte, RH, Finance, Client
- **Mobile-first responsive** : sidebar drawer, bottom-nav client, tables → cards
- **Sécurité** : Row Level Security Supabase, Edge Function sécurisée pour création users

---

## Prérequis

- **Node.js** ≥ 18
- **npm** ≥ 9 (ou pnpm / yarn)
- Un compte **Supabase** gratuit ([supabase.com](https://supabase.com))
- (Optionnel pour l'Edge Function) **Supabase CLI** ([install](https://supabase.com/docs/guides/cli))

---

## Installation locale

```bash
# 1. Installer les dépendances
npm install

# 2. Copier le fichier d'environnement
cp .env.example .env

# 3. Renseigner tes clés Supabase (voir section suivante)
# ouvrir .env et compléter VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

# 4. Lancer en dev
npm run dev
```

L'app tourne sur **http://localhost:5173**.

---

## Configuration Supabase (étape par étape)

### 1. Créer un projet Supabase

1. Va sur [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Choisis un nom (ex. `clade-agency`), une région proche (Frankfurt/London pour le Maroc)
3. Note le mot de passe BDD quelque part

### 2. Récupérer les clés API

Dans ton projet Supabase → **Settings → API**, copie :
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` → `VITE_SUPABASE_ANON_KEY`

Renseigne ces valeurs dans `.env`.

### 3. Exécuter le schéma SQL

1. Dans Supabase → **SQL Editor → New query**
2. Copie tout le contenu de `supabase/schema.sql`
3. Clique sur **Run**

Ça crée toutes les tables (profiles, projects, invoices, etc.) et les politiques RLS.

### 4. Créer le premier compte Directeur

Comme l'app exige un directeur pour créer les autres comptes, il faut créer le premier à la main.

**Option A — Via le dashboard Supabase :**

1. **Authentication → Users → Add user → Create new user**
2. Email : `directeur@clade.ma` (ou ce que tu veux), mot de passe au choix, **active "Auto Confirm User"**
3. Note l'UUID du user créé
4. **SQL Editor → New query** et exécute :

```sql
insert into public.profiles (id, email, full_name, role, active)
values (
  'UUID_DU_USER_COLLE_ICI',
  'directeur@clade.ma',
  'Nom Directeur',
  'directeur',
  true
);
```

**Option B — Tout en SQL :**

```sql
-- 1. Crée le user (remplace email et password)
-- (à faire via le dashboard Auth, car l'API SQL ne permet pas de définir un mot de passe)
```

Tu peux maintenant te connecter sur `/login` avec ces identifiants. Tu auras accès à la section **Administration → Utilisateurs & Accès** pour créer les autres comptes.

### 5. Déployer l'Edge Function `create-user`

Cette fonction permet au Directeur de créer des comptes utilisateurs.

**Installation Supabase CLI :**

```bash
# macOS
brew install supabase/tap/supabase

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux / autres : https://supabase.com/docs/guides/cli/getting-started
```

**Déploiement :**

```bash
# Login Supabase CLI
supabase login

# Lier ton projet local au projet distant (récupère le project ref depuis l'URL du dashboard)
supabase link --project-ref ton-project-ref

# Déployer la fonction
supabase functions deploy create-user
```

> ✅ La fonction est automatiquement protégée : seul un utilisateur ayant le rôle `directeur` dans `profiles` peut l'appeler.

---

## Lancer l'app

```bash
npm run dev        # mode dev (http://localhost:5173)
npm run build      # build production (dossier dist/)
npm run preview    # preview du build
```

---

## Architecture du projet

```
clade-agency/
├── public/
│   └── clade-icon.svg          # Favicon / logo
├── src/
│   ├── components/
│   │   ├── ui/                 # Logo, Avatar, Badge, ProgressBar, Sparkline
│   │   └── ProtectedRoute.jsx  # Guard d'accès par rôle
│   ├── context/
│   │   └── AuthContext.jsx     # Session + profil utilisateur
│   ├── data/                   # Données mockées (à remplacer progressivement par requêtes Supabase)
│   ├── layouts/
│   │   ├── StaffLayout.jsx     # Sidebar + header pour collaborateurs
│   │   └── ClientLayout.jsx    # Header + bottom-nav mobile pour clients
│   ├── lib/
│   │   └── supabase.js         # Client Supabase + helpers rôles
│   ├── pages/
│   │   ├── auth/LoginPage.jsx
│   │   ├── dashboard/          # Pages staff
│   │   └── client/             # Pages client
│   ├── styles/index.css        # Tailwind + composants custom
│   ├── App.jsx                 # Routing
│   └── main.jsx                # Entry point
├── supabase/
│   ├── schema.sql              # Schéma BDD + RLS
│   └── functions/
│       └── create-user/        # Edge Function
├── .env.example
├── tailwind.config.js
├── vite.config.js
└── package.json
```

---

## Rôles & permissions

| Rôle | Accès |
|------|-------|
| **Directeur Général** | Tout + création de comptes |
| **Chef de Projet** | Tous les modules sauf admin |
| **Architecte** | Modules Projets / RH (lecture) / consultation |
| **RH** | Module RH complet + lecture projets |
| **Finance** | Module Finance complet + lecture projets |
| **Client** | Portail client : son projet, ses livrables, ses dépenses, messages |

Les politiques **Row Level Security** dans `schema.sql` appliquent ces restrictions au niveau base de données.

---

## Personnalisation

### Couleurs

Modifie `tailwind.config.js` pour ajuster la palette :

```js
colors: {
  ink: '#0A1E3F',      // bleu nuit dominant
  electric: '#06B6D4', // cyan accent
  paper: '#FAFBFD',    // fond clair
  // ...
}
```

### Typographies

Les polices sont chargées via Google Fonts dans `index.html`. Pour changer :
1. Modifie le `<link>` dans `index.html`
2. Ajuste `fontFamily` dans `tailwind.config.js`

### Données mockées → données réelles

Les fichiers dans `src/data/` contiennent des données d'exemple. Pour brancher Supabase, remplace les imports par des requêtes :

```jsx
// Avant
import { projets } from '../../data/mockData'

// Après
const [projets, setProjets] = useState([])
useEffect(() => {
  supabase.from('projects').select('*').then(({ data }) => setProjets(data))
}, [])
```

---

## Roadmap suggérée

- [ ] Brancher chaque page sur les vraies données Supabase
- [ ] Supabase Storage pour les livrables (upload/download)
- [ ] Notifications temps réel via Supabase Realtime
- [ ] Export PDF des rapports (jsPDF ou React-PDF)
- [ ] Diagramme de Gantt éditable (drag & drop)
- [ ] Module BIM avec viewer 3D (Three.js ou Forge Autodesk)
- [ ] App mobile native (React Native partageant le même backend)

---

## Support

Pour toute question sur le code : ouvre une issue ou contacte l'équipe technique.

© 2026 CLADE Architecture
