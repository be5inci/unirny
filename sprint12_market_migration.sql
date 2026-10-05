-- sprint12_market_migration.sql

-- 1. Create the market_items table
CREATE TABLE IF NOT EXISTS public.market_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL CHECK (category IN ('Ders Kitabı & Not', 'Elektronik', 'Yurt & Ev Eşyası', 'Giyim & Aksesuar', 'Kırtasiye & Hobi', 'Diğer')),
    condition TEXT NOT NULL CHECK (condition IN ('Sıfır', 'Çok İyi / Yeni Gibi', 'Kullanılmış / İyi')),
    images TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'reserved')),
    location TEXT NOT NULL,
    contact_phone TEXT, -- Optional, if null, only show profile link
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Handle updated_at
CREATE TRIGGER set_market_items_updated_at
BEFORE UPDATE ON public.market_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 2. RLS Policies
ALTER TABLE public.market_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes ürünleri görebilir"
ON public.market_items FOR SELECT
USING (status = 'active' OR user_id = auth.uid());

CREATE POLICY "Giriş yapanlar ilan verebilir"
ON public.market_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sadece sahipleri ilanını güncelleyebilir"
ON public.market_items FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sadece sahipleri ilanını silebilir"
ON public.market_items FOR DELETE
USING (auth.uid() = user_id);

-- 3. Storage Bucket Creation
INSERT INTO storage.buckets (id, name, public) 
VALUES ('market_images', 'market_images', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage Policies
CREATE POLICY "Public Erişim - Okuma"
ON storage.objects FOR SELECT
USING ( bucket_id = 'market_images' );

CREATE POLICY "Oturum Açanlar - Ekleme"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'market_images' AND auth.role() = 'authenticated' );

CREATE POLICY "Sahipler - Güncelleme"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'market_images' AND auth.uid() = owner );

CREATE POLICY "Sahipler - Silme"
ON storage.objects FOR DELETE
USING ( bucket_id = 'market_images' AND auth.uid() = owner );
