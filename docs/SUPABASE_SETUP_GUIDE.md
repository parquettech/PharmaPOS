# Complete Supabase Setup Guide - PharmaPOS

## 📋 Table of Contents
1. [Create/Access Supabase Project](#1-createaccess-supabase-project)
2. [Run Database Schema](#2-run-database-schema)
3. [Set Up RLS Policies](#3-set-up-rls-policies)
4. [Get API Keys](#4-get-api-keys)
5. [Configure Backend](#5-configure-backend)
6. [Test the Setup](#6-test-the-setup)

---

## 1. Create/Access Supabase Project

### Option A: If you already have a project
1. Go to: https://supabase.com/dashboard
2. Sign in with your account
3. Select your project: `bzoelvjmnpjslqqcbnqg` (or create a new one)

### Option B: Create a new project
1. Go to: https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name**: `PharmaPOS` (or any name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is fine
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to be ready

---

## 2. Run Database Schema

1. **Open SQL Editor**:
   - In Supabase Dashboard, click **"SQL Editor"** in left sidebar
   - Click **"New query"**

2. **Copy the Schema**:
   - Open file: `backend/database/schema.sql`
   - Select ALL the content (Ctrl+A)
   - Copy it (Ctrl+C)

3. **Paste and Run**:
   - Paste into the SQL Editor
   - Click **"Run"** button (or press Ctrl+Enter)
   - Wait for "Success" message

4. **Verify Tables Created**:
   - Click **"Table Editor"** in left sidebar
   - You should see these tables:
     - ✅ `admins`
     - ✅ `users`
     - ✅ `companies`
     - ✅ `products`
     - ✅ `stock`
     - ✅ `purchases`
     - ✅ `sales`

---

## 3. Set Up RLS Policies

### IMPORTANT: This step allows signup and login to work!

1. **Open SQL Editor Again**:
   - Click **"SQL Editor"** → **"New query"**

2. **Run This SQL** (Copy and paste all of it):

```sql
-- ========================================
-- FIX RLS POLICIES FOR PHARMAPOS
-- This allows signup and login to work
-- ========================================

-- Drop any existing policies
DROP POLICY IF EXISTS "Service role can access all users" ON users;
DROP POLICY IF EXISTS "Service role can access all admins" ON admins;
DROP POLICY IF EXISTS "Allow public signup" ON users;
DROP POLICY IF EXISTS "Allow public read for login" ON users;

-- ========================================
-- USERS TABLE POLICIES
-- ========================================

-- Policy 1: Allow anyone to INSERT (for signup)
CREATE POLICY "Allow public signup" ON users
    FOR INSERT
    WITH CHECK (true);

-- Policy 2: Allow anyone to SELECT (for login verification)
CREATE POLICY "Allow public read for login" ON users
    FOR SELECT
    USING (true);

-- Policy 3: Service role can do everything
CREATE POLICY "Service role can access all users" ON users
    FOR ALL
    USING (auth.role() = 'service_role');

-- ========================================
-- ADMINS TABLE POLICIES
-- ========================================

-- Admins are restricted to service_role only (more secure)
CREATE POLICY "Service role can access all admins" ON admins
    FOR ALL
    USING (auth.role() = 'service_role');

-- ========================================
-- COMPANIES TABLE POLICIES
-- ========================================

-- Allow service role full access
DROP POLICY IF EXISTS "Service role can access all companies" ON companies;
CREATE POLICY "Service role can access all companies" ON companies
    FOR ALL
    USING (auth.role() = 'service_role');

-- Allow public read/write for now (you can restrict later)
DROP POLICY IF EXISTS "Allow public access companies" ON companies;
CREATE POLICY "Allow public access companies" ON companies
    FOR ALL
    USING (true);

-- ========================================
-- OTHER TABLES (Products, Stock, Purchases, Sales)
-- ========================================

-- Products
DROP POLICY IF EXISTS "Service role can access all products" ON products;
CREATE POLICY "Service role can access all products" ON products
    FOR ALL
    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow public access products" ON products;
CREATE POLICY "Allow public access products" ON products
    FOR ALL
    USING (true);

-- Stock
DROP POLICY IF EXISTS "Service role can access all stock" ON stock;
CREATE POLICY "Service role can access all stock" ON stock
    FOR ALL
    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow public access stock" ON stock;
CREATE POLICY "Allow public access stock" ON stock
    FOR ALL
    USING (true);

-- Purchases
DROP POLICY IF EXISTS "Service role can access all purchases" ON purchases;
CREATE POLICY "Service role can access all purchases" ON purchases
    FOR ALL
    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow public access purchases" ON purchases;
CREATE POLICY "Allow public access purchases" ON purchases
    FOR ALL
    USING (true);

-- Sales
DROP POLICY IF EXISTS "Service role can access all sales" ON sales;
CREATE POLICY "Service role can access all sales" ON sales
    FOR ALL
    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow public access sales" ON sales;
CREATE POLICY "Allow public access sales" ON sales
    FOR ALL
    USING (true);
```

3. **Click "Run"** (or Ctrl+Enter)

4. **Verify Success**: You should see "Success. No rows returned" or similar

---

## 4. Get API Keys

1. **Go to Settings**:
   - Click **"Settings"** (gear icon) in left sidebar
   - Click **"API"**

2. **Copy These Values**:

   a. **Project URL**:
      - Under "Project URL"
      - Copy the full URL (e.g., `https://xxxxx.supabase.co`)
      - This is your `SUPABASE_URL`

   b. **Anon/Public Key**:
      - Under "Project API keys"
      - Find `anon` `public` key
      - Click the copy icon (or select and copy)
      - This is your `SUPABASE_ANON_KEY`

   c. **Service Role Key** (IMPORTANT for admin login):
      - Under "Project API keys"
      - Find `service_role` `secret` key
      - Click **"Reveal"** button
      - Click the copy icon
      - ⚠️ **Keep this secret!** Never commit it to git
      - This is your `SUPABASE_SERVICE_ROLE_KEY`

3. **Save these keys somewhere safe temporarily**

---

## 5. Configure Backend

1. **Open `.env` file**:
   - Go to `backend/.env`
   - If it doesn't exist, copy `backend/env.example.txt` to `backend/.env`

2. **Edit `.env` file** and add/replace:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Server Configuration
PORT=5000
ENVIRONMENT=development
```

3. **Replace the values**:
   - `SUPABASE_URL`: Paste your Project URL from step 4a
   - `SUPABASE_ANON_KEY`: Paste your anon key from step 4b
   - `SUPABASE_SERVICE_ROLE_KEY`: Paste your service_role key from step 4c

4. **Save the file**

---

## 6. Test the Setup

### Step 1: Test Backend Connection

```bash
cd backend
python test_supabase_connection.py
```

You should see:
```
[OK] Supabase URL: Configured
[OK] Supabase Anon Key: Configured
[OK] Supabase Service Role Key: Configured
[OK] 'users' table exists and is accessible
[OK] Connection test completed!
```

### Step 2: Create a Test User (Optional)

```bash
cd backend
python test_supabase_connection.py
```

This will create:
- Username: `admin`
- Password: (choose your own secure password)

### Step 3: Start Backend Server

```bash
cd backend
python main.py
```

Should see:
```
INFO:     Uvicorn running on http://0.0.0.0:5000
```

### Step 4: Test Frontend

1. Frontend should already be running at: http://localhost:5173
2. If not, run:
   ```bash
   cd frontend
   npm run dev
   ```

### Step 5: Sign Up / Login

**Option A: Sign Up (Recommended)**
1. Go to: http://localhost:5173/signup
2. Fill in:
   - Username: `admin` (or any username)
   - Password: (choose your own secure password) (or any password)
   - Name: `Administrator`
3. Click **"Sign Up"**
4. Should see success message

**Option B: Login with Existing User**
1. Go to: http://localhost:5173/login
2. If test user was created:
   - Username: `admin`
   - Password: (choose your own secure password)
3. Click **"Login"**
4. Should redirect to dashboard

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Database tables created (check Table Editor)
- [ ] RLS policies set up (no errors when running SQL)
- [ ] `.env` file configured with all 3 keys
- [ ] Backend connects successfully (`test_supabase_connection.py` passes)
- [ ] Can sign up new user (http://localhost:5173/signup)
- [ ] Can login (http://localhost:5173/login)
- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 5173

---

## 🔧 Troubleshooting

### "Cannot connect to Supabase"
- Check `.env` file has correct `SUPABASE_URL`
- Check internet connection
- Verify Supabase project is active

### "RLS policy violation"
- Re-run the RLS policies SQL (Step 3)
- Make sure all policies were created successfully

### "Invalid username or password"
- Check if user exists: Run `python backend/check_all_users.py`
- Verify password hash is correct
- Try signing up a new user instead

### "Service role key not configured"
- Make sure you added `SUPABASE_SERVICE_ROLE_KEY` to `.env`
- Restart backend after adding it

---

## 📞 Quick Reference

- **Supabase Dashboard**: https://supabase.com/dashboard
- **SQL Editor**: Dashboard → SQL Editor
- **API Keys**: Dashboard → Settings → API
- **Table Editor**: Dashboard → Table Editor
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000
- **Backend Docs**: http://localhost:5000/docs

---

## 🎉 You're All Set!

After completing these steps, your PharmaPOS app should be fully connected to Supabase and ready to use!
