-- ==============================================================================
-- FMMS: SETUP BẢNG VÍ, THẺ TÍN DỤNG & TÀI CHÍNH GIA ĐÌNH
-- Hướng dẫn: Mở Supabase Dashboard -> SQL Editor -> New Query -> Dán toàn bộ nội dung file này -> Bấm Run
-- ==============================================================================

-- 1. BẢNG VÍ & TÀI KHOẢN THANH TOÁN (WALLETS & CREDIT CARDS)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    wallet_type TEXT NOT NULL CHECK (wallet_type IN ('CASH', 'BANK', 'CREDIT_CARD', 'E_WALLET', 'SAVINGS', 'INVESTMENT')),
    account_number TEXT,
    bank_name TEXT,
    initial_balance NUMERIC(15,2) DEFAULT 0,
    current_balance NUMERIC(15,2) DEFAULT 0,
    currency TEXT DEFAULT 'VND',
    credit_limit NUMERIC(15,2) DEFAULT 0, -- Hạn mức tín dụng
    statement_day INTEGER CHECK (statement_day BETWEEN 1 AND 31), -- Ngày chốt sao kê hàng tháng
    payment_due_day INTEGER CHECK (payment_due_day BETWEEN 1 AND 31), -- Ngày tất toán / hạn trả nợ
    color TEXT DEFAULT '#0284c7',
    icon TEXT DEFAULT 'CreditCard',
    is_excluded_from_total BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG DANH MỤC THU CHI (TRANSACTION CATEGORIES)
CREATE TABLE IF NOT EXISTS public.transaction_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('EXPENSE', 'INCOME', 'TRANSFER')),
    parent_id UUID REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
    color TEXT DEFAULT '#38bdf8',
    icon TEXT DEFAULT 'ShoppingBag',
    budget_bucket TEXT CHECK (budget_bucket IN ('NECESSITY', 'SAVINGS', 'EDUCATION', 'PLAY', 'INVESTMENT', 'GIVE')),
    is_essential BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG GIAO DỊCH TÀI CHÍNH GIA ĐÌNH (FAMILY TRANSACTIONS)
CREATE TABLE IF NOT EXISTS public.family_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    to_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('EXPENSE', 'INCOME', 'TRANSFER')),
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME DEFAULT CURRENT_TIME,
    payee_vendor TEXT,
    description TEXT,
    notes TEXT,
    bill_image_url TEXT,
    is_essential BOOLEAN DEFAULT TRUE,
    exclude_from_reports BOOLEAN DEFAULT FALSE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BẬT ROW LEVEL SECURITY (RLS) VÀ CẤP QUYỀN TOÀN BỘ
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to wallets" ON public.wallets;
CREATE POLICY "Allow all access to wallets" ON public.wallets FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to transaction_categories" ON public.transaction_categories;
CREATE POLICY "Allow all access to transaction_categories" ON public.transaction_categories FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to family_transactions" ON public.family_transactions;
CREATE POLICY "Allow all access to family_transactions" ON public.family_transactions FOR ALL TO public USING (true) WITH CHECK (true);

-- THÊM DỮ LIỆU BAN ĐẦU VÍ & THẺ TÍN DỤNG (NẾU CHƯA CÓ)
INSERT INTO public.wallets (id, name, wallet_type, bank_name, initial_balance, current_balance, credit_limit, statement_day, payment_due_day, color, icon)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Tiền mặt gia đình', 'CASH', NULL, 15400000, 15400000, 0, NULL, NULL, '#10b981', 'Banknote'),
    ('00000000-0000-0000-0000-000000000002', 'Techcombank Chi tiêu', 'BANK', 'Techcombank', 38500000, 38500000, 0, NULL, NULL, '#ef4444', 'Building2'),
    ('00000000-0000-0000-0000-000000000003', 'Vietcombank Lương & Dự phòng', 'BANK', 'Vietcombank', 85200000, 85200000, 0, NULL, NULL, '#059669', 'CreditCard'),
    ('00000000-0000-0000-0000-000000000004', 'Techcombank Visa Signature', 'CREDIT_CARD', 'Techcombank', 0, -4850000, 100000000, 20, 5, '#6366f1', 'CreditCard'),
    ('00000000-0000-0000-0000-000000000005', 'Ví MoMo', 'E_WALLET', 'MoMo', 1250000, 1250000, 0, NULL, NULL, '#ec4899', 'Smartphone'),
    ('00000000-0000-0000-0000-000000000006', 'Sổ tiết kiệm ngân hàng', 'SAVINGS', 'Techcombank', 150000000, 150000000, 0, NULL, NULL, '#38bdf8', 'PiggyBank')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    credit_limit = EXCLUDED.credit_limit,
    statement_day = EXCLUDED.statement_day,
    payment_due_day = EXCLUDED.payment_due_day;
