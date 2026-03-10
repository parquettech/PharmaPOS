# PharmaPOS Web Application

A complete web-based Point of Sale (POS) application for Indian pharmacy billing built with FastAPI, Supabase, React, and Tailwind CSS.

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, Supabase Postgres
- **Frontend**: React 18, Vite, Tailwind CSS
- **Database**: Supabase Postgres (free tier)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel (frontend), Railway/Supabase Edge Functions (backend)

## Features

1. **Login**: Supabase Auth (username/password) - Works on desktop + mobile
2. **Admin Tab**: CRUD for companies, drugs, and users
3. **Purchase Tab**: Supplier selector, GST bill format, auto stock updates, PDF generation
4. **Sales Tab**: Customer selector, expiry warnings, PDF bills
5. **GST Tab**: Monthly summaries, GSTR-1 CSV export
6. **Reports Tab**: Stock reports, Purchase/Sales registers, CSV export

## Setup Instructions

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and run the SQL from `supabase/schema.sql`
4. Go to **Settings → API** and copy:
   - Project URL
   - Anon Key
   - Go to **Settings → Database → Connection string** and copy the connection string

### 2. Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file in `backend/`:
```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
RESEND_API_KEY=optional-for-email-backups
BACKUP_EMAIL=your-email@example.com
```

4. Run the backend:
```bash
uvicorn main:app --reload --port 8000
```

Backend will be available at: `http://localhost:8000`

### 3. Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in `frontend/`:
```env
VITE_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
VITE_API_URL=http://localhost:8000
```

4. Run the frontend:
```bash
npm run dev
```

Frontend will be available at: `http://localhost:3000`

## Quick Start

1. **Start Backend** (Terminal 1):
```bash
cd backend
uvicorn main:app --reload --port 8000
```

2. **Start Frontend** (Terminal 2):
```bash
cd frontend
npm run dev
```

3. **Access the app**: Open `http://localhost:3000` in your browser

4. **Create a user**: 
   - Go to Supabase Dashboard → Authentication → Users → Add User
   - Create a user with email and password
   - Login with those credentials

## Project Structure

```
pharmapos-web/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── models.py               # SQLAlchemy models
│   ├── database.py             # Database connection
│   ├── crons.py                # Scheduled tasks (weekly backup)
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Docker configuration
│   └── routers/
│       ├── auth.py             # Authentication routes
│       ├── companies.py        # Companies CRUD
│       ├── drugs.py            # Drugs CRUD
│       ├── purchases.py        # Purchase routes
│       ├── sales.py            # Sales routes
│       ├── gst.py              # GST routes
│       └── reports.py          # Reports routes
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main app component
│   │   ├── main.jsx            # React entry point
│   │   ├── components/         # React components
│   │   ├── lib/                # Supabase client
│   │   └── utils/              # Utility functions
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── supabase/
    └── schema.sql              # Database schema
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/login` - Login
- `GET /api/companies` - Get all companies
- `POST /api/companies` - Create company
- `GET /api/drugs` - Get all drugs
- `POST /api/drugs` - Create drug
- `POST /api/purchases` - Create purchase
- `POST /api/sales` - Create sale
- `GET /api/gst/summary/{month}` - Get GST summary
- `GET /api/reports/stock` - Get stock report

## Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Backend (Railway/Render)

1. Connect GitHub repository
2. Set environment variables
3. Deploy

## Features Details

- **Company Type Restrictions**: Suppliers can't do Sales
- **GST Logic**: CGST+SGST (intra-state) vs IGST (inter-state)
- **Stock Management**: Automatic updates on purchase/sale
- **PDF Generation**: Client-side PDF generation using jsPDF
- **Weekly Backup**: Automated weekly CSV backup via email (optional)

## License

This project is provided as-is for small business use in India.
