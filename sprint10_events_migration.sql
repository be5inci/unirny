-- sprint10_events_migration.sql

-- 1. Etkinlik Katkıları Tablosunu Güncelleme
-- Yeni sütunlar: status ve note
ALTER TABLE public.event_contributions
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS note text;

-- 2. Etkinlik Katkıları (Contributions) İçin RLS Güncellemeleri
-- Mevcut politikaları düşür
DROP POLICY IF EXISTS "Anyone can view contributions" ON public.event_contributions;
DROP POLICY IF EXISTS "Users can make contributions" ON public.event_contributions;
DROP POLICY IF EXISTS "Event organizers can update contributions" ON public.event_contributions;

-- Yenilerini oluştur
CREATE POLICY "Anyone can view contributions" ON public.event_contributions FOR SELECT TO public USING (true);
CREATE POLICY "Users can make contributions" ON public.event_contributions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Sadece etkinliği oluşturan organizatör katkıların durumunu güncelleyebilir (UPDATE)
CREATE POLICY "Event organizers can update contributions" ON public.event_contributions FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_contributions.event_id 
    AND e.creator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_contributions.event_id 
    AND e.creator_id = auth.uid()
  )
);

-- 3. Etkinlik Yorumları (Discussion Wall) Tablosu
CREATE TABLE IF NOT EXISTS public.event_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0),
  created_at timestamp with time zone DEFAULT now()
);

-- Yorumlar RLS
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view event comments" ON public.event_comments;
CREATE POLICY "Anyone can view event comments" ON public.event_comments FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert event comments" ON public.event_comments;
CREATE POLICY "Authenticated users can insert event comments" ON public.event_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own event comments" ON public.event_comments;
CREATE POLICY "Users can delete own event comments" ON public.event_comments FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Admin Yorum Silme Fonksiyonu
CREATE OR REPLACE FUNCTION admin_delete_event_comment(target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'admin') THEN
    DELETE FROM public.event_comments WHERE id = target_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized: Only admins can delete event comments globally';
  END IF;
END;
$$;
