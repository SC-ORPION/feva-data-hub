-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Wallets Table
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions Table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  network VARCHAR(50) NOT NULL,
  data_size INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  external_ref VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pricing Table
CREATE TABLE pricing (
  id INTEGER PRIMARY KEY DEFAULT 1,
  prices JSONB DEFAULT '[{"size": 1, "price": 2.5}, {"size": 2, "price": 4.5}, {"size": 5, "price": 10.0}, {"size": 10, "price": 18.0}]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Broadcasts Table
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  sent_by UUID REFERENCES users(id),
  sent_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance(p_user_id UUID, p_amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE wallets SET balance = balance + p_amount WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Users
CREATE POLICY users_own_data
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY users_update_own_data
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for Wallets
CREATE POLICY wallets_own_data
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY wallets_update_own
  ON wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for Transactions
CREATE POLICY transactions_own_data
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY transactions_insert_own
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Broadcasts (read-only for users)
CREATE POLICY broadcasts_read
  ON broadcasts FOR SELECT
  USING (true);

-- Trigger to create wallet when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);

  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
