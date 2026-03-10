# PharmaPOS Setup Guide

## ✅ Current Status
- ✅ Backend server is running on port 5000
- ✅ Frontend server is running on port 5173  
- ✅ Supabase credentials are configured
- ⚠️ **Database tables need to be created in Supabase**

## 🚨 Error Resolution

If you're getting login errors, the most likely issue is that **database tables haven't been created in your Supabase project**.

### Steps to Fix:

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `bzoelvjmnpjslqqcbnqg`

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Schema SQL**
   - Open the file: `backend/database/schema.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press Ctrl+Enter

4. **Verify Tables Created**
   After running the SQL, you should see these tables:
   - `admins`
   - `users`
   - `companies`
   - `stock`
   - `purchases`
   - `sales`
   - `products`

5. **Create Default User (Optional)**
   The schema should create a default user:
   - Username: (choose your own username)
   - Password: (choose your own secure password)
   
   If not, you can create one via the Signup page at http://localhost:5173/signup

## 🧪 Test the Application

1. **Frontend**: http://localhost:5173
2. **Backend API Docs**: http://localhost:5000/docs

### Test Login:
- Username: (use the username you created)
- Password: (use the password you created)

Or sign up for a new account!

## 📝 Common Errors

### "Invalid username or password"
- **Cause**: User doesn't exist in database or wrong credentials
- **Solution**: Create user via signup or run schema SQL

### "Cannot connect to server"
- **Cause**: Backend not running
- **Solution**: Start backend with `cd backend && python main.py`

### "Supabase not configured"
- **Cause**: Missing .env file
- **Solution**: Copy `backend/env.example.txt` to `backend/.env` and add credentials

## 🔧 Quick Troubleshooting

Run these commands to check status:

```bash
# Check backend config
cd backend
python check_config.py

# Test backend connection
python ../test_connection.py
```
