-- =========================================
-- unirny - Sprint 15 Migration Script
-- super_admin Rol Hiyerarşisi & site_about (Hakkımızda) Tablosu
-- =========================================

-- 1. site_about tablosu oluşturma
CREATE TABLE IF NOT EXISTS public.site_about (
  id integer PRIMARY KEY DEFAULT 1,
  title text NOT NULL DEFAULT 'Hakkımızda',
  subtitle text,
  story text,
  mission text,
  vision text,
  updated_at timestamp with time zone DEFAULT now()
);

-- İlk varsayılan veriyi ekle
INSERT INTO public.site_about (id, title, subtitle, story, mission, vision)
VALUES (
  1,
  'Hakkımızda',
  'unirny, üniversite öğrencilerinin fikirlerini projelere dönüştürdüğü, ekipler kurduğu ve deneyimli mentörlerle buluştuğu yenilikçi bir topluluk platformudur.',
  'unirny, üniversite ekosistemini pratik, inovatif ve üretken bir kuluçka merkezine dönüştürmek amacıyla kurulmuştur. Öğrencilerin derslerde öğrendiklerini gerçek projelere aktarabilmesini ve sektör profesyonelleriyle erken aşamada bağ kurmasını hedefliyoruz.',
  'Akademik sınırların ötesine geçerek öğrencileri pratik ve inovatif projeler etrafında birleştirmek. Teknolojiyi ve işbirliğini kullanarak, üniversite ekosistemini üretken bir kuluçka merkezine dönüştürmek istiyoruz.',
  'Sadece bir üniversite kulübü değil, binlerce öğrencinin kariyer yolculuğuna yön veren, start-up ruhunu kampüs kültürüne entegre eden global standartlarda bir yetenek platformu olmak.'
)
ON CONFLICT (id) DO NOTHING;

-- RLS Etkinleştir
ALTER TABLE public.site_about ENABLE ROW LEVEL SECURITY;

-- Herkes hakkımızda sayfasını okuyabilir
DROP POLICY IF EXISTS "Anyone can view site_about" ON public.site_about;
CREATE POLICY "Anyone can view site_about" 
ON public.site_about FOR SELECT 
TO public 
USING (true);

-- Sadece super_admin düzenleyebilir
DROP POLICY IF EXISTS "Only super_admin can modify site_about" ON public.site_about;
CREATE POLICY "Only super_admin can modify site_about" 
ON public.site_about FOR ALL 
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.platform_role = 'super_admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.platform_role = 'super_admin')
);

-- 2. Rol Güncelleme Fonksiyonu (super_admin > admin > user > viewer Hiyerarşisi)
CREATE OR REPLACE FUNCTION admin_update_user_role(target_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_role text;
  target_current_role text;
BEGIN
  -- İşlemi yapanın rolünü al
  SELECT platform_role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  
  -- Yalnızca super_admin ve admin rol yönetebilir
  IF caller_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins or super admins can update roles';
  END IF;

  -- Hedef kullanıcının mevcut rolünü al
  SELECT platform_role INTO target_current_role FROM public.profiles WHERE id = target_id;

  -- Normal admin, super_admin olan birinin rolünü değiştiremez
  IF target_current_role = 'super_admin' AND caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Normal admins cannot modify super_admin roles';
  END IF;

  -- Normal admin, bir kullanıcıyı super_admin yapamaz
  IF new_role = 'super_admin' AND caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can assign super_admin role';
  END IF;

  -- Güncelle
  UPDATE public.profiles SET platform_role = new_role WHERE id = target_id;
END;
$$;

-- ========================================================
-- İPUCU: Kendi kullanıcınızı doğrudan 'super_admin' yapmak için:
-- UPDATE public.profiles SET platform_role = 'super_admin' WHERE id = 'BURAYA_KULLANICI_UUID';
-- ========================================================


