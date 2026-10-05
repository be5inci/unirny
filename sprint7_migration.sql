-- sprint7_migration.sql

-- 1. Etkinlikler Tablosu
CREATE TABLE IF NOT EXISTS public.events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL, -- Örn: Spor, Sinema, Atölye, Buluşma, Gezi
  description text,
  location text NOT NULL,
  event_date timestamp with time zone NOT NULL,
  quota integer, -- NULL ise limitsiz
  target_budget integer DEFAULT 0,
  cost_per_person integer DEFAULT 0,
  iban text,
  iban_name text,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Etkinlik Katılımcıları (RSVP) Tablosu
CREATE TABLE IF NOT EXISTS public.event_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- 3. Kitle Fonlama / Katkı Tablosu
CREATE TABLE IF NOT EXISTS public.event_contributions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  created_at timestamp with time zone DEFAULT now()
);

-- RLS Aktifleştirme
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_contributions ENABLE ROW LEVEL SECURITY;

-- ================================
-- EVENTS POLİTİKALARI
-- ================================
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
CREATE POLICY "Anyone can view events" ON public.events FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert events" ON public.events;
CREATE POLICY "Authenticated users can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can delete own events" ON public.events;
CREATE POLICY "Users can delete own events" ON public.events FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- ================================
-- PARTICIPANTS (RSVP) POLİTİKALARI
-- ================================
DROP POLICY IF EXISTS "Anyone can view participants" ON public.event_participants;
CREATE POLICY "Anyone can view participants" ON public.event_participants FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can RSVP to events" ON public.event_participants;
CREATE POLICY "Users can RSVP to events" ON public.event_participants FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ================================
-- CONTRIBUTIONS POLİTİKALARI
-- ================================
DROP POLICY IF EXISTS "Anyone can view contributions" ON public.event_contributions;
CREATE POLICY "Anyone can view contributions" ON public.event_contributions FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can make contributions" ON public.event_contributions;
CREATE POLICY "Users can make contributions" ON public.event_contributions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);


-- ================================
-- ADMIN FONKSİYONLARI
-- ================================
CREATE OR REPLACE FUNCTION admin_delete_event(target_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'admin') THEN
    DELETE FROM public.events WHERE id = target_event_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized: Only admins can delete events globally';
  END IF;
END;
$$;
