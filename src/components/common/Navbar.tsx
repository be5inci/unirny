import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/utils/supabase/server';
import { signOut } from '@/app/auth-actions';
import NotificationBell from '@/components/common/NotificationBell';
import { Store } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('platform_role')
      .eq('id', user.id)
      .single();
    
    if (profile?.platform_role === 'admin') {
      isAdmin = true;
    }
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between mx-auto px-4">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <span className="inline-block font-bold">unirny</span>
          </Link>
          <div className="hidden md:flex gap-6 items-center">
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
              Ana Sayfa
            </Link>
            <Link href="/feed" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Akış
            </Link>
            <Link href="/events" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Etkinlikler
            </Link>
            <Link href="/about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Hakkımızda
            </Link>
            <Link href="/projects" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Projeler
            </Link>
            <Link href="/matching" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Keşfet
            </Link>
            <Link href="/groups" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Gruplar
            </Link>
            <Link href="/homeworks" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Kaynaklar
            </Link>
            <Link href="/market" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary flex items-center gap-1">
              <Store className="h-4 w-4" /> Pazar
            </Link>
            <Link href="/mentorship" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Mentörlük
            </Link>
            {isAdmin && (
              <Link href="/admin" className="text-sm font-bold text-red-500 transition-colors hover:text-red-600 ml-4 border border-red-500 rounded-md px-2 py-1">
                Admin Paneli
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <NotificationBell />
              <Link href="/profile">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://ui-avatars.com/api/?name=${user.email}`} alt="User" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </Link>
              <form action={signOut}>
                <Button variant="default" size="sm" type="submit">
                  Çıkış
                </Button>
              </form>
              <ThemeToggle />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" render={<Link href="/login" />}>
                Giriş Yap
              </Button>
              <Button variant="default" size="sm" render={<Link href="/register" />}>
                Kayıt Ol
              </Button>
              <ThemeToggle />
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
