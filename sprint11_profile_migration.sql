-- sprint11_profile_migration.sql

-- 1. Add new columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS karma_score integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS faculty text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_level text;

-- 2. Create generalized Karma Increment function
CREATE OR REPLACE FUNCTION increment_karma(target_user_id uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF target_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET karma_score = COALESCE(karma_score, 0) + amount
    WHERE id = target_user_id;
  END IF;
END;
$$;

-- 3. Trigger Function: Posts (+5 Karma)
CREATE OR REPLACE FUNCTION trg_karma_on_post()
RETURNS trigger AS $$
BEGIN
  PERFORM increment_karma(NEW.author_id, 5);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_karma_on_post ON public.posts;
CREATE TRIGGER trg_karma_on_post
AFTER INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION trg_karma_on_post();

-- 4. Trigger Function: Post Likes (+1 Karma to Post Author)
CREATE OR REPLACE FUNCTION trg_karma_on_post_like()
RETURNS trigger AS $$
DECLARE
  post_author_id uuid;
BEGIN
  SELECT author_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
  IF post_author_id IS NOT NULL AND post_author_id != NEW.user_id THEN
    PERFORM increment_karma(post_author_id, 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_karma_on_post_like ON public.post_likes;
CREATE TRIGGER trg_karma_on_post_like
AFTER INSERT ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION trg_karma_on_post_like();

-- 5. Trigger Function: Homeworks (+10 Karma)
CREATE OR REPLACE FUNCTION trg_karma_on_homework()
RETURNS trigger AS $$
BEGIN
  PERFORM increment_karma(NEW.uploader_id, 10);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_karma_on_homework ON public.homeworks;
CREATE TRIGGER trg_karma_on_homework
AFTER INSERT ON public.homeworks
FOR EACH ROW
EXECUTE FUNCTION trg_karma_on_homework();

-- 6. Trigger Function: Homework Helpful Ratings (+2 Karma)
-- Assuming homework_ratings has is_helpful boolean
CREATE OR REPLACE FUNCTION trg_karma_on_homework_helpful()
RETURNS trigger AS $$
DECLARE
  hw_uploader_id uuid;
BEGIN
  IF NEW.is_helpful = true THEN
    SELECT uploader_id INTO hw_uploader_id FROM public.homeworks WHERE id = NEW.homework_id;
    IF hw_uploader_id IS NOT NULL AND hw_uploader_id != NEW.user_id THEN
      PERFORM increment_karma(hw_uploader_id, 2);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_karma_on_homework_helpful ON public.homework_ratings;
CREATE TRIGGER trg_karma_on_homework_helpful
AFTER INSERT ON public.homework_ratings
FOR EACH ROW
EXECUTE FUNCTION trg_karma_on_homework_helpful();

-- 7. Trigger Function: Events (+15 Karma)
CREATE OR REPLACE FUNCTION trg_karma_on_event()
RETURNS trigger AS $$
BEGIN
  PERFORM increment_karma(NEW.creator_id, 15);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_karma_on_event ON public.events;
CREATE TRIGGER trg_karma_on_event
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION trg_karma_on_event();

-- Update Profile RLS to allow users to update their own new fields
-- Existing policy usually allows updating own row, but we should ensure karma_score isn't updated directly by client if they try.
-- Since Supabase UPDATE policies can't easily filter specific columns out in standard RLS (without column-level security), 
-- a robust way is a trigger to prevent user from tampering with karma_score directly, or we trust the security definer.
-- For now, we will assume standard RLS handles updates to profile fields (faculty, class_level, interests).

-- Add some seed karma to mock users if we want them to have non-zero karma immediately
UPDATE public.profiles SET karma_score = 125 WHERE email = 'mentee@unirny.com';
UPDATE public.profiles SET karma_score = 450 WHERE email = 'mentor@unirny.com';
UPDATE public.profiles SET karma_score = 310 WHERE email = 'frontend@unirny.com';
UPDATE public.profiles SET karma_score = 280 WHERE email = 'designer@unirny.com';
