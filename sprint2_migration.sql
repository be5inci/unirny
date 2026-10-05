-- =========================================
-- unirny - Sprint 2 Migration Script
-- =========================================

-- 1. Profiles tablosuna 'university' kolonu ekleme
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university text;

-- 2. Meetups (Buluşmalar) tablosu
CREATE TABLE IF NOT EXISTS public.meetups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  city text NOT NULL,
  date timestamp with time zone NOT NULL,
  location text NOT NULL,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Meetup Attendees (Buluşma Katılımcıları / RSVP) tablosu
CREATE TABLE IF NOT EXISTS public.meetup_attendees (
  meetup_id uuid REFERENCES public.meetups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (meetup_id, user_id)
);

-- 4. Notifications (Bildirimler) tablosu
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL, -- örn: 'group_request', 'mentorship_terminated'
  message text NOT NULL,
  is_read boolean DEFAULT false,
  related_entity_id uuid, -- İlgili grup id veya mentorluk id vb.
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Notifications tablosu için Supabase Realtime özelliğinin aktifleştirilmesi
-- 'supabase_realtime' yayınına notifications tablosunu dahil ediyoruz:
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
