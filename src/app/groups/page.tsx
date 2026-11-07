"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createClient } from '@/utils/supabase/client';

const groupSchema = z.object({
  name: z.string().min(3, { message: 'Topluluk adı en az 3 karakter olmalıdır.' }),
  category: z.string().min(2, { message: 'Kategori belirtilmelidir.' }),
  description: z.string().min(10, { message: 'Açıklama en az 10 karakter olmalıdır.' }),
});

type GroupFormValues = z.infer<typeof groupSchema>;

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const supabase = createClient();

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      category: '',
      description: '',
    },
  });

  async function loadGroups() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    let userIsAdmin = false;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('platform_role')
        .eq('id', user.id)
        .single();
      if (profile?.platform_role) {
        setUserRole(profile.platform_role);
      }
      if (profile?.platform_role === 'admin' || profile?.platform_role === 'super_admin') {
        userIsAdmin = true;
        setIsAdmin(true);
      }
    }

    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && !error) {
      // Admin her şeyi görür.
      // Kurucu kendi pending veya rejected topluluklarını da sarı/kırmızı badge ile görür.
      // Diğer kullanıcılar yalnızca approved (veya status null olan eski kayıtları) görür.
      const visibleGroups = data.filter((g: any) => {
        if (userIsAdmin) return true;
        if (user && g.owner_id === user.id) return true;
        return g.status === 'approved' || !g.status;
      });
      setGroups(visibleGroups);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadGroups();
  }, []);

  async function onSubmit(data: GroupFormValues) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Lütfen önce giriş yapın');
      return;
    }

    if (userRole === 'viewer') {
      toast.error('İzleyici hesabıyla işlem yapamazsınız, yalnızca görüntüleme yetkiniz var.');
      return;
    }

    setIsSubmitting(true);
    try {
      // groups tablosuna kayıt atılırken: owner_id, is_open ve status: 'pending' olarak gönder
      const { data: newGroup, error: groupError } = await supabase.from('groups').insert({
        name: data.name,
        category: data.category,
        description: data.description,
        owner_id: user.id,
        is_open: true,
        status: 'pending',
        members_count: 1
      }).select().single();
      
      if (groupError || !newGroup) {
        toast.error('Topluluk oluşturulurken bir hata oluştu: ' + (groupError?.message || ''));
        return;
      }

      // Kurucuyu otomatik olarak group_members tablosuna da üye olarak kaydet
      const { error: memberError } = await supabase.from('group_members').insert({
        group_id: newGroup.id,
        user_id: user.id,
        role: 'Kurucu',
        status: 'Approved' // Kurucu direkt onaylıdır
      });

      if (memberError) {
        toast.error('Topluluk oluşturuldu fakat kurucu üye kaydı yapılamadı.');
      } else {
        toast.success('Topluluk başvurunuz alındı! Yöneticilerimiz inceledikten sonra onaylanacaktır.');
        setOpen(false);
        form.reset();
        loadGroups(); // Listeyi güncelle
      }
    } catch (err: any) {
      toast.error('Bir hata oluştu: ' + (err?.message || 'Lütfen tekrar deneyin.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Topluluklar</h1>
          <p className="text-muted-foreground mt-1">İlgi alanlarınıza uygun topluluklara katılın ve tartışmalara dahil olun.</p>
        </div>
        
        <Dialog open={open} onOpenChange={(val) => {
          if (val && userRole === 'viewer') {
            toast.error('İzleyici hesabıyla işlem yapamazsınız, yalnızca görüntüleme yetkiniz var.');
            return;
          }
          setOpen(val);
        }}>
          <DialogTrigger render={<Button onClick={(e) => {
            if (userRole === 'viewer') {
              e.preventDefault();
              toast.error('İzleyici hesabıyla işlem yapamazsınız, yalnızca görüntüleme yetkiniz var.');
            }
          }}>+ Topluluk Oluştur</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Topluluk Oluştur</DialogTitle>
              <DialogDescription>Ortak ilgi alanlarına sahip insanları bir araya getirin.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Topluluk Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="Örn: Yapay Zeka Araştırmaları" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <FormControl>
                        <Input placeholder="Örn: Teknoloji" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Açıklama</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Bu topluluğun amacı nedir? Kimler katılmalı?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>İptal</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Topluluk Oluşturuluyor...
                      </>
                    ) : (
                      'Topluluk Oluştur'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Yükleniyor...
        </div>
      ) : groups.length === 0 ? (
        <p className="text-muted-foreground">Henüz topluluk oluşturulmamış.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => {
            const isOpen = group.is_open !== false;
            const isPending = group.status === 'pending';
            const isRejected = group.status === 'rejected';

            return (
              <Card key={group.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge>{group.category}</Badge>
                      {isPending && (
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium">
                          Onay Bekliyor
                        </Badge>
                      )}
                      {isRejected && (
                        <Badge variant="destructive">
                          Reddedildi
                        </Badge>
                      )}
                      <Badge variant={isOpen ? 'outline' : 'secondary'}>
                        {isOpen ? 'Katılıma Açık' : 'Katılımlara Kapalı'}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{group.members_count || 0} Üye</span>
                  </div>
                  <CardTitle className="text-xl">{group.name}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-2">
                    {group.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto pt-6 flex gap-2">
                  <Button render={<Link href={`/groups/${group.id}`} />} className="flex-1" variant="outline">
                    İncele
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
