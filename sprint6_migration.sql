-- sprint6_migration.sql

-- 1. Gönderiler Tablosu
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 500),
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Gönderi Beğenileri Tablosu
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- 3. Gönderi Yorumları Tablosu
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0),
  created_at timestamp with time zone DEFAULT now()
);

-- RLS Aktifleştirme
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- ================================
-- POSTS POLİTİKALARI
-- ================================
-- Herkes okuyabilir
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT TO public USING (true);

-- Authenticated kullanıcılar insert yapabilir
DROP POLICY IF EXISTS "Authenticated users can insert posts" ON public.posts;
CREATE POLICY "Authenticated users can insert posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

-- Post sahibi silebilir
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = author_id);


-- ================================
-- LIKES POLİTİKALARI
-- ================================
DROP POLICY IF EXISTS "Anyone can view likes" ON public.post_likes;
CREATE POLICY "Anyone can view likes" ON public.post_likes FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can toggle likes" ON public.post_likes;
CREATE POLICY "Users can toggle likes" ON public.post_likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ================================
-- COMMENTS POLİTİKALARI
-- ================================
DROP POLICY IF EXISTS "Anyone can view comments" ON public.post_comments;
CREATE POLICY "Anyone can view comments" ON public.post_comments FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON public.post_comments;
CREATE POLICY "Users can create comments" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;
CREATE POLICY "Users can delete own comments" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = author_id);


-- ================================
-- ADMIN FONKSİYONLARI
-- ================================
CREATE OR REPLACE FUNCTION admin_delete_post(target_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'admin') THEN
    DELETE FROM public.posts WHERE id = target_post_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized: Only admins can delete posts globally';
  END IF;
END;
$$;
