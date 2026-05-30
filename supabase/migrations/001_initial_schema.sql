-- BountyLens Initial Schema
-- Supabase mirrors GenLayer state but NEVER overrides it.

-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  twitter TEXT,
  github TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- BOUNTIES (cache from GenLayer)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bounties (
  id TEXT PRIMARY KEY,
  poster TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  reward_amount TEXT,
  reward_token TEXT,
  deadline TEXT,
  max_winners INTEGER DEFAULT 1,
  acceptance_criteria TEXT,
  rejection_criteria TEXT,
  required_evidence TEXT,
  pass_threshold INTEGER DEFAULT 70,
  revision_allowed BOOLEAN DEFAULT TRUE,
  revision_notes TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'open',
  funded BOOLEAN DEFAULT FALSE,
  criteria_locked BOOLEAN DEFAULT FALSE,
  criteria_lock_timestamp TEXT,
  criteria_hash TEXT,
  first_submission_id TEXT,
  winners JSONB DEFAULT '[]',
  winner_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bounties_poster ON bounties(poster);
CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);
CREATE INDEX IF NOT EXISTS idx_bounties_category ON bounties(category);
CREATE INDEX IF NOT EXISTS idx_bounties_created ON bounties(created_at DESC);

-- ─────────────────────────────────────────────
-- SUBMISSIONS (cache from GenLayer)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  bounty_id TEXT NOT NULL REFERENCES bounties(id),
  contributor TEXT NOT NULL,
  submission_url TEXT,
  description TEXT,
  evidence_links TEXT,
  is_revision BOOLEAN DEFAULT FALSE,
  original_submission_id TEXT,
  status TEXT DEFAULT 'pending',
  verdict TEXT,
  score INTEGER,
  confidence NUMERIC(4,3),
  duplicate_risk TEXT,
  summary TEXT,
  passed_items JSONB,
  missing_items JSONB,
  improvement_notes JSONB,
  reasoning TEXT,
  payout_decision TEXT,
  payout_approved BOOLEAN DEFAULT FALSE,
  payout_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_submissions_bounty ON submissions(bounty_id);
CREATE INDEX IF NOT EXISTS idx_submissions_contributor ON submissions(contributor);
CREATE INDEX IF NOT EXISTS idx_submissions_verdict ON submissions(verdict);

-- ─────────────────────────────────────────────
-- REVIEWS (full GenLayer AI review cache)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id TEXT UNIQUE NOT NULL REFERENCES submissions(id),
  verdict TEXT,
  score INTEGER,
  confidence NUMERIC(4,3),
  duplicate_risk TEXT,
  summary TEXT,
  passed_items JSONB DEFAULT '[]',
  missing_items JSONB DEFAULT '[]',
  improvement_notes JSONB DEFAULT '[]',
  reasoning TEXT,
  payout_decision TEXT,
  genlayer_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TRANSACTIONS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash TEXT,
  type TEXT NOT NULL,
  from_wallet TEXT NOT NULL,
  bounty_id TEXT,
  submission_id TEXT,
  amount TEXT,
  token TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_from_wallet ON transactions(from_wallet);
CREATE INDEX IF NOT EXISTS idx_tx_bounty ON transactions(bounty_id);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_wallet ON notifications(wallet);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(wallet, read);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, authenticated users manage own
CREATE POLICY "Public profiles are readable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users manage own profile" ON profiles FOR ALL USING (wallet = current_user);

-- Bounties: public readable (open bounties), anon insert for cache sync
CREATE POLICY "Bounties are publicly readable" ON bounties FOR SELECT USING (true);
CREATE POLICY "Service role can write bounties" ON bounties FOR ALL USING (true);

-- Submissions: publicly readable
CREATE POLICY "Submissions are publicly readable" ON submissions FOR SELECT USING (true);
CREATE POLICY "Service role can write submissions" ON submissions FOR ALL USING (true);

-- Reviews: publicly readable
CREATE POLICY "Reviews are publicly readable" ON reviews FOR SELECT USING (true);
CREATE POLICY "Service role can write reviews" ON reviews FOR ALL USING (true);

-- Transactions: users see own
CREATE POLICY "Users see own transactions" ON transactions FOR SELECT USING (from_wallet = current_user);
CREATE POLICY "Service role can write transactions" ON transactions FOR ALL USING (true);

-- Notifications: users see own
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (wallet = current_user);
CREATE POLICY "Service role can write notifications" ON notifications FOR ALL USING (true);
