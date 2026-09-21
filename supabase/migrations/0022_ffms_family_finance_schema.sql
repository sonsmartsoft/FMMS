-- ==============================================================================
-- FFMS: FAMILY FINANCE & MOBILITY SYSTEM
-- Migration 0022: Family Wealth, Wallets, Transactions, Budgets & Loans
-- Mở rộng hệ thống quản lý tài chính gia đình toàn diện & liên kết xe
-- ==============================================================================

-- 1. BẢNG VÍ & TÀI KHOẢN THANH TOÁN (WALLETS & CREDIT CARDS)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- 'Tiền mặt', 'Vietcombank', 'Techcombank Visa', 'Ví MoMo', 'Sổ tiết kiệm'...
    wallet_type TEXT NOT NULL CHECK (wallet_type IN ('CASH', 'BANK', 'CREDIT_CARD', 'E_WALLET', 'SAVINGS', 'INVESTMENT')),
    account_number TEXT,
    bank_name TEXT,
    initial_balance NUMERIC(15,2) DEFAULT 0,
    current_balance NUMERIC(15,2) DEFAULT 0,
    currency TEXT DEFAULT 'VND',
    credit_limit NUMERIC(15,2) DEFAULT 0, -- Hạn mức tín dụng
    statement_day INTEGER CHECK (statement_day BETWEEN 1 AND 31), -- Ngày chốt sao kê
    payment_due_day INTEGER CHECK (payment_due_day BETWEEN 1 AND 31), -- Ngày đến hạn thanh toán
    color TEXT DEFAULT '#38bdf8',
    icon TEXT DEFAULT 'Wallet',
    is_excluded_from_total BOOLEAN DEFAULT FALSE, -- Có tính vào tổng tài sản ròng không
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG DANH MỤC THU CHI ĐA TẦNG (CATEGORIES & 6 JARS / 50-30-20)
CREATE TABLE IF NOT EXISTS public.transaction_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- 'Ăn uống', 'Nhà cửa', 'Con cái', 'Phương tiện xe cộ'...
    type TEXT NOT NULL CHECK (type IN ('EXPENSE', 'INCOME', 'TRANSFER')),
    parent_id UUID REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
    color TEXT DEFAULT '#38bdf8',
    icon TEXT DEFAULT 'ShoppingBag',
    budget_bucket TEXT CHECK (budget_bucket IN ('NECESSITY', 'SAVINGS', 'EDUCATION', 'PLAY', 'INVESTMENT', 'GIVE')), -- 6 Chiếc Hũ
    is_essential BOOLEAN DEFAULT TRUE, -- 50/30/20: TRUE = Thiết yếu (50%), FALSE = Hưởng thụ (30%)
    is_system BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG GIAO DỊCH TÀI CHÍNH GIA ĐÌNH (FAMILY TRANSACTIONS)
CREATE TABLE IF NOT EXISTS public.family_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
    to_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL, -- Khi transaction_type = 'TRANSFER'
    category_id UUID REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL, -- LIÊN KẾT XE: Nếu là chi phí xe thì link vào đây!
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('EXPENSE', 'INCOME', 'TRANSFER')),
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME DEFAULT CURRENT_TIME,
    payee_vendor TEXT, -- Tên cửa hàng / Nơi chi / Người gửi
    description TEXT,
    notes TEXT,
    bill_image_url TEXT, -- Hóa đơn chụp OCR
    is_essential BOOLEAN DEFAULT TRUE,
    exclude_from_reports BOOLEAN DEFAULT FALSE,
    created_by TEXT DEFAULT 'ADMIN', -- usr-1, usr-2 hoặc tên người ghi
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG KẾ HOẠCH NGÂN SÁCH THÁNG (FAMILY BUDGETS & LIMITS)
CREATE TABLE IF NOT EXISTS public.family_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.transaction_categories(id) ON DELETE CASCADE,
    bucket_type TEXT CHECK (bucket_type IN ('NECESSITY', 'SAVINGS', 'EDUCATION', 'PLAY', 'INVESTMENT', 'GIVE', '50_NEEDS', '30_WANTS', '20_SAVINGS')),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2020),
    budget_amount NUMERIC(15,2) NOT NULL CHECK (budget_amount >= 0),
    alert_threshold_percent NUMERIC(5,2) DEFAULT 80.0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, month, year)
);

-- 5. BẢNG QUẢN LÝ KHOẢN VAY & TÍN DỤNG CHUYÊN SÂU (FAMILY LOANS & DEBTS)
CREATE TABLE IF NOT EXISTS public.family_loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL, -- 'Vay mua xe Mazda 2', 'Vay mua nhà', 'Vay kinh doanh', 'Cho anh B vay'...
    loan_type TEXT NOT NULL CHECK (loan_type IN ('BORROW', 'LEND')), -- BORROW: Đi vay, LEND: Cho vay
    category TEXT DEFAULT 'BANK_MORTGAGE' CHECK (category IN ('BANK_MORTGAGE', 'BANK_CONSUMER', 'CAR_LOAN', 'PERSONAL', 'CREDIT_INSTALLMENT', 'OTHER')),
    lender_borrower_name TEXT NOT NULL, -- Tên ngân hàng hoặc người vay/cho vay (Techcombank, VPBank, Anh Tuấn...)
    principal_amount NUMERIC(15,2) NOT NULL CHECK (principal_amount > 0),
    remaining_balance NUMERIC(15,2) NOT NULL,
    interest_rate_percent NUMERIC(5,2) DEFAULT 0, -- Lãi suất %/năm
    term_months INTEGER, -- Thời gian vay (tháng)
    start_date DATE NOT NULL,
    end_date DATE,
    payment_day INTEGER DEFAULT 15 CHECK (payment_day BETWEEN 1 AND 31),
    monthly_payment NUMERIC(15,2) DEFAULT 0, -- Tiền trả góp ước tính hàng tháng
    linked_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL, -- Ví dùng để thanh toán định kỳ
    linked_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL, -- Liên kết với xe nếu là vay mua xe
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAID_OFF', 'DEFAULTED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BẢNG LỊCH TRẢ GÓP CHI TIẾT (LOAN SCHEDULE REPAYMENTS)
CREATE TABLE IF NOT EXISTS public.family_loan_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES public.family_loans(id) ON DELETE CASCADE,
    period_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    principal_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    interest_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15,2) NOT NULL,
    paid_date DATE,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. TRIGGER TỰ ĐỘNG CẬP NHẬT SỐ DƯ VÍ KHI CÓ GIAO DỊCH (AUTO UPDATE WALLET BALANCE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_wallet_balance_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Xử lý khi thêm mới giao dịch
    IF (TG_OP = 'INSERT') THEN
        IF NEW.transaction_type = 'EXPENSE' THEN
            UPDATE public.wallets
            SET current_balance = current_balance - NEW.amount, updated_at = NOW()
            WHERE id = NEW.wallet_id;
        ELSIF NEW.transaction_type = 'INCOME' THEN
            UPDATE public.wallets
            SET current_balance = current_balance + NEW.amount, updated_at = NOW()
            WHERE id = NEW.wallet_id;
        ELSIF NEW.transaction_type = 'TRANSFER' THEN
            -- Trừ ví nguồn
            UPDATE public.wallets
            SET current_balance = current_balance - NEW.amount, updated_at = NOW()
            WHERE id = NEW.wallet_id;
            -- Cộng ví đích nếu có
            IF NEW.to_wallet_id IS NOT NULL THEN
                UPDATE public.wallets
                SET current_balance = current_balance + NEW.amount, updated_at = NOW()
                WHERE id = NEW.to_wallet_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- Xử lý khi xóa giao dịch (hoàn lại tiền)
    IF (TG_OP = 'DELETE') THEN
        IF OLD.transaction_type = 'EXPENSE' THEN
            UPDATE public.wallets
            SET current_balance = current_balance + OLD.amount, updated_at = NOW()
            WHERE id = OLD.wallet_id;
        ELSIF OLD.transaction_type = 'INCOME' THEN
            UPDATE public.wallets
            SET current_balance = current_balance - OLD.amount, updated_at = NOW()
            WHERE id = OLD.wallet_id;
        ELSIF OLD.transaction_type = 'TRANSFER' THEN
            UPDATE public.wallets
            SET current_balance = current_balance + OLD.amount, updated_at = NOW()
            WHERE id = OLD.wallet_id;
            IF OLD.to_wallet_id IS NOT NULL THEN
                UPDATE public.wallets
                SET current_balance = current_balance - OLD.amount, updated_at = NOW()
                WHERE id = OLD.to_wallet_id;
            END IF;
        END IF;
        RETURN OLD;
    END IF;

    -- Xử lý khi sửa giao dịch (cân bằng chênh lệch)
    IF (TG_OP = 'UPDATE') THEN
        -- Hoàn tác giao dịch cũ
        IF OLD.transaction_type = 'EXPENSE' THEN
            UPDATE public.wallets SET current_balance = current_balance + OLD.amount WHERE id = OLD.wallet_id;
        ELSIF OLD.transaction_type = 'INCOME' THEN
            UPDATE public.wallets SET current_balance = current_balance - OLD.amount WHERE id = OLD.wallet_id;
        ELSIF OLD.transaction_type = 'TRANSFER' THEN
            UPDATE public.wallets SET current_balance = current_balance + OLD.amount WHERE id = OLD.wallet_id;
            IF OLD.to_wallet_id IS NOT NULL THEN
                UPDATE public.wallets SET current_balance = current_balance - OLD.amount WHERE id = OLD.to_wallet_id;
            END IF;
        END IF;
        -- Áp dụng giao dịch mới
        IF NEW.transaction_type = 'EXPENSE' THEN
            UPDATE public.wallets SET current_balance = current_balance - NEW.amount WHERE id = NEW.wallet_id;
        ELSIF NEW.transaction_type = 'INCOME' THEN
            UPDATE public.wallets SET current_balance = current_balance + NEW.amount WHERE id = NEW.wallet_id;
        ELSIF NEW.transaction_type = 'TRANSFER' THEN
            UPDATE public.wallets SET current_balance = current_balance - NEW.amount WHERE id = NEW.wallet_id;
            IF NEW.to_wallet_id IS NOT NULL THEN
                UPDATE public.wallets SET current_balance = current_balance + NEW.amount WHERE id = NEW.to_wallet_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_wallet_balance ON public.family_transactions;
CREATE TRIGGER trigger_sync_wallet_balance
AFTER INSERT OR UPDATE OR DELETE ON public.family_transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_wallet_balance_from_transaction();

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES CHO BỘ BẢNG MỚI
-- ------------------------------------------------------------------------------
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_loan_schedules ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Wallets
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallets' AND policyname = 'Allow all access to wallets') THEN
        CREATE POLICY "Allow all access to wallets" ON public.wallets FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
    -- Categories
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transaction_categories' AND policyname = 'Allow all access to transaction_categories') THEN
        CREATE POLICY "Allow all access to transaction_categories" ON public.transaction_categories FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
    -- Family Transactions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'family_transactions' AND policyname = 'Allow all access to family_transactions') THEN
        CREATE POLICY "Allow all access to family_transactions" ON public.family_transactions FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
    -- Budgets
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'family_budgets' AND policyname = 'Allow all access to family_budgets') THEN
        CREATE POLICY "Allow all access to family_budgets" ON public.family_budgets FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
    -- Loans
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'family_loans' AND policyname = 'Allow all access to family_loans') THEN
        CREATE POLICY "Allow all access to family_loans" ON public.family_loans FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
    -- Loan Schedules
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'family_loan_schedules' AND policyname = 'Allow all access to family_loan_schedules') THEN
        CREATE POLICY "Allow all access to family_loan_schedules" ON public.family_loan_schedules FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 9. SEED DỮ LIỆU DANH MỤC THU CHI & VÍ MẶC ĐỊNH
-- ------------------------------------------------------------------------------
-- A. Các Ví Mặc Định
INSERT INTO public.wallets (id, name, wallet_type, bank_name, initial_balance, current_balance, color, icon)
VALUES 
    ('w-cash-01', 'Tiền mặt gia đình', 'CASH', NULL, 15000000, 15000000, '#10b981', 'Banknote'),
    ('w-tcb-01', 'Techcombank Chi tiêu chính', 'BANK', 'Techcombank', 38500000, 38500000, '#ef4444', 'Building2'),
    ('w-vcb-01', 'Vietcombank Lương & Tích lũy', 'BANK', 'Vietcombank', 85000000, 85000000, '#059669', 'CreditCard'),
    ('w-tcb-credit', 'Techcombank Visa Signature', 'CREDIT_CARD', 'Techcombank', 0, 0, '#6366f1', 'CreditCard'),
    ('w-momo-01', 'Ví MoMo', 'E_WALLET', 'MoMo', 2500000, 2500000, '#ec4899', 'Smartphone'),
    ('w-savings-01', 'Sổ tiết kiệm dự phòng', 'SAVINGS', 'Techcombank', 150000000, 150000000, '#38bdf8', 'PiggyBank')
ON CONFLICT (id) DO NOTHING;

-- Cập nhật thông số thẻ tín dụng
UPDATE public.wallets 
SET credit_limit = 100000000, statement_day = 20, payment_due_day = 5 
WHERE id = 'w-tcb-credit';

-- B. Cây Danh Mục Thu Chi Chuẩn Gia Đình (Hỗ Trợ 6 Chiếc Hũ & 50/30/20)
-- 1. Ăn uống & Thực phẩm (NECESSITY - 50% Needs)
INSERT INTO public.transaction_categories (id, name, type, color, icon, budget_bucket, is_essential, display_order)
VALUES ('cat-food', 'Ăn uống & Đi chợ', 'EXPENSE', '#f59e0b', 'Utensils', 'NECESSITY', true, 1) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transaction_categories (id, name, type, parent_id, color, icon, budget_bucket, is_essential, display_order)
VALUES 
    ('cat-food-groceries', 'Đi chợ & Siêu thị', 'EXPENSE', 'cat-food', '#f59e0b', 'ShoppingBag', 'NECESSITY', true, 2),
    ('cat-food-dining', 'Ăn ngoài hàng & Cafe', 'EXPENSE', 'cat-food', '#fbbf24', 'Coffee', 'PLAY', false, 3)
ON CONFLICT (id) DO NOTHING;

-- 2. Nhà cửa & Tiện ích (NECESSITY - 50% Needs)
INSERT INTO public.transaction_categories (id, name, type, color, icon, budget_bucket, is_essential, display_order)
VALUES ('cat-home', 'Nhà cửa & Tiện ích', 'EXPENSE', '#3b82f6', 'Home', 'NECESSITY', true, 4) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transaction_categories (id, name, type, parent_id, color, icon, budget_bucket, is_essential, display_order)
VALUES 
    ('cat-home-bills', 'Điện, Nước, Internet, Rác', 'EXPENSE', 'cat-home', '#38bdf8', 'Zap', 'NECESSITY', true, 5),
    ('cat-home-furnishing', 'Đồ gia dụng & Sửa chữa nhà', 'EXPENSE', 'cat-home', '#60a5fa', 'Hammer', 'NECESSITY', true, 6)
ON CONFLICT (id) DO NOTHING;

-- 3. Phương tiện & Xe cộ (KẾT NỐI TRỰC TIẾP VỚI MODULE FMMS)
INSERT INTO public.transaction_categories (id, name, type, color, icon, budget_bucket, is_essential, display_order)
VALUES ('cat-mobility', 'Phương tiện & Đi lại (Xe)', 'EXPENSE', '#06b6d4', 'Car', 'NECESSITY', true, 7) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transaction_categories (id, name, type, parent_id, color, icon, budget_bucket, is_essential, display_order)
VALUES 
    ('cat-mob-fuel', 'Xăng xe & Nhiên liệu', 'EXPENSE', 'cat-mobility', '#06b6d4', 'Fuel', 'NECESSITY', true, 8),
    ('cat-mob-maint', 'Bảo dưỡng & Sửa chữa xe', 'EXPENSE', 'cat-mobility', '#0ea5e9', 'Wrench', 'NECESSITY', true, 9),
    ('cat-mob-toll', 'Phí cầu đường VETC & Gửi xe', 'EXPENSE', 'cat-mobility', '#38bdf8', 'CreditCard', 'NECESSITY', true, 10),
    ('cat-mob-insurance', 'Bảo hiểm xe & Đăng kiểm', 'EXPENSE', 'cat-mobility', '#67e8f9', 'Shield', 'NECESSITY', true, 11),
    ('cat-mob-wash', 'Rửa xe & Phụ kiện xe', 'EXPENSE', 'cat-mobility', '#a5f3fc', 'Sparkles', 'PLAY', false, 12)
ON CONFLICT (id) DO NOTHING;

-- 4. Con cái & Giáo dục (EDUCATION - 6 Hũ)
INSERT INTO public.transaction_categories (id, name, type, color, icon, budget_bucket, is_essential, display_order)
VALUES ('cat-education', 'Con cái & Giáo dục', 'EXPENSE', '#8b5cf6', 'GraduationCap', 'EDUCATION', true, 13) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transaction_categories (id, name, type, parent_id, color, icon, budget_bucket, is_essential, display_order)
VALUES 
    ('cat-edu-tuition', 'Học phí trường & Học thêm', 'EXPENSE', 'cat-education', '#a78bfa', 'BookOpen', 'EDUCATION', true, 14),
    ('cat-edu-kids', 'Sữa, Bỉm, Đồ chơi & Tiêu vặt', 'EXPENSE', 'cat-education', '#c4b5fd', 'Baby', 'NECESSITY', true, 15)
ON CONFLICT (id) DO NOTHING;

-- 5. Sức khỏe & Y tế (NECESSITY - 50% Needs)
INSERT INTO public.transaction_categories (id, name, type, color, icon, budget_bucket, is_essential, display_order)
VALUES ('cat-health', 'Sức khỏe & Y tế', 'EXPENSE', '#10b981', 'HeartPulse', 'NECESSITY', true, 16) ON CONFLICT (id) DO NOTHING;

-- 6. Hưởng thụ, Mua sắm & Du lịch (PLAY - 30% Wants)
INSERT INTO public.transaction_categories (id, name, type, color, icon, budget_bucket, is_essential, display_order)
VALUES ('cat-play', 'Hưởng thụ & Du lịch', 'EXPENSE', '#ec4899', 'Plane', 'PLAY', false, 17) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transaction_categories (id, name, type, parent_id, color, icon, budget_bucket, is_essential, display_order)
VALUES 
    ('cat-play-travel', 'Nghỉ dưỡng & Du lịch gia đình', 'EXPENSE', 'cat-play', '#f472b6', 'Palmtree', 'PLAY', false, 18),
    ('cat-play-shopping', 'Quần áo & Mua sắm cá nhân', 'EXPENSE', 'cat-play', '#fb7185', 'ShoppingBag', 'PLAY', false, 19)
ON CONFLICT (id) DO NOTHING;

-- 7. Trả nợ & Trả góp (LOANS / DEBT SERVICE)
INSERT INTO public.transaction_categories (id, name, type, color, icon, budget_bucket, is_essential, display_order)
VALUES ('cat-debt', 'Trả góp & Trả nợ ngân hàng', 'EXPENSE', '#e11d48', 'BadgePercent', 'NECESSITY', true, 20) ON CONFLICT (id) DO NOTHING;

-- 8. THU NHẬP (INCOME)
INSERT INTO public.transaction_categories (id, name, type, color, icon, budget_bucket, is_essential, display_order)
VALUES 
    ('cat-inc-salary', 'Lương cố định hàng tháng', 'INCOME', '#10b981', 'Coins', 'SAVINGS', true, 21),
    ('cat-inc-bonus', 'Thưởng & Thu nhập phụ', 'INCOME', '#34d399', 'TrendingUp', 'INVESTMENT', false, 22),
    ('cat-inc-business', 'Lợi nhuận kinh doanh / Đầu tư', 'INCOME', '#059669', 'Briefcase', 'INVESTMENT', false, 23)
ON CONFLICT (id) DO NOTHING;

-- 9. Giao dịch chuyển tiền nội bộ (TRANSFER)
INSERT INTO public.transaction_categories (id, name, type, color, icon, budget_bucket, is_essential, display_order)
VALUES ('cat-transfer', 'Chuyển tiền nội bộ giữa các ví', 'TRANSFER', '#64748b', 'ArrowRightLeft', 'SAVINGS', false, 24)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
