# Create User Account - Step by Step

## ✅ Supabase Connection Verified!

Your Supabase is connected and working. The database tables exist, but there are no users yet.

## 🚀 Create Your Account (Choose One Method):

### Method 1: Sign Up Page (Easiest - Recommended)

1. **Go to Sign Up Page:**
   - Open browser
   - Go to: **http://localhost:5173/signup**

2. **Fill in the form:**
   - **Username**: `admin` (or any username you want)
   - **Password**: (choose a strong password - min 8 chars, uppercase, lowercase, number)
   - **Name**: Your name
   - **Email**: (optional)

3. **Click "Sign Up"**
   - The account will be created
   - You'll be redirected to login

4. **Login:**
   - Go to: **http://localhost:5173/login**
   - Use the credentials you just created

---

### Method 2: Create User via Script (Advanced)

To use this method, you need the **Service Role Key** from Supabase:

1. **Get Service Role Key:**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Go to **Settings** → **API**
   - Copy the **`service_role`** key (secret key - starts with `eyJ...`)

2. **Add to .env file:**
   - Open `backend/.env`
   - Add this line:
     ```
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
     ```
   - Replace `your_service_role_key_here` with the actual key

3. **Run the script:**
   ```bash
   cd backend
   python test_supabase_connection.py
   ```
   
   This will create a test user:
   - Username: `admin`
   - Password: (use your chosen password)

---

### Method 3: Create User Directly in Supabase Dashboard

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Select your project

2. **Go to Table Editor:**
   - Click **Table Editor** in left sidebar
   - Click on **`users`** table

3. **Insert Row:**
   - Click **Insert** → **Insert row**
   - Fill in:
     - `username`: `admin`
     - `password_hash`: (Generate using Python - see below)
     - `name`: `Administrator`
     - `status`: `Active`

4. **Generate Password Hash:**
   - Run in Python:
   ```python
   import bcrypt
   password = "your_secure_password_here"
   salt = bcrypt.gensalt()
   hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
   print(hashed.decode('utf-8'))
   ```
   - Copy the output and paste in `password_hash` field

5. **Save** and login!

---

## 📋 Quick Test

After creating an account, test login:
- URL: http://localhost:5173/login
- Use the credentials you created

---

## 🔍 Troubleshooting

### "Invalid username or password"
- Make sure you're using the correct username and password
- Check if user exists: Run `python backend/test_supabase_connection.py`

### Sign Up page not working
- Check browser console (F12) for errors
- Make sure backend is running: http://localhost:5000/health
- Check if database tables exist (they should - test confirmed they do)

### Still can't login
1. Verify user exists in database:
   - Supabase Dashboard → Table Editor → users table
   - Check if your username is there

2. Check password hash:
   - Make sure password was hashed with bcrypt
   - Sign Up page does this automatically
