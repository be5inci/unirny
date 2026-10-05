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
  name: z.string().min(3, { message: 'Grup adı en az 3 karakter olmalıdır.' }),
  category: z.string().min(2, { message: 'Kategori belirtilmelidir.' }),
  description: z.string().min(10, { message: 'Açıklama en az 10 karakter olmalıdır.' }),
});

type GroupFormValues = z.infer<typeof groupSchema>;

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
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
    const { data, error } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
    if (data && !error) {
      setGroups(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadGroups();
  }, []);

  async function onSubmit(data: GroupFormValues) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Önce giriş yapmalısınız!');
      return;
    }

    // Gruplar tablosuna ekle
    const { data: newGroup, error: groupError } = await supabase.from('groups').insert({
      name: data.name,
      category: data.category,
      description: data.description,
      members_count: 1
    }).select().single();
    
    if (groupError || !newGroup) {
      toast.error('Grup oluşturulurken bir hata oluştu.');
      return;
    }

    // Grup kurucusunu admin olarak group_members tablosuna ekle
    const { error: memberError } = await supabase.from('group_members').insert({
      group_id: newGroup.id,
      user_id: user.id,
      role: 'Admin',
      status: 'Approved' // Kurucu direkt onaylıdır
    });

    if (memberError) {
      toast.error('Grup oluşturuldu fakat admin kaydı yapılamadı.');
    } else {
      toast.success('Grup başarıyla kuruldu!');
      setOpen(false);
      form.reset();
      loadGroups(); // Listeyi güncelle
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Topluluk Grupları</h1>
          <p className="text-muted-foreground mt-1">İlgi alanlarınıza uygun gruplara katılın ve tartışmalara dahil olun.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button>+ Yeni Grup Kur</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Topluluk Grubu Oluştur</DialogTitle>
              <DialogDescription>Ortak ilgi alanlarına sahip insanları bir araya getirin.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grup Adı</FormLabel>
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
                        <Textarea placeholder="Bu grubun amacı nedir? Kimler katılmalı?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                  <Button type="submit">Grubu Kur</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p>Yükleniyor...</p>
      ) : groups.length === 0 ? (
        <p>Henüz grup oluşturulmamış.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge>{group.category}</Badge>
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
          ))}
        </div>
      )}
    </div>
  );
}
