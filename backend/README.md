# PharmaPOS Backend

FastAPI backend server for PharmaPOS Pharmacy Billing System.

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   copy env.example.txt .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here  # Optional
   
   PORT=5000
   ENVIRONMENT=development
   ```

### 3. Set Up Database

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the SQL from `database/schema.sql` to create the users table
4. Or follow the instructions in `DATABASE_SETUP.md`

### 4. Create Default User

Create a default user by running the database setup SQL. See `database/schema.sql` for the SQL statement.

**Note:** You will need to create your own user account through the application's signup feature or by running custom SQL queries. No default credentials are provided for security reasons.

### 5. Run the Server

**Important:** Always run commands from within the `server` folder.

```bash
# Navigate to server folder
cd server

# Using uvicorn directly
uvicorn main:app --reload --port 5000

# Or using Python
python main.py
```

The server will start on `http://localhost:5000`

**Note:** All backend code is contained within the `server` folder. Make sure you're in the `server` directory when running these commands.

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current authenticated user (requires Bearer token)

### Health Check

- `GET /` - Root endpoint
- `GET /health` - Health check endpoint

## API Documentation

Once the server is running, you can access:
- Swagger UI: `http://localhost:5000/docs`
- ReDoc: `http://localhost:5000/redoc`

## Project Structure

```
server/
├── main.py                 # FastAPI app entry point
├── config.py              # Configuration settings
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables (create from env.example.txt)
├── routers/               # API route handlers
│   ├── __init__.py
│   └── auth.py           # Authentication routes
├── models/                # Pydantic models
│   ├── __init__.py
│   └── user.py           # User models
├── services/              # Business logic services
│   ├── __init__.py
│   └── supabase_service.py  # Supabase client service
└── database/              # Database setup files
    ├── schema.sql        # Database schema SQL
    ├── init_db.py        # Database initialization script
    └── DATABASE_SETUP.md  # Database setup instructions
```

## Development

### Run with auto-reload

```bash
uvicorn main:app --reload
```

### Run tests

```bash
# Add tests when ready
pytest
```

## Troubleshooting

### Supabase Connection Issues

- Check that your `.env` file has correct `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Verify that the users table exists in your Supabase database
- Check that Row Level Security (RLS) is configured correctly

### Database Errors

- Make sure you've run the database setup SQL (see `database/schema.sql`)
- Verify that users exist in the database: `SELECT * FROM users;`
- Check Supabase logs for any errors

### Port Already in Use

- Change the `PORT` in `.env` to a different port
- Or stop the process using port 5000

## Notes

- The backend uses bcrypt for password hashing
- JWT tokens are used for authentication
- Passwords are never stored in plain text
- Default JWT expiration is 7 days
