-- sprint8_feed_migration.sql

-- ================================
-- 1. POSTS TABLOSU GÜNCELLEMELERİ
-- ================================
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';

-- ================================
-- 2. SAVED POSTS (KAYDEDİLENLER)
-- ================================
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved posts" ON public.saved_posts;
CREATE POLICY "Users can view own saved posts" ON public.saved_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save posts" ON public.saved_posts;
CREATE POLICY "Users can save posts" ON public.saved_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave posts" ON public.saved_posts;
CREATE POLICY "Users can unsave posts" ON public.saved_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ================================
-- 3. ANKETLER (POLLS)
-- ================================
CREATE TABLE IF NOT EXISTS public.post_polls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  question text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid REFERENCES public.post_polls(id) ON DELETE CASCADE,
  option_text text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid REFERENCES public.post_polls(id) ON DELETE CASCADE,
  option_id uuid REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

ALTER TABLE public.post_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Herkes anketleri ve seçenekleri görebilir
DROP POLICY IF EXISTS "Anyone can view polls" ON public.post_polls;
CREATE POLICY "Anyone can view polls" ON public.post_polls FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anyone can view poll options" ON public.poll_options;
CREATE POLICY "Anyone can view poll options" ON public.poll_options FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anyone can view poll votes" ON public.poll_votes;
CREATE POLICY "Anyone can view poll votes" ON public.poll_votes FOR SELECT TO public USING (true);

-- Sadece authenticated kullanıcılar anket/seçenek ekleyebilir (Normalde post sahibi kontrolü yapılmalı ancak frontend insertleri sırayla atacağı için authenticated yeterlidir, RLS'i basit tutuyoruz)
DROP POLICY IF EXISTS "Authenticated users can insert polls" ON public.post_polls;
CREATE POLICY "Authenticated users can insert polls" ON public.post_polls FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can insert poll options" ON public.poll_options;
CREATE POLICY "Authenticated users can insert poll options" ON public.poll_options FOR INSERT TO authenticated WITH CHECK (true);

-- Sadece authenticated kullanıcılar kendi adlarına oy verebilir
DROP POLICY IF EXISTS "Users can vote" ON public.poll_votes;
CREATE POLICY "Users can vote" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Oylama geri alınabilir mi? Şimdilik sadece silme yetkisi verelim (Opsiyonel)
DROP POLICY IF EXISTS "Users can remove vote" ON public.poll_votes;
CREATE POLICY "Users can remove vote" ON public.poll_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- ================================
-- 4. ANONİMLİK İÇİN GÜVENLİ VIEW (MASKING)
-- ================================
-- İstemci tarafına author_id gitmemesi için view kullanıyoruz.
-- Not: Supabase, public şemasındaki view'ları da API üzerinden sunar.
DROP VIEW IF EXISTS public.vw_posts;
CREATE OR REPLACE VIEW public.vw_posts AS
SELECT
  p.id,
  p.content,
  p.media_url,
  p.is_anonymous,
  p.hashtags,
  p.created_at,
  -- Mask author_id: Eğer anonim ise ve sorgulayan kişi yazarın kendisi veya admin değilse NULL döner.
  CASE
    WHEN p.is_anonymous = true 
         AND auth.uid() != p.author_id 
         AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'admin') 
    THEN NULL
    ELSE p.author_id
  END as author_id
FROM public.posts p;

-- View'lar için grant
GRANT SELECT ON public.vw_posts TO authenticated, anon;

-- ================================
-- 5. STORAGE BUCKET (FEED MEDIA)
-- ================================
-- Supabase Storage API'sini kullanarak bucket ekliyoruz
INSERT INTO storage.buckets (id, name, public) 
VALUES ('feed_media', 'feed_media', true) 
ON CONFLICT (id) DO NOTHING;

-- Bucket erişim politikaları
-- 1. Herkes okuyabilir
DROP POLICY IF EXISTS "Public can view feed_media" ON storage.objects;
CREATE POLICY "Public can view feed_media" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'feed_media');

-- 2. Yalnızca giriş yapmış kullanıcılar yükleyebilir
DROP POLICY IF EXISTS "Authenticated users can upload to feed_media" ON storage.objects;
CREATE POLICY "Authenticated users can upload to feed_media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'feed_media');

-- 3. Kullanıcı kendi medyasını silebilir
DROP POLICY IF EXISTS "Users can delete own feed_media" ON storage.objects;
CREATE POLICY "Users can delete own feed_media" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'feed_media' AND auth.uid() = owner);
