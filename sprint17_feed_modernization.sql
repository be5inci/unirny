-- =========================================
-- unirny - Sprint 17 Migration Script
-- Kampüs Akışı Modernizasyonu: Kategoriler & post_bookmarks Tablosu
-- =========================================

-- 1. posts Tablosuna Kategori Kolonu Ekleme
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Genel';

-- 2. post_bookmarks Tablosu (Kaydedilen Gönderiler)
CREATE TABLE IF NOT EXISTS public.post_bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- RLS Etkinleştir
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;

-- Politikalar
DROP POLICY IF EXISTS "Users can view own post_bookmarks" ON public.post_bookmarks;
CREATE POLICY "Users can view own post_bookmarks" 
ON public.post_bookmarks FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert post_bookmarks" ON public.post_bookmarks;
CREATE POLICY "Users can insert post_bookmarks" 
ON public.post_bookmarks FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own post_bookmarks" ON public.post_bookmarks;
CREATE POLICY "Users can delete own post_bookmarks" 
ON public.post_bookmarks FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Eğer saved_posts tablosunda veri varsa, post_bookmarks tablosuna aktar
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saved_posts') THEN
    INSERT INTO public.post_bookmarks (post_id, user_id, created_at)
    SELECT post_id, user_id, created_at FROM public.saved_posts
    ON CONFLICT (post_id, user_id) DO NOTHING;
  END IF;
END $$;

-- 3. vw_posts View Güncelleme (category alanını ekleyerek anonimliği maskeler)
DROP VIEW IF EXISTS public.vw_posts;
CREATE OR REPLACE VIEW public.vw_posts AS
SELECT
  p.id,
  p.content,
  p.media_url,
  p.is_anonymous,
  p.hashtags,
  p.category,
  p.created_at,
  -- Mask author_id: Anonimse ve sorgulayan kişi yazarın kendisi veya admin/super_admin değilse NULL döner.
  CASE
    WHEN p.is_anonymous = true 
         AND auth.uid() != p.author_id 
         AND NOT EXISTS (
           SELECT 1 FROM public.profiles 
           WHERE id = auth.uid() AND platform_role IN ('admin', 'super_admin')
         ) 
    THEN NULL
    ELSE p.author_id
  END as author_id
FROM public.posts p;

-- View izinleri
GRANT SELECT ON public.vw_posts TO authenticated, anon;

