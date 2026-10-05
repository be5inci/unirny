-- sprint4_migration.sql

-- 1. profiles tablosuna platform_role ekle (zaten varsa hata vermez)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_role text DEFAULT 'member';

-- 2. announcements tablosunu oluştur
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'info',
  created_at timestamp with time zone DEFAULT now()
);

-- announcements için RLS ayarları
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;
CREATE POLICY "Anyone can view announcements" 
ON public.announcements FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
CREATE POLICY "Admins can insert announcements" 
ON public.announcements FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'admin')
);

DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
CREATE POLICY "Admins can delete announcements" 
ON public.announcements FOR DELETE 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'admin')
);

-- 3. İlk kayıt olan kullanıcıyı Admin yap (Bootstrap)
UPDATE public.profiles
SET platform_role = 'admin'
WHERE id IN (
  SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1
);

-- 4. Yönetici Operasyonları İçin SECURITY DEFINER Fonksiyonlar
-- Proje Silme Fonksiyonu
CREATE OR REPLACE FUNCTION admin_delete_project(target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'admin') THEN
    DELETE FROM public.projects WHERE id = target_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized: Only admins can delete projects';
  END IF;
END;
$$;

-- Rol Güncelleme Fonksiyonu
CREATE OR REPLACE FUNCTION admin_update_user_role(target_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'admin') THEN
    UPDATE public.profiles SET platform_role = new_role WHERE id = target_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized: Only admins can update roles';
  END IF;
END;
$$;
