# PharmaPOS - Pharmacy Point of Sale System

A comprehensive pharmacy billing and inventory management system built with React (Frontend) and FastAPI (Backend), using Supabase as the database.

## Features

- **User Management**: Admin and user roles with secure authentication
- **Company Management**: Manage suppliers, middlemen, and third parties
- **Stock Management**: Track inventory with batch numbers, expiry dates, and pricing
- **Purchase Management**: Record purchases with detailed item tracking
- **Sales Management**: Process sales transactions with invoice generation
- **Reports**: Generate Purchase Registry, Sales Registry, and Stock List reports
- **PDF Export**: Download invoices and reports in PDF format

## Tech Stack

### Frontend
- React 19
- Vite
- Tailwind CSS
- React Router
- Axios
- jsPDF & html2canvas (for PDF generation)

### Backend
- FastAPI
- Python 3.x
- Supabase (PostgreSQL)
- JWT Authentication

## Project Structure

```
PharmaPOS/
├── frontend/             # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service layer
│   │   └── utils/        # Utility functions
│   ├── package.json
│   └── vite.config.js
│
├── backend/              # Backend FastAPI application
│   ├── routers/          # API route handlers
│   ├── models/           # Pydantic models
│   ├── services/          # Business logic
│   ├── database/          # Database schema and setup
│   ├── main.py           # FastAPI app entry point
│   └── requirements.txt
│
├── docs/                 # Documentation
├── scripts/              # Utility scripts
└── README.md             # This file
```

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Supabase account and project

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd PharmaPOS
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

### 3. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

### 4. Environment Configuration

Create a `.env` file in the `backend` directory with the following structure:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=3000
ENVIRONMENT=development
```

**Important**: Never commit the `.env` file to version control. It contains sensitive credentials.

### 5. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the SQL scripts from `backend/database/` in the following order:
   - `schema.sql` - Main database schema
   - `stock_available_view.sql` - Stock availability view
   - `auth_security_schema.sql` - Authentication and security tables
   - `complete_rls_policies.sql` - Row Level Security policies

See `backend/DATABASE_SETUP.md` for detailed instructions.

## Running the Application

### Start Backend Server

```bash
cd backend
python main.py
```

The backend will run on `http://localhost:3000` (or the port specified in your `.env` file).

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:5173` (or next available port).

## API Documentation

Once the backend is running:
- **Swagger UI**: `http://localhost:3000/docs`
- **ReDoc**: `http://localhost:3000/redoc`

## Development

### Frontend Commands

```bash
cd frontend
npm run dev      # Development server with hot reload
npm run build    # Production build
npm run preview   # Preview production build
```

### Backend Commands

```bash
cd backend
python main.py                    # Run server
uvicorn main:app --reload         # Development with auto-reload
uvicorn main:app --reload --port 3000  # Custom port
```

## Security Notes

- Always keep your `.env` file secure and never commit it
- Use environment variables for all sensitive configuration
- The `.gitignore` file is configured to exclude sensitive files
- Never share your Supabase service role key publicly

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure all tests pass
4. Submit a pull request

## License

Private project - All rights reserved

## Support

For setup issues, refer to the documentation in the `docs/` directory:
- `docs/QUICK_START.md` - Quick start guide
- `docs/SUPABASE_SETUP_GUIDE.md` - Supabase setup instructions
- `backend/DATABASE_SETUP.md` - Database setup guide
