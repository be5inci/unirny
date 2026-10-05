import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signup } from '@/app/actions';

export default async function RegisterPage(props: { searchParams: Promise<{ message: string, error: string }> }) {
  const searchParams = await props.searchParams;
  const { message, error } = searchParams;

  return (
    <div className="container flex h-screen w-full flex-col items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Hesap Oluştur</CardTitle>
          <CardDescription className="text-center">
            unirny topluluğuna katılmak için bilgilerinizi girin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Ad Soyad</Label>
              <Input id="name" name="name" type="text" placeholder="Adınız Soyadınız" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {message && <p className="text-sm text-green-500">{message}</p>}
            <Button className="w-full" type="submit">Kayıt Ol</Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
          <p>
            Zaten hesabınız var mı?{' '}
            <Link href="/login" className="underline underline-offset-4 hover:text-primary">
              Giriş Yap
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
