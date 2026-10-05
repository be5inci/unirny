import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('platform_role')
    .eq('id', user.id)
    .single();

  if (profile?.platform_role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-red-600">Yönetici Paneli</h1>
        <p className="text-muted-foreground mt-1">Platform genelindeki ayarları, duyuruları ve moderasyon işlemlerini yönetin.</p>
      </div>
      {children}
    </div>
  );
}
