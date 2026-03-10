-- Create tables
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    gstin VARCHAR(15) UNIQUE,
    address TEXT,
    phone VARCHAR(20),
    company_type VARCHAR(20) NOT NULL DEFAULT 'SUPPLIER'
);

CREATE TABLE IF NOT EXISTS drugs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    hsn VARCHAR(10),
    batch VARCHAR(50),
    expiry DATE,
    buy_rate FLOAT DEFAULT 0,
    sell_rate FLOAT DEFAULT 0,
    gst_rate FLOAT DEFAULT 18.0
);

CREATE TABLE IF NOT EXISTS stock (
    id SERIAL PRIMARY KEY,
    drug_id INTEGER REFERENCES drugs(id),
    batch VARCHAR(50),
    qty FLOAT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total FLOAT NOT NULL DEFAULT 0,
    items JSONB
);

CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total FLOAT NOT NULL DEFAULT 0,
    items JSONB
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'USER'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_company_type ON companies(company_type);
CREATE INDEX IF NOT EXISTS idx_drug_name ON drugs(name);
CREATE INDEX IF NOT EXISTS idx_stock_drug ON stock(drug_id);
CREATE INDEX IF NOT EXISTS idx_purchase_date ON purchases(date);
CREATE INDEX IF NOT EXISTS idx_sale_date ON sales(date);

-- Enable Row Level Security (optional)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
