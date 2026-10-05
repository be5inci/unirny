"use client";

import { useEffect, useState, use } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { SendIcon } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const joinSchema = z.object({
  roleOrNote: z.string().min(5, { message: 'Lütfen gruba katılım amacınızı/rolünüzü kısaca açıklayın.' }),
});

type JoinFormValues = z.infer<typeof joinSchema>;

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const groupId = unwrappedParams.id;
  
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const supabase = createClient();

  const form = useForm<JoinFormValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: { roleOrNote: '' },
  });

  useEffect(() => {
    async function loadGroup() {
      // 1. Fetch Group
      const { data: groupData } = await supabase.from('groups').select('*').eq('id', groupId).single();
      if (groupData) setGroup(groupData);

      // 2. Check Membership
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: memberData } = await supabase
          .from('group_members')
          .select('status')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .single();
        
        if (memberData) {
          setMembershipStatus(memberData.status);
        }
      }
      setLoading(false);
    }
    loadGroup();
  }, [groupId, supabase]);

  async function onJoinSubmit(data: JoinFormValues) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Lütfen giriş yapın.');
      return;
    }

    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: user.id,
      role: data.roleOrNote,
      status: 'Pending'
    });

    if (error) {
      toast.error('Katılım isteği gönderilirken hata oluştu.');
    } else {
      // Notification for the group owner
      if (group.creator_id) {
        await supabase.from('notifications').insert({
          user_id: group.creator_id,
          type: 'group_request',
          message: `${user.email} "${group.name}" grubuna katılmak istiyor.`,
          related_entity_id: group.id
        });
      }

      toast.success('Katılım isteği gönderildi! Yönetici onayı bekleniyor.');
      setMembershipStatus('Pending');
      setOpen(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;
  if (!group) return <div className="p-8 text-center">Grup bulunamadı.</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-muted-foreground text-sm">{group.members_count || 0} Üye • {group.category}</p>
        </div>
        
        {membershipStatus === 'Approved' ? (
          <Button variant="outline">Gruptan Ayrıl</Button>
        ) : membershipStatus === 'Pending' ? (
          <Button variant="secondary" disabled>İstek Beklemede</Button>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button>Katılım İsteği Gönder</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gruba Katıl</DialogTitle>
                <DialogDescription>Grup yöneticisine katılma amacınızı veya üstleneceğiniz rolü belirtin.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onJoinSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="roleOrNote"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol / Not</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Örn: Node.js tarafında tecrübeliyim, tartışmalara katkı sağlayabilirim..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                    <Button type="submit">İstek Gönder</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="text-lg">Sohbet & Forum Kanalı</CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col justify-end">
          {membershipStatus === 'Approved' ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>A</AvatarFallback>
                </Avatar>
                <div className="bg-muted p-3 rounded-2xl rounded-tl-none">
                  <p className="text-sm font-semibold mb-1">Grup Yöneticisi</p>
                  <p className="text-sm">Gruba hoş geldiniz! Gerçek mesajlaşma altyapısı bir sonraki sprintte eklenecektir.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground my-auto">
              Sohbeti görebilmek için grubun onaylı bir üyesi olmalısınız.
            </div>
          )}
        </CardContent>

        <div className="p-4 border-t bg-background flex items-center gap-2">
          <Input placeholder="Mesajınızı yazın..." className="flex-1" disabled={membershipStatus !== 'Approved'} />
          <Button size="icon" disabled={membershipStatus !== 'Approved'}>
            <SendIcon className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
