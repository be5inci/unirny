-- =========================================
-- unirny - Sprint 13 Migration Script (Topluluklar, Alım Durumu, Onay Sistemi & İçerik Silme İzinleri)
-- =========================================

-- 1. groups tablosuna owner_id (topluluk kurucusu) ekleme
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. groups tablosuna is_open (katılıma açık/kapalı) ekleme
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS is_open boolean DEFAULT true;

-- 3. groups tablosuna status (pending / approved / rejected) ekleme
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved';

-- Mevcut eski kayıtları varsayılan olarak approved yap
UPDATE public.groups SET status = 'approved' WHERE status IS NULL;

-- 4. RLS Kuralları
DO $$
BEGIN
  -- Kurucunun topluluğu güncelleyebilmesi
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'groups' AND policyname = 'Topluluk kurucusu güncelleyebilir'
  ) THEN
    CREATE POLICY "Topluluk kurucusu güncelleyebilir" ON public.groups FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
  END IF;

  -- Adminlerin herhangi bir topluluğu güncelleyebilmesi (onay/ret)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'groups' AND policyname = 'Adminler topluluk güncelleyebilir'
  ) THEN
    CREATE POLICY "Adminler topluluk güncelleyebilir" ON public.groups FOR UPDATE TO authenticated 
    USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.platform_role = 'admin')
    );
  END IF;

  -- Kurucunun veya Adminin topluluğu silebilmesi
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'groups' AND policyname = 'Topluluk kurucusu veya admin silebilir'
  ) THEN
    CREATE POLICY "Topluluk kurucusu veya admin silebilir" ON public.groups FOR DELETE TO authenticated 
    USING (
      auth.uid() = owner_id OR 
      EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.platform_role = 'admin')
    );
  END IF;

  -- Proje sahibinin projesini silebilmesi
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Proje sahibi silebilir'
  ) THEN
    CREATE POLICY "Proje sahibi silebilir" ON public.projects FOR DELETE TO authenticated USING (auth.uid() = owner_id);
  END IF;
END $$;
