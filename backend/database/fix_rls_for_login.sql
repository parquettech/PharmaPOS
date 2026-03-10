-- Fix RLS Policies to Allow Login (Read Access)
-- Run this in Supabase SQL Editor

-- Allow service_role to read from both tables (already should work, but ensuring)
-- Allow anon to read from users table for login checks
-- Keep admins restricted to service_role only

-- Drop existing policies
DROP POLICY IF EXISTS "Service role can access all users" ON users;
DROP POLICY IF EXISTS "Service role can access all admins" ON admins;
DROP POLICY IF EXISTS "Allow public signup" ON users;

-- Users table policies
-- Allow public INSERT (signup)
CREATE POLICY "Allow public signup" ON users
    FOR INSERT
    WITH CHECK (true);

-- Allow public SELECT for login (read usernames and password hashes for verification)
-- Note: This is needed for login to work with anon key
CREATE POLICY "Allow public read for login" ON users
    FOR SELECT
    USING (true);

-- Service role can do everything
CREATE POLICY "Service role can access all users" ON users
    FOR ALL
    USING (auth.role() = 'service_role');

-- Admins table - keep restricted to service_role only
-- (Admins require service_role key for access)
CREATE POLICY "Service role can access all admins" ON admins
    FOR ALL
    USING (auth.role() = 'service_role');
