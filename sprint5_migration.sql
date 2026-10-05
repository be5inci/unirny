-- sprint5_migration.sql

-- 1. Ödevler / Kaynaklar Tablosu
CREATE TABLE IF NOT EXISTS public.homeworks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  uploader_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  course_code text NOT NULL, -- Örn: CENG101
  department text,           -- Örn: Bilgisayar Mühendisliği
  file_url text NOT NULL,    -- Storage bucket dosya yolu
  type text NOT NULL,        -- 'Ders Notu', 'Çıkmış Soru', 'Ödev/Proje', 'Çözüm'
  upvotes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS Aktifleştirme
ALTER TABLE public.homeworks ENABLE ROW LEVEL SECURITY;

-- Politikalar
-- Herkes kaynakları görüntüleyebilir
DROP POLICY IF EXISTS "Anyone can view homeworks" ON public.homeworks;
CREATE POLICY "Anyone can view homeworks" 
ON public.homeworks FOR SELECT 
TO public 
USING (true);

-- Sadece giriş yapan kullanıcılar kaynak yükleyebilir
DROP POLICY IF EXISTS "Authenticated users can insert homeworks" ON public.homeworks;
CREATE POLICY "Authenticated users can insert homeworks" 
ON public.homeworks FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = uploader_id);

-- Kullanıcılar sadece kendi yükledikleri kaynakları silebilir
DROP POLICY IF EXISTS "Users can delete own homeworks" ON public.homeworks;
CREATE POLICY "Users can delete own homeworks" 
ON public.homeworks FOR DELETE 
TO authenticated 
USING (auth.uid() = uploader_id);

-- Adminler için silme fonksiyonu
CREATE OR REPLACE FUNCTION admin_delete_homework(target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'admin') THEN
    DELETE FROM public.homeworks WHERE id = target_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized: Only admins can delete homeworks globally';
  END IF;
END;
$$;


-- ==========================================
-- STORAGE BUCKET OLUŞTURMA TALİMATLARI
-- ==========================================
-- Supabase Storage kullanarak dosya yükleyebilmek için SQL üzerinden bucket açmak yerine,
-- doğrudan Supabase Dashboard arayüzünden şu adımları izlemelisin:
-- 1. Supabase Dashboard -> Storage menüsüne gir.
-- 2. "New Bucket" butonuna tıkla.
-- 3. Name kısmına "homework_files" yaz ve "Public bucket" seçeneğini aktif et.
-- 4. Bucket oluştuğunda Policies bölümüne gidip "New Policy" ile:
--    - SELECT için: "Give read access to anyone" (Herkes okuyabilsin/indirebilsin)
--    - INSERT için: "Give write access to authenticated users" (Sadece üye olanlar yüklesin)
--    politikalarını eklemelisin.
--
-- VEYA aşağidaki sorguyu SUPERUSER yetkisi ile çalıştırabiliyorsan çalıştırabilirsin:
--
-- INSERT INTO storage.buckets (id, name, public) VALUES ('homework_files', 'homework_files', true) ON CONFLICT DO NOTHING;
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'homework_files');
-- CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'homework_files');
