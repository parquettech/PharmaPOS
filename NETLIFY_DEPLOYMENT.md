# Netlify Deployment Configuration

## Important: Netlify Site Settings

Make sure your Netlify site is configured correctly:

### In Netlify Dashboard:

1. **Go to**: Site settings → Build & deploy → Build settings

2. **Configure**:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`

3. **Environment Variables** (Site settings → Environment variables):
   ```
   VITE_API_BASE_URL=https://your-backend.onrender.com/api
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_APP_NAME=PharmaPOS
   ```

4. **Deploy Settings**:
   - **Branch to deploy**: `main` (or your main branch)
   - **Build command**: Leave empty (uses netlify.toml)
   - **Publish directory**: Leave empty (uses netlify.toml)

## Files Created

- `frontend/netlify.toml` - Netlify configuration with MIME types and redirects
- `frontend/public/_redirects` - SPA routing redirects

## After Configuration

1. **Trigger a new deploy**:
   - Go to Netlify dashboard → Deploys
   - Click "Trigger deploy" → "Clear cache and deploy site"

2. **Verify**:
   - Check build logs for errors
   - Visit your site URL
   - Check browser console for errors

## Troubleshooting

If MIME type errors persist:

1. **Clear Netlify cache**: Trigger deploy with "Clear cache"
2. **Check build logs**: Ensure build completes successfully
3. **Verify files**: Check that `dist` folder contains built files
4. **Check base directory**: Ensure Netlify is building from `frontend` folder
