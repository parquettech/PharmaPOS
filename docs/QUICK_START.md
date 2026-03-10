# Quick Start Guide - PharmaPOS

## ✅ Login Page is Working!

You're seeing "Invalid username or password" which means the app is working correctly! You just need to create a user account.

## 🚀 Three Ways to Create an Account:

### Option 1: Sign Up via Web Interface (Easiest)
1. Go to: http://localhost:5173/signup
2. Fill in the form:
   - Username: Choose your username
   - Password: Choose a strong password (min 8 chars, uppercase, lowercase, number)
   - Name: Your name
3. Click "Sign Up"
4. Go back to login page and use your credentials

### Option 2: Create User via Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to "Table Editor"
4. Click on "users" table
5. Click "Insert row"
6. Fill in:
   - username: `admin`
   - password_hash: (Run this Python command to generate hash)
   - name: `Administrator`
   - status: `Active`
7. For password_hash, run in Python:
   ```python
   import bcrypt
   password = "your_secure_password_here"
   salt = bcrypt.gensalt()
   hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
   print(hashed.decode('utf-8'))
   ```

## 📋 Important: Database Tables Must Be Created First!

Before you can sign up or login, make sure database tables are created:

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Click "New query"
5. Open file: `backend/database/schema.sql`
6. Copy ALL the SQL code
7. Paste into SQL Editor
8. Click "Run" (or press Ctrl+Enter)

## 🔐 Recommended: Use Sign Up Page

The easiest way is to use the Sign Up page:
- URL: http://localhost:5173/signup
- Create your account
- Then login at http://localhost:5173/login

---

**Current Status:**
- ✅ Frontend: Running on http://localhost:5173
- ✅ Backend: Running on http://localhost:5000
- ✅ Login Page: Working (you can see it!)
- ⚠️ Need: Create user account to login
