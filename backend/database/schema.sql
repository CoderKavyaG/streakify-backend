-- =====================================================
-- STREAKIFY DATABASE SETUP
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. USERS TABLE (if not already created)
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  github_id TEXT,
  github_username TEXT,
  avatar_url TEXT,
  email TEXT,
  telegram_chat_id TEXT,
  github_access_token TEXT,
  check_time TIME DEFAULT '18:00',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CONTRIBUTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- =====================================================
-- 3. NOTIFICATIONS LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'telegram')),
  date DATE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TELEGRAM LINK CODES TABLE (for linking accounts)
-- =====================================================

CREATE TABLE IF NOT EXISTS telegram_link_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. FUNCTION: Handle new user signup
-- This function creates a user record when someone signs up via GitHub OAuth
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    github_id,
    github_username,
    avatar_url,
    email,
    github_access_token,
    check_time,
    timezone,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    -- Get GitHub access token from identity
    (
      SELECT access_token 
      FROM auth.identities 
      WHERE user_id = NEW.id 
      AND provider = 'github' 
      LIMIT 1
    ),
    '18:00',
    'Asia/Kolkata',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    github_username = EXCLUDED.github_username,
    avatar_url = EXCLUDED.avatar_url,
    email = EXCLUDED.email,
    github_access_token = COALESCE(EXCLUDED.github_access_token, users.github_access_token),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. TRIGGER: Run handle_new_user on signup
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 7. FUNCTION: Update user on login (refresh GitHub token)
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET
    github_access_token = (
      SELECT access_token 
      FROM auth.identities 
      WHERE user_id = NEW.id 
      AND provider = 'github' 
      LIMIT 1
    ),
    avatar_url = NEW.raw_user_meta_data->>'avatar_url',
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. TRIGGER: Run handle_user_login on update (login refreshes the row)
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.handle_user_login();

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Contributions policies
CREATE POLICY "Users can view own contributions" ON contributions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contributions" ON contributions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications log policies
CREATE POLICY "Users can view own notifications" ON notifications_log
  FOR SELECT USING (auth.uid() = user_id);

-- Link codes policies
CREATE POLICY "Users can manage own link codes" ON telegram_link_codes
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 10. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_github_username ON users(github_username);
CREATE INDEX IF NOT EXISTS idx_users_check_time ON users(check_time);
CREATE INDEX IF NOT EXISTS idx_contributions_user_date ON contributions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_date ON notifications_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_telegram_codes_code ON telegram_link_codes(code);
CREATE INDEX IF NOT EXISTS idx_telegram_codes_expires ON telegram_link_codes(expires_at);

-- =====================================================
-- 11. SERVICE ROLE ACCESS (for backend operations)
-- =====================================================

-- Allow service role to bypass RLS (for cron jobs, backend operations)
-- This is done automatically when using supabaseAdmin (service role key)

-- =====================================================
-- DONE! Your database is now configured.
-- =====================================================
