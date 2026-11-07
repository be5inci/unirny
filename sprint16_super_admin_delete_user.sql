-- =========================================
-- unirny - Sprint 16 Migration Script
-- super_admin_delete_user RPC Fonksiyonu
-- =========================================

-- Süper yöneticinin bir kullanıcıyı ve tüm verilerini kalıcı olarak silmesini sağlayan RPC fonksiyonu
CREATE OR REPLACE FUNCTION super_admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role text;
BEGIN
  -- 1. İşlemi çağıran kullanıcının super_admin yetkisini doğrula
  SELECT platform_role INTO caller_role 
  FROM public.profiles 
  WHERE id = auth.uid();

  IF caller_role IS NULL OR caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Yetkisiz işlem: Sadece süper yöneticiler kullanıcıları silebilir.';
  END IF;

  -- 2. Kendi hesabını silmeyi engelle
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'Kendi hesabınızı silemezsiniz.';
  END IF;

  -- 3. İlişkili verileri temizle (Foreign key hatalarını önlemek için)
  DELETE FROM public.homework_favorites WHERE user_id = target_user_id;
  DELETE FROM public.homework_comments WHERE user_id = target_user_id;
  DELETE FROM public.homeworks WHERE uploader_id = target_user_id;
  DELETE FROM public.group_members WHERE user_id = target_user_id;
  DELETE FROM public.groups WHERE owner_id = target_user_id;
  DELETE FROM public.project_applications WHERE applicant_id = target_user_id;
  DELETE FROM public.project_members WHERE user_id = target_user_id;
  DELETE FROM public.projects WHERE owner_id = target_user_id;
  DELETE FROM public.comments WHERE user_id = target_user_id;
  DELETE FROM public.likes WHERE user_id = target_user_id;
  DELETE FROM public.saved_posts WHERE user_id = target_user_id;
  DELETE FROM public.poll_votes WHERE user_id = target_user_id;
  DELETE FROM public.posts WHERE user_id = target_user_id;
  DELETE FROM public.events WHERE creator_id = target_user_id;

  -- 4. public.profiles tablosundan sil
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 5. auth.users tablosundan sil (Kullanıcının giriş hesabı tamamen silinir)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Authenticated kullanıcılara fonksiyon çalıştırma izni ver (içeride role kontrolü yapılır)
GRANT EXECUTE ON FUNCTION super_admin_delete_user(uuid) TO authenticated;

