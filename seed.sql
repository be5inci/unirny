-- =========================================
-- unirny - MVP Seed Data Script
-- =========================================

-- 1. Tablo Güncellemeleri
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending';

-- 2. Uzantılar
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Örnek Kullanıcılar (auth.users ve public.profiles)
DO $$
DECLARE
  user1_id uuid := gen_random_uuid();
  user2_id uuid := gen_random_uuid();
  user3_id uuid := gen_random_uuid();
  user4_id uuid := gen_random_uuid();
BEGIN
  -- Auth.users eklemeleri (Şifre: password123)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
  VALUES 
    (user1_id, '00000000-0000-0000-0000-000000000000', 'mentee@unirny.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated'),
    (user2_id, '00000000-0000-0000-0000-000000000000', 'mentor@unirny.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated'),
    (user3_id, '00000000-0000-0000-0000-000000000000', 'frontend@unirny.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated'),
    (user4_id, '00000000-0000-0000-0000-000000000000', 'designer@unirny.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated');

  -- NOT: profiles tablosu trigger ile otomatik oluşmuş olabilir. Eğer öyleyse UPDATE yapacağız, yoksa INSERT.
  -- Basitlik adına doğrudan UPDATE atıyoruz (Zaten trigger oluşturduysa çalışır):
  UPDATE public.profiles SET name = 'Can Danışan', major = 'Bilgisayar Mühendisliği', city = 'İstanbul', purpose = 'Mentörlük', interests = ARRAY['Yapay Zeka', 'Web'], avatar = 'https://i.pravatar.cc/150?u=m1' WHERE id = user1_id;
  UPDATE public.profiles SET name = 'Dr. Ayşe Yılmaz', major = 'Yazılım Uzmanı', city = 'Ankara', purpose = 'Mentor', interests = ARRAY['Web', 'Kariyer'], avatar = 'https://i.pravatar.cc/150?u=a' WHERE id = user2_id;
  UPDATE public.profiles SET name = 'Ali Frontend', major = 'Yazılım Mühendisliği', city = 'İzmir', purpose = 'Proje', interests = ARRAY['React', 'UI/UX'], avatar = 'https://i.pravatar.cc/150?u=u1' WHERE id = user3_id;
  UPDATE public.profiles SET name = 'Zeynep Tasarım', major = 'Görsel İletişim', city = 'İstanbul', purpose = 'Proje', interests = ARRAY['Tasarım', 'Figma'], avatar = 'https://i.pravatar.cc/150?u=u2' WHERE id = user4_id;
  
  -- Eğer trigger yoksa insert için (Hata almamak için ON CONFLICT kullanılır):
  INSERT INTO public.profiles (id, email, name, major, city, purpose, interests, avatar)
  VALUES 
    (user1_id, 'mentee@unirny.com', 'Can Danışan', 'Bilgisayar Mühendisliği', 'İstanbul', 'Mentörlük', ARRAY['Yapay Zeka', 'Web'], 'https://i.pravatar.cc/150?u=m1'),
    (user2_id, 'mentor@unirny.com', 'Dr. Ayşe Yılmaz', 'Yazılım Uzmanı', 'Ankara', 'Mentor', ARRAY['Web', 'Kariyer'], 'https://i.pravatar.cc/150?u=a'),
    (user3_id, 'frontend@unirny.com', 'Ali Frontend', 'Yazılım Mühendisliği', 'İzmir', 'Proje', ARRAY['React', 'UI/UX'], 'https://i.pravatar.cc/150?u=u1'),
    (user4_id, 'designer@unirny.com', 'Zeynep Tasarım', 'Görsel İletişim', 'İstanbul', 'Proje', ARRAY['Tasarım', 'Figma'], 'https://i.pravatar.cc/150?u=u2')
  ON CONFLICT (id) DO NOTHING;

  -- 4. Örnek Projeler
  INSERT INTO public.projects (title, summary, status, owner_id, roles)
  VALUES 
    ('Akıllı Kampüs Mobil Uygulaması', 'Kampüs içi navigasyon, etkinlik takibi ve yemekhane menüsünü birleştiren uygulama.', 'In Progress', user3_id, ARRAY['React Native', 'Node.js']),
    ('Geri Dönüşüm Takip Sistemi', 'Akıllı çöplerden gelen verileri görselleştiren dashboard.', 'Upcoming', user4_id, ARRAY['Frontend', 'UI/UX']);

  -- 5. Örnek Gruplar
  DECLARE
    group1_id uuid := gen_random_uuid();
    group2_id uuid := gen_random_uuid();
  BEGIN
    INSERT INTO public.groups (id, name, description, category, members_count)
    VALUES 
      (group1_id, 'Web Geliştiricileri TR', 'Modern web teknolojileri üzerine tartışma ve proje fikirleri topluluğu.', 'Teknoloji', 2),
      (group2_id, 'Girişimcilik Kulübü', 'Kendi start-up projesini kurmak isteyenlerin buluşma noktası.', 'Kariyer', 1);

    -- Grup Üyeleri
    INSERT INTO public.group_members (group_id, user_id, role, status)
    VALUES 
      (group1_id, user3_id, 'Kurucu/Admin', 'Approved'),
      (group1_id, user4_id, 'Tasarımcı', 'Approved'),
      (group2_id, user2_id, 'Danışman', 'Approved');
  END;

  -- 6. Mentörlük Oturumu ve 5 Günlük Geçmiş Puanlar
  DECLARE
    session_id uuid := gen_random_uuid();
  BEGIN
    -- Mentörlük 6 gün önce başlamış gibi gösteriliyor (Test için)
    INSERT INTO public.mentorships (id, mentee_id, mentor_id, focus_area, status, start_date, created_at)
    VALUES 
      (session_id, user1_id, user2_id, 'Web Geliştirme Kariyer Yolu', 'Active', now() - interval '6 days', now() - interval '6 days');

    -- Puan Geçmişi
    INSERT INTO public.mentorship_score_history (mentorship_id, score, created_at)
    VALUES 
      (session_id, 85, now() - interval '5 days'),
      (session_id, 80, now() - interval '4 days'),
      (session_id, 75, now() - interval '3 days'),
      (session_id, 65, now() - interval '2 days'),
      (session_id, 55, now() - interval '1 days');
      -- Mentör 6. puanı 40 olarak girdiğinde kural çalışacak ve sonlanacak.
  END;

END $$;
