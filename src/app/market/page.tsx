import { createClient } from '@/utils/supabase/server';
import { MarketClient } from '@/components/market/MarketClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MarketPage() {
  const supabase = await createClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  const currentUserId = session?.user?.id;

  // Server-side initial fetch
  const { data: initialItems, error } = await supabase
    .from('market_items')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch error in page.tsx:', error);
  }
  
  console.log('Fetched items in page.tsx:', initialItems);

  return (
    <MarketClient 
      initialItems={initialItems || []} 
      currentUserId={currentUserId}
    />
  );
}
