# Deploy PharmaPOS on Vercel (Free Tier)

PharmaPOS has two parts: **Frontend** (React) and **Backend** (FastAPI). Vercel hosts the frontend. The backend must be deployed separately (Railway, Render, etc.).

---

## Step 1: Deploy Backend First (Required)

Vercel cannot host the FastAPI backend. Deploy it on a free service:

### Option A: Railway (Recommended)
1. Go to [railway.app](https://railway.app) → Sign up (free)
2. **New Project** → **Deploy from GitHub** → Select `sanjay-1505/Pharmapos_Work`
3. Set **Root Directory**: `backend`
4. Add **Environment Variables** (Settings → Variables):
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_ANON_KEY` = your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role key
5. Railway will auto-detect Python and run the app
6. After deploy, copy your backend URL (e.g., `https://pharmapos-backend.up.railway.app`)

### Option B: Render
1. Go to [render.com](https://render.com) → Sign up (free)
2. **New** → **Web Service**
3. Connect GitHub repo `sanjay-1505/Pharmapos_Work`
4. **Root Directory**: `backend`
5. **Build Command**: `pip install -r requirements.txt`
6. **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
7. Add environment variables (same as above)
8. Deploy and copy the backend URL

---

## Step 2: Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. **Add New Project** → Import `sanjay-1505/Pharmapos_Work`
3. Configure:
   - **Root Directory**: `frontend` (click Edit, set to `frontend`)
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Environment Variables** (add before deploying):
   - `VITE_API_URL` = `https://your-backend-url.railway.app/api`  
     (Replace with your actual backend URL from Step 1)

5. Click **Deploy**

---

## Step 3: Update CORS on Backend

After deploying, add your Vercel frontend URL to backend CORS:

In your backend `.env` or Railway/Render environment variables, add:
```
CORS_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app
```

Or update `backend/config.py` to include your Vercel domain in `cors_origins`.

---

## Step 4: Update vercel.json (Optional)

If you want API requests to go through Vercel (proxy), edit `frontend/vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://YOUR-BACKEND-URL/api/:path*"
    }
  ]
}
```

Then set `VITE_API_URL` to `/api` (relative) so requests go to same domain and get proxied.

---

## Summary

| Component | Where to Deploy | Free Tier |
|-----------|-----------------|-----------|
| Frontend  | Vercel          | ✅ Yes    |
| Backend   | Railway or Render | ✅ Yes  |
| Database  | Supabase        | ✅ Yes    |

Your app will be live at: `https://your-project.vercel.app`
