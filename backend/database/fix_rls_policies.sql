-- Fix RLS Policies to Allow User Signup
-- Run this SQL in Supabase SQL Editor: https://supabase.com/dashboard
-- This allows public INSERT on users table for signup, while keeping other operations secure

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Service role can access all users" ON users;
DROP POLICY IF EXISTS "Service role can access all admins" ON admins;
DROP POLICY IF EXISTS "Allow public signup" ON users;
DROP POLICY IF EXISTS "Allow public read for login" ON users;

-- New policy for users table: Allow anyone to INSERT (for signup)
CREATE POLICY "Allow public signup" ON users
    FOR INSERT
    WITH CHECK (true);

-- Allow public SELECT for login (read usernames and password hashes)
CREATE POLICY "Allow public read for login" ON users
    FOR SELECT
    USING (true);

-- Service role can do everything on users table
CREATE POLICY "Service role can access all users" ON users
    FOR ALL
    USING (auth.role() = 'service_role');

-- Keep admins table restricted to service_role only
CREATE POLICY "Service role can access all admins" ON admins
    FOR ALL
    USING (auth.role() = 'service_role');
