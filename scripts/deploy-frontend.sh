#!/bin/bash
# Frontend Deployment Helper Script
# This script helps prepare and deploy the frontend

echo "=========================================="
echo "PharmaPOS Frontend Deployment Helper"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ ERROR: frontend/package.json not found!"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "✅ Found frontend/package.json"
echo ""

# Check for environment variables
echo "Checking environment variables..."
if [ -f "frontend/.env" ]; then
    echo "✅ Found frontend/.env file"
    echo ""
    echo "Current environment variables:"
    grep "^VITE_" frontend/.env 2>/dev/null || echo "No VITE_ variables found"
else
    echo "⚠️  No frontend/.env file found"
    echo ""
    echo "You'll need to set these in Vercel:"
    echo "  VITE_API_BASE_URL=https://your-backend-url/api"
    echo "  VITE_SUPABASE_URL=https://your-project.supabase.co"
    echo "  VITE_SUPABASE_ANON_KEY=your_anon_key"
    echo "  VITE_APP_NAME=PharmaPOS"
fi

echo ""
echo "=========================================="
echo "Vercel Deployment Instructions:"
echo "=========================================="
echo ""
echo "1. Go to https://vercel.com"
echo "2. Sign up with GitHub"
echo "3. Click 'Add New Project'"
echo "4. Import your GitHub repository"
echo "5. Configure:"
echo "   - Framework Preset: Vite"
echo "   - Root Directory: frontend"
echo "   - Build Command: npm run build"
echo "   - Output Directory: dist"
echo ""
echo "6. Add Environment Variables:"
echo "   - VITE_API_BASE_URL=https://your-backend-url/api"
echo "   - VITE_SUPABASE_URL=https://your-project.supabase.co"
echo "   - VITE_SUPABASE_ANON_KEY=your_anon_key"
echo "   - VITE_APP_NAME=PharmaPOS"
echo ""
echo "7. Click 'Deploy'"
echo ""
echo "=========================================="
echo "For detailed instructions, see:"
echo "DEPLOYMENT_GUIDE.md"
echo "=========================================="
