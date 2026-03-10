-- ========================================
-- COMPLETE RLS POLICIES FOR PHARMAPOS
-- Run this AFTER running schema.sql
-- ========================================

-- Drop any existing policies first
DROP POLICY IF EXISTS "Service role can access all users" ON users;
DROP POLICY IF EXISTS "Service role can access all admins" ON admins;
DROP POLICY IF EXISTS "Allow public signup" ON users;
DROP POLICY IF EXISTS "Allow public read for login" ON users;
DROP POLICY IF EXISTS "Service role can access all companies" ON companies;
DROP POLICY IF EXISTS "Allow public access companies" ON companies;
DROP POLICY IF EXISTS "Service role can access all products" ON products;
DROP POLICY IF EXISTS "Allow public access products" ON products;
DROP POLICY IF EXISTS "Service role can access all stock" ON stock;
DROP POLICY IF EXISTS "Allow public access stock" ON stock;
DROP POLICY IF EXISTS "Service role can access all purchases" ON purchases;
DROP POLICY IF EXISTS "Allow public access purchases" ON purchases;
DROP POLICY IF EXISTS "Service role can access all sales" ON sales;
DROP POLICY IF EXISTS "Allow public access sales" ON sales;

-- ========================================
-- USERS TABLE POLICIES
-- ========================================

-- Allow public signup
CREATE POLICY "Allow public signup" ON users
    FOR INSERT
    WITH CHECK (true);

-- Allow public read for login verification
CREATE POLICY "Allow public read for login" ON users
    FOR SELECT
    USING (true);

-- Service role can do everything
CREATE POLICY "Service role can access all users" ON users
    FOR ALL
    USING (auth.role() = 'service_role');

-- ========================================
-- ADMINS TABLE POLICIES
-- ========================================

-- Admins restricted to service_role only
CREATE POLICY "Service role can access all admins" ON admins
    FOR ALL
    USING (auth.role() = 'service_role');

-- ========================================
-- COMPANIES TABLE POLICIES
-- ========================================

-- Service role full access
CREATE POLICY "Service role can access all companies" ON companies
    FOR ALL
    USING (auth.role() = 'service_role');

-- Public access (for API calls)
CREATE POLICY "Allow public access companies" ON companies
    FOR ALL
    USING (true);

-- ========================================
-- PRODUCTS TABLE POLICIES
-- ========================================

CREATE POLICY "Service role can access all products" ON products
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Allow public access products" ON products
    FOR ALL
    USING (true);

-- ========================================
-- STOCK TABLE POLICIES
-- ========================================

CREATE POLICY "Service role can access all stock" ON stock
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Allow public access stock" ON stock
    FOR ALL
    USING (true);

-- ========================================
-- PURCHASES TABLE POLICIES
-- ========================================

CREATE POLICY "Service role can access all purchases" ON purchases
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Allow public access purchases" ON purchases
    FOR ALL
    USING (true);

-- ========================================
-- SALES TABLE POLICIES
-- ========================================

CREATE POLICY "Service role can access all sales" ON sales
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Allow public access sales" ON sales
    FOR ALL
    USING (true);

-- ========================================
-- VERIFY POLICIES CREATED
-- ========================================
-- After running, check Table Editor to verify tables are accessible
