# 🏎 F1DB — Formula One Database

A full-stack F1 database admin panel built with **React + Vite + Supabase**.

- **Admins** can create, edit, delete all data and import from external APIs
- **Users** can browse all data (read-only)
- Auth via Supabase (email/password)
- Row Level Security enforced at the database level

---

## 📁 Project Structure

```
f1db/
├── src/
│   ├── lib/
│   │   └── supabase.js        # Supabase client + all DB methods
│   ├── hooks/
│   │   ├── useAuth.jsx        # Auth context (session, profile, isAdmin)
│   │   └── useCRUD.js         # Generic CRUD hook for all tables
│   ├── components/
│   │   ├── Layout.jsx         # Header + nav shell
│   │   └── Modal.jsx          # Reusable modal wrapper
│   ├── pages/
│   │   ├── AuthPage.jsx       # Login / Register
│   │   ├── Dashboard.jsx      # Overview + stats
│   │   ├── Drivers.jsx        # Drivers CRUD (shared sub-components)
│   │   ├── DataPages.jsx      # Teams, Seasons, Circuits, Races
│   │   ├── ImportPage.jsx     # Ergast / Jolpica / OpenF1 import
│   │   └── UsersPage.jsx      # User management (admin only)
│   ├── App.jsx                # Root + routing
│   ├── main.jsx               # React entry point
│   └── index.css              # Global styles
├── supabase_schema.sql        # ← Run this first in Supabase SQL editor
├── .env.example               # Copy to .env.local
├── package.json
├── vite.config.js
└── index.html
```

---

## 🚀 Setup Guide

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) → New Project.

### 2. Run the database schema

In your Supabase project → **SQL Editor** → paste the entire contents of `supabase_schema.sql` and run it.

This creates:
- `profiles` table (linked to auth.users, stores role)
- `seasons`, `circuits`, `teams`, `drivers`, `races` tables
- Row Level Security policies (read for all users, write for admins only)
- Auto-create profile trigger on signup

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in your credentials from Supabase → Settings → API:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Install dependencies and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 👤 Creating the First Admin

After running the app and registering your first account, promote it to admin via Supabase SQL:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your@email.com';
```

After that, log out and back in. You'll see the Import and Users tabs appear.

From the **Users** tab, you can promote/demote any other user to admin directly in the UI.

---

## 🔐 Auth & Roles

| Feature              | User | Admin |
|----------------------|------|-------|
| View all data        | ✅   | ✅    |
| Add / Edit / Delete  | ❌   | ✅    |
| Import from APIs     | ❌   | ✅    |
| Manage users         | ❌   | ✅    |

Roles are enforced by **Supabase Row Level Security** — not just the UI. Even direct API calls respect the policies.

---

## 📡 Data Import Sources

From the **Import** tab (admin only):

| Source   | Data                                        |
|----------|---------------------------------------------|
| Ergast   | Seasons, Circuits, Teams, Drivers, Races    |
| Jolpica  | Same as Ergast (modern mirror)              |
| OpenF1   | Race sessions with real-time telemetry data |

Imports are **upsert-based** — running them multiple times won't create duplicates.

**Recommended import order:** Seasons → Circuits → Teams → Drivers → Races

---

## 🏗 Build for Production

```bash
npm run build
```

Deploy the `dist/` folder to Vercel, Netlify, Cloudflare Pages, etc.

For Vercel, add your environment variables in the project settings under Environment Variables.

# f1apex
