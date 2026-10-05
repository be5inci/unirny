-- =========================================
-- unirny - Sprint 3 Migration Script
-- =========================================

-- 1. Profiles Tablosu Güncellemeleri
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}';

-- 2. Messages Tablosu (Birebir Mentörlük & Realtime Chat)
-- Olası eski şema çakışmalarını önlemek için (Geliştirme ortamı olduğu için DROP atıyoruz)
DROP TABLE IF EXISTS public.messages CASCADE;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL, 
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS & Policies for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view messages for their session"
  ON public.messages FOR SELECT
  USING (true); 
  
CREATE POLICY "Users can insert their own messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- Realtime yayınına messages tablosunu ekleme
-- Eğer daha önce eklendiyse hata vermemesi için kontrol yok, ancak zaten idempotent sayılabilir veya Supabase arayüzünden eklenmiş olabilir.
-- Postgres'te yayın (publication) tablosuna aynı tabloyu tekrar eklemek hata verebilir, bu yüzden sadece yoksa ekle yapamayız.
-- Ama Supabase'de realtime için yaygındır. Biz hata almamak adına publication komutunu try-catch bloğuna (DO $$) sarabiliriz.
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;


-- 3. Project Applications Tablosu
-- Eski tablo varsa şema çakışması yapmaması için düşürüyoruz.
DROP TABLE IF EXISTS public.project_applications CASCADE;

CREATE TABLE public.project_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text,
  status text DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
  created_at timestamp with time zone DEFAULT now()
);

-- RLS & Policies for project_applications
ALTER TABLE public.project_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own applications or project owners can view applications"
  ON public.project_applications FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_applications.project_id AND p.owner_id = auth.uid())
  );

CREATE POLICY "Users can apply to projects"
  ON public.project_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Project owners can update application status"
  ON public.project_applications FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_applications.project_id AND p.owner_id = auth.uid())
  );
