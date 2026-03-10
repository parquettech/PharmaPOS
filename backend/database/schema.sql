-- PharmaPOS Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Admins table (separate table for administrators)
CREATE TABLE IF NOT EXISTS admins (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Users table (regular users only)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Enable Row Level Security (RLS)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies for admins table
CREATE POLICY "Service role can access all admins" ON admins
    FOR ALL
    USING (auth.role() = 'service_role');

-- Policies for users table
CREATE POLICY "Service role can access all users" ON users
    FOR ALL
    USING (auth.role() = 'service_role');

-- No default admin user - all admins must signup with username ending @admin

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    type VARCHAR(50) NOT NULL,
    dl_no VARCHAR(100),
    email VARCHAR(255),
    state_code VARCHAR(2),
    place_of_supply VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for companies table
CREATE INDEX IF NOT EXISTS idx_companies_gstin ON companies(gstin);
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(type);

-- Enable Row Level Security for companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Policy for companies table - allow service role full access
CREATE POLICY "Service role can access all companies" ON companies
    FOR ALL
    USING (auth.role() = 'service_role');

-- Stock table
CREATE TABLE IF NOT EXISTS stock (
    id BIGSERIAL PRIMARY KEY,
    s_no INTEGER NOT NULL,
    description TEXT NOT NULL,
    hsn_sac VARCHAR(50),
    batch_no VARCHAR(100),
    exp_date VARCHAR(10),
    qty DECIMAL(10, 2) DEFAULT 0,
    free DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(5, 2) DEFAULT 0,
    mrp DECIMAL(10, 2) DEFAULT 0,
    rate DECIMAL(10, 2) DEFAULT 0,
    cgst_igst DECIMAL(5, 2) DEFAULT 0,
    sgst DECIMAL(5, 2) DEFAULT 0,
    amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for stock table
CREATE INDEX IF NOT EXISTS idx_stock_s_no ON stock(s_no);
CREATE INDEX IF NOT EXISTS idx_stock_description ON stock(description);

-- Enable Row Level Security for stock table
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

-- Policy for stock table - allow service role full access
CREATE POLICY "Service role can access all stock" ON stock
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_updated_at BEFORE UPDATE ON stock
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Products master table (for batch-based lookup and auto-fill)
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    batch_no VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    hsn_sac VARCHAR(50),
    expiry DATE,
    mrp DECIMAL(10, 2) DEFAULT 0,
    default_rate DECIMAL(10, 2) DEFAULT 0,
    default_disc_percent DECIMAL(5, 2) DEFAULT 0,
    default_gst_percent DECIMAL(5, 2) DEFAULT 0,
    packing VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for products table
CREATE INDEX IF NOT EXISTS idx_products_batch_no ON products(batch_no);
CREATE INDEX IF NOT EXISTS idx_products_description ON products(description);

-- Enable Row Level Security for products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy for products table
CREATE POLICY "Service role can access all products" ON products
    FOR ALL
    USING (auth.role() = 'service_role');

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT REFERENCES companies(id),
    middleman_id BIGINT REFERENCES companies(id),
    invoice_no VARCHAR(100),
    bill_no VARCHAR(100),
    purchase_date DATE NOT NULL,
    order_date DATE,
    order_no VARCHAR(100),
    terms VARCHAR(50) DEFAULT 'CASH/CREDIT',
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    gross_amount DECIMAL(10, 2) DEFAULT 0,
    cgst_amount DECIMAL(10, 2) DEFAULT 0,
    sgst_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    rounded_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase items table
CREATE TABLE IF NOT EXISTS purchase_items (
    id BIGSERIAL PRIMARY KEY,
    purchase_id BIGINT REFERENCES purchases(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    hsn VARCHAR(50),
    batch VARCHAR(100),
    expiry DATE,
    qty DECIMAL(10, 2) DEFAULT 0,
    free DECIMAL(10, 2) DEFAULT 0,
    disc_percent DECIMAL(5, 2) DEFAULT 0,
    mrp DECIMAL(10, 2) DEFAULT 0,
    price DECIMAL(10, 2) DEFAULT 0,
    gst_percent DECIMAL(5, 2) DEFAULT 0,
    cgst_amount DECIMAL(10, 2) DEFAULT 0,
    sgst_amount DECIMAL(10, 2) DEFAULT 0,
    amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
    id BIGSERIAL PRIMARY KEY,
    middleman_id BIGINT REFERENCES companies(id),
    third_party_id BIGINT REFERENCES companies(id),
    invoice_no VARCHAR(100),
    bill_no VARCHAR(100),
    sale_date DATE NOT NULL,
    order_date DATE,
    order_no VARCHAR(100),
    terms VARCHAR(50) DEFAULT 'CASH/CREDIT',
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    gross_amount DECIMAL(10, 2) DEFAULT 0,
    cgst_amount DECIMAL(10, 2) DEFAULT 0,
    sgst_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    rounded_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales items table
CREATE TABLE IF NOT EXISTS sales_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT REFERENCES sales(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    hsn VARCHAR(50),
    batch VARCHAR(100),
    expiry DATE,
    qty DECIMAL(10, 2) DEFAULT 0,
    free DECIMAL(10, 2) DEFAULT 0,
    disc_percent DECIMAL(5, 2) DEFAULT 0,
    mrp DECIMAL(10, 2) DEFAULT 0,
    price DECIMAL(10, 2) DEFAULT 0,
    gst_percent DECIMAL(5, 2) DEFAULT 0,
    cgst_amount DECIMAL(10, 2) DEFAULT 0,
    sgst_amount DECIMAL(10, 2) DEFAULT 0,
    amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for purchases and sales tables
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_sales_middleman_id ON sales(middleman_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id ON sales_items(sale_id);

-- Enable Row Level Security for purchases and sales tables
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;

-- Policies for purchases and sales tables
CREATE POLICY "Service role can access all purchases" ON purchases
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all purchase_items" ON purchase_items
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all sales" ON sales
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all sales_items" ON sales_items
    FOR ALL
    USING (auth.role() = 'service_role');

-- Add triggers for updated_at
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
