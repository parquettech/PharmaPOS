# Quick Start - Supabase Setup (5 Minutes)

## 🚀 Fast Setup Steps

### 1. Open Supabase Dashboard
👉 https://supabase.com/dashboard
- Sign in or create account
- Select your project

### 2. Run Database Schema (2 minutes)

1. Click **SQL Editor** → **New query**
2. Open file: `backend/database/schema.sql`
3. Copy ALL content → Paste in SQL Editor
4. Click **Run** ✅

### 3. Run RLS Policies (1 minute)

1. Click **SQL Editor** → **New query** (new tab)
2. Open file: `backend/database/complete_rls_policies.sql`
3. Copy ALL content → Paste in SQL Editor
4. Click **Run** ✅

### 4. Get API Keys (1 minute)

1. Click **Settings** → **API**
2. Copy these 3 values:

```
SUPABASE_URL = Project URL
SUPABASE_ANON_KEY = anon public key
SUPABASE_SERVICE_ROLE_KEY = service_role secret key (click Reveal)
```

### 5. Update Backend Config (1 minute)

1. Open `backend/.env`
2. Paste your keys:
```env
SUPABASE_URL=paste_here
SUPABASE_ANON_KEY=paste_here
SUPABASE_SERVICE_ROLE_KEY=paste_here
PORT=5000
ENVIRONMENT=development
```
3. Save file

### 6. Test & Start

```bash
# Test connection
cd backend
python test_supabase_connection.py

# Start backend
python main.py
```

✅ Done! Go to http://localhost:5173/signup to create account!

---

## 📁 Files You Need:
- `backend/database/schema.sql` - Database structure
- `backend/database/complete_rls_policies.sql` - Security policies
- `backend/.env` - Your configuration
