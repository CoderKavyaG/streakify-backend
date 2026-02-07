-- Run this in Supabase SQL Editor to fix missing columns

-- 1. Add missing columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS github_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS check_time TIME DEFAULT '18:00';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS github_access_token TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS github_username TEXT;

-- 2. Add missing columns to other tables (just in case)
-- (None obvious from the error, but good to check schema.sql)

-- 3. Re-create indexes if missing
CREATE INDEX IF NOT EXISTS idx_users_github_username ON users(github_username);
CREATE INDEX IF NOT EXISTS idx_users_check_time ON users(check_time);

-- 4. Verify Row Level Security is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
