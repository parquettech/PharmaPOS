#!/bin/bash
# Backend Deployment Helper Script
# This script helps prepare and deploy the backend

echo "=========================================="
echo "PharmaPOS Backend Deployment Helper"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  WARNING: backend/.env file not found!"
    echo "Please create it with the following variables:"
    echo ""
    echo "SUPABASE_URL=your_supabase_url"
    echo "SUPABASE_ANON_KEY=your_anon_key"
    echo "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
    echo "PORT=3000"
    echo "ENVIRONMENT=production"
    echo "CORS_ORIGINS=https://your-frontend.vercel.app"
    echo ""
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ Found backend/.env file"
fi

# Check if requirements.txt exists
if [ ! -f "backend/requirements.txt" ]; then
    echo "❌ ERROR: backend/requirements.txt not found!"
    exit 1
fi

echo "✅ Found backend/requirements.txt"
echo ""

# Display deployment options
echo "Choose your deployment platform:"
echo "1) Railway (Recommended)"
echo "2) Render"
echo "3) Docker"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚂 Railway Deployment Instructions:"
        echo "1. Go to https://railway.app"
        echo "2. Sign up with GitHub"
        echo "3. Click 'New Project' → 'Deploy from GitHub repo'"
        echo "4. Select your repository"
        echo "5. Set Root Directory to: backend"
        echo "6. Set Start Command to: uvicorn main:app --host 0.0.0.0 --port \$PORT"
        echo "7. Add environment variables from backend/.env"
        echo "8. Deploy!"
        ;;
    2)
        echo ""
        echo "🎨 Render Deployment Instructions:"
        echo "1. Go to https://render.com"
        echo "2. Sign up with GitHub"
        echo "3. Click 'New +' → 'Web Service'"
        echo "4. Connect your GitHub repository"
        echo "5. Configure:"
        echo "   - Root Directory: backend"
        echo "   - Environment: Python 3"
        echo "   - Build Command: pip install -r requirements.txt"
        echo "   - Start Command: uvicorn main:app --host 0.0.0.0 --port \$PORT"
        echo "6. Add environment variables from backend/.env"
        echo "7. Deploy!"
        ;;
    3)
        echo ""
        echo "🐳 Docker Deployment:"
        echo "Building Docker image..."
        cd backend
        docker build -t pharmapos-backend .
        echo ""
        echo "✅ Docker image built!"
        echo "Run with: docker run -p 8000:8000 --env-file .env pharmapos-backend"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "For detailed instructions, see:"
echo "DEPLOYMENT_GUIDE.md"
echo "=========================================="
