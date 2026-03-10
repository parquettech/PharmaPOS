# Database Setup Instructions

## Supabase Setup

### Step 1: Create Users Table

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the following SQL to create the users table:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'ADMIN',
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
```

### Step 2: Create Your First User

**Option A: Use the Signup Feature**
Use the application's signup feature at `/signup` to create your first admin user account.

**Option B: Create User via SQL**
To create a user via SQL, first generate a password hash using Python:

```python
import bcrypt

password = "your_secure_password"
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
print(hashed.decode('utf-8'))
```

Then insert the user:

```sql
-- Insert admin user (replace with your values)
INSERT INTO users (username, password_hash, name, role, status)
VALUES (
    'your_username',
    'your_generated_password_hash',
    'Your Name',
    'ADMIN',
    'Active'
)
ON CONFLICT (username) DO NOTHING;
```

### Step 3: Set Up Row Level Security (Optional)

If you want to enable RLS:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (allows backend to access all users)
CREATE POLICY "Service role can access all users" ON users
    FOR ALL
    USING (auth.role() = 'service_role');
```

**Note:** For now, you can disable RLS or use the service_role key in your backend for full access.

### Step 4: Get Service Role Key (Recommended)

1. Go to Supabase Dashboard → Settings → API
2. Copy the **service_role** key (keep this secret!)
3. Add it to your `.env` file:

```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 5: Update Backend to Use Service Role (Optional)

If you want full backend access, update `config.py` to use service_role_key when available.

## Verify Setup

After running the SQL:

1. Go to **Table Editor** in Supabase
2. Check that the `users` table exists
3. Verify that your user account has been created
4. The password hash should be stored (you won't see the plain password)

## Testing

1. Start the backend: `python main.py` or `uvicorn main:app --reload`
2. Test login endpoint: `POST http://localhost:5000/api/auth/login`
   ```json
   {
     "username": "your_username",
     "password": "your_password"
   }
   ```
3. Or use the frontend signup/login pages to create and authenticate your account.

## Troubleshooting

- **Table doesn't exist**: Make sure you ran the CREATE TABLE SQL
- **Authentication error**: Check that SUPABASE_URL and SUPABASE_ANON_KEY are correct in .env
- **RLS blocking queries**: Either disable RLS or use service_role_key
