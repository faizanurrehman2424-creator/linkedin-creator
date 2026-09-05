-- Enable uuid-ossp extension for gen_random_uuid() if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. `profiles` Table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'creator' CHECK (role IN ('creator', 'admin')),
  can_generate_ideas BOOLEAN DEFAULT true,
  can_generate_images BOOLEAN DEFAULT true,
  can_generate_videos BOOLEAN DEFAULT true,
  full_name TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
  headline TEXT,
  target_audience TEXT,
  core_pillars TEXT[],
  tone_of_voice TEXT,
  sample_posts TEXT[],
  linkedin_connected BOOLEAN DEFAULT false,
  linkedin_access_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to prevent RLS recursion when checking admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Policies for profiles
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can update all profiles" 
ON profiles FOR UPDATE 
USING (public.is_admin());

-- 2. `content_ideas` Table
CREATE TABLE content_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_date DATE NOT NULL,
  pillar TEXT NOT NULL CHECK (pillar IN ('industry_trends', 'recruiter_storytelling', 'educational_frameworks')),
  hook_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_hook_index INT DEFAULT 0,
  headline TEXT NOT NULL,
  caption_body TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'fresh' CHECK (status IN ('fresh', 'liked', 'scheduled', 'published', 'trashed')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  media_type TEXT DEFAULT 'none' CHECK (media_type IN ('none', 'image', 'video')),
  media_url TEXT,
  media_source TEXT DEFAULT 'none' CHECK (media_source IN ('none', 'ai_generated', 'user_uploaded')),
  trashed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ideas" 
ON content_ideas FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ideas" 
ON content_ideas FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. `idea_step_history` Table
CREATE TABLE idea_step_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES content_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE idea_step_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own step history" 
ON idea_step_history FOR ALL 
USING (auth.uid() = user_id);

-- 4. `password_reset_requests` Table
CREATE TABLE password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all password requests" 
ON password_reset_requests FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Note: The insert into this table will be done using the Service Role key since unauthenticated users create requests.
CREATE POLICY "Unauthenticated users can insert requests" 
ON password_reset_requests FOR INSERT 
WITH CHECK (true);

-- 5. `platform_audit_logs` Table
CREATE TABLE platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" 
ON platform_audit_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Service role will insert into audit logs

-- Functions and Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_ideas_updated_at
    BEFORE UPDATE ON content_ideas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
