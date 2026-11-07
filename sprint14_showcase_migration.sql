-- =========================================
-- unirny - Sprint 14 Migration Script
-- Vitrin (Neler Yaptık / showcase_items) & İçerik Yönetimi
-- =========================================

-- 1. showcase_items (Neler Yaptık / Başarılarımız) Tablosu
CREATE TABLE IF NOT EXISTS public.showcase_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  metric text, -- Örn: '50+ Öğrenci', '12+ Proje'
  link text,   -- Örn: '/projects', 'https://...'
  created_at timestamp with time zone DEFAULT now()
);

-- RLS Etkinleştir
ALTER TABLE public.showcase_items ENABLE ROW LEVEL SECURITY;

-- Herkes vitrin öğelerini okuyabilir
DROP POLICY IF EXISTS "Anyone can view showcase items" ON public.showcase_items;
CREATE POLICY "Anyone can view showcase items" 
ON public.showcase_items FOR SELECT 
TO public 
USING (true);

-- Adminler ekleyebilir, güncelleyebilir ve silebilir
DROP POLICY IF EXISTS "Admins can insert showcase items" ON public.showcase_items;
CREATE POLICY "Admins can insert showcase items" 
ON public.showcase_items FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.platform_role = 'admin')
);

DROP POLICY IF EXISTS "Admins can update showcase items" ON public.showcase_items;
CREATE POLICY "Admins can update showcase items" 
ON public.showcase_items FOR UPDATE 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.platform_role = 'admin')
);

DROP POLICY IF EXISTS "Admins can delete showcase items" ON public.showcase_items;
CREATE POLICY "Admins can delete showcase items" 
ON public.showcase_items FOR DELETE 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.platform_role = 'admin')
);

-- 2. announcements tablosuna is_active kolonu ekleme
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 3. events tablosunda admin silme yetkisini garanti altına alma
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Admins can delete any event'
  ) THEN
    CREATE POLICY "Admins can delete any event" ON public.events FOR DELETE TO authenticated 
    USING (
      auth.uid() = creator_id OR 
      EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.platform_role = 'admin')
    );
  END IF;
END $$;

