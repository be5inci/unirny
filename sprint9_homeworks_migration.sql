-- sprint9_homeworks_migration.sql

-- 1. Homeworks Tablosuna Yeni Sütunların Eklenmesi
ALTER TABLE public.homeworks
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS university text,
ADD COLUMN IF NOT EXISTS faculty text,
ADD COLUMN IF NOT EXISTS exam_type text;

-- (Mevcut type kolonu "Ders Notu", "Çıkmış Soru" gibi genel bir kategori tutuyordu. exam_type ise spesifik olarak Vize, Final vs. tutacak.)

-- 2. Değerlendirme (Ratings) Tablosunun Oluşturulması
CREATE TABLE IF NOT EXISTS public.homework_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id uuid REFERENCES public.homeworks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  is_helpful boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (homework_id, user_id) -- Bir kullanıcı bir kaynağa sadece bir kez oy verebilir
);

-- RLS Aktifleştirme
ALTER TABLE public.homework_ratings ENABLE ROW LEVEL SECURITY;

-- Rating Politikaları
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.homework_ratings;
CREATE POLICY "Anyone can view ratings" ON public.homework_ratings FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert ratings" ON public.homework_ratings;
CREATE POLICY "Authenticated users can insert ratings" ON public.homework_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ratings" ON public.homework_ratings;
CREATE POLICY "Users can update own ratings" ON public.homework_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 3. Sayaç Artırma Fonksiyonları (RPC)
-- Race condition sorunlarını önlemek için güvenli artırma işlemleri

-- Görüntüleme artırma
CREATE OR REPLACE FUNCTION increment_homework_views(target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Fonksiyonun her kullanıcı tarafından çalıştırılabilmesi için yetkiyi yükseltir (update yetkisi olmasa bile çalışır)
AS $$
BEGIN
  UPDATE public.homeworks
  SET view_count = view_count + 1
  WHERE id = target_id;
END;
$$;

-- İndirme artırma
CREATE OR REPLACE FUNCTION increment_homework_downloads(target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.homeworks
  SET download_count = download_count + 1
  WHERE id = target_id;
END;
$$;

-- 4. Adminler için Homeworks tablosu UPDATE yetkisi (Doğrulama işlemi için)
DROP POLICY IF EXISTS "Admins can update homeworks" ON public.homeworks;
CREATE POLICY "Admins can update homeworks" 
ON public.homeworks FOR UPDATE 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'admin')
);
