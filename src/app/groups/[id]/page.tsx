"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Lock, Unlock, SendIcon, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
  roleOrNote: z.string().min(5, { message: 'Lütfen topluluğa katılım amacınızı/rolünüzü kısaca açıklayın.' }),
});

type JoinFormValues = z.infer<typeof joinSchema>;

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const groupId = unwrappedParams.id;
  const router = useRouter();
  
  const [group, setGroup] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingApproval, setIsUpdatingApproval] = useState(false);
  
  const supabase = createClient();

  const form = useForm<JoinFormValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: { roleOrNote: '' },
  });

  async function loadGroup() {
    setLoading(true);
    // 1. Fetch current user & admin role
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

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
        setIsAdmin(true);
      }
    }

    // 2. Fetch Group
    const { data: groupData } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();
    if (groupData) setGroup(groupData);

    // 3. Check Membership
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

  useEffect(() => {
    loadGroup();
  }, [groupId, supabase]);

  const isOwner = Boolean(currentUser?.id && (currentUser.id === group?.owner_id || currentUser.id === group?.creator_id));
  const isOpen = group?.is_open !== false;

  async function toggleGroupStatus() {
    if (!currentUser || !isOwner || isTogglingStatus) return;
    if (userRole === 'viewer') {
      toast.error('İzleyici hesabıyla işlem yapamazsınız, yalnızca görüntüleme yetkiniz var.');
      return;
    }
    setIsTogglingStatus(true);

    const nextIsOpen = !isOpen;

    try {
      const { error } = await supabase
        .from('groups')
        .update({ is_open: nextIsOpen })
        .eq('id', groupId);

      if (error) {
        toast.error('Alım durumu güncellenemedi: ' + error.message);
      } else {
        toast.success(nextIsOpen ? 'Topluluk katılımlara açıldı.' : 'Topluluk katılımlara kapatıldı.');
        setGroup((prev: any) => prev ? { ...prev, is_open: nextIsOpen } : prev);
        router.refresh();
      }
    } catch (err: any) {
      console.error('Alım durumu değiştirme hatası:', err);
      toast.error('Bir hata oluştu: ' + (err?.message || 'Lütfen tekrar deneyin.'));
    } finally {
      setIsTogglingStatus(false);
    }
  }

  async function handleDeleteGroup() {
    if (!currentUser || !isOwner || isDeleting) return;
    if (userRole === 'viewer') {
      toast.error('İzleyici hesabıyla işlem yapamazsınız, yalnızca görüntüleme yetkiniz var.');
      return;
    }
    const confirmed = window.confirm('Bu topluluğu silmek istediğinize emin misiniz?');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) {
        toast.error('Topluluk silinemedi: ' + error.message);
      } else {
        toast.success('Topluluk başarıyla silindi.');
        router.push('/groups');
      }
    } catch (err: any) {
      console.error('Topluluk silme hatası:', err);
      toast.error('Bir hata oluştu: ' + (err?.message || 'Lütfen tekrar deneyin.'));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleUpdateGroupApproval(newStatus: 'approved' | 'rejected') {
    if (!isAdmin || isUpdatingApproval) return;
    if (userRole === 'viewer') {
      toast.error('İzleyici hesabıyla işlem yapamazsınız, yalnızca görüntüleme yetkiniz var.');
      return;
    }
    setIsUpdatingApproval(true);
    try {
      const { error } = await supabase
        .from('groups')
        .update({ status: newStatus })
        .eq('id', groupId);

      if (error) {
        toast.error('Durum güncellenemedi: ' + error.message);
      } else {
        toast.success(newStatus === 'approved' ? 'Topluluk onaylandı.' : 'Topluluk reddedildi.');
        setGroup((prev: any) => prev ? { ...prev, status: newStatus } : prev);
        router.refresh();
      }
    } catch (err: any) {
      console.error('Onay güncelleme hatası:', err);
      toast.error('Bir hata oluştu: ' + (err?.message || 'Lütfen tekrar deneyin.'));
    } finally {
      setIsUpdatingApproval(false);
    }
  }

  async function onJoinSubmit(data: JoinFormValues) {
    if (userRole === 'viewer') {
      toast.error('İzleyici hesabıyla işlem yapamazsınız, yalnızca görüntüleme yetkiniz var.');
      return;
    }

    if (!isOpen) {
      toast.error('Bu topluluk yeni katılımlara kapalıdır.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Lütfen giriş yapın.');
      return;
    }

    setIsSubmittingJoin(true);
    try {
      const { error } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: user.id,
        role: data.roleOrNote,
        status: 'Pending'
      });

      if (error) {
        toast.error('Katılım isteği gönderilirken hata oluştu: ' + error.message);
      } else {
        const targetOwnerId = group?.owner_id || group?.creator_id;
        if (targetOwnerId) {
          await supabase.from('notifications').insert({
            user_id: targetOwnerId,
            type: 'group_request',
            message: `${user.email} "${group.name}" topluluğuna katılmak istiyor.`,
            related_entity_id: group.id
          });
        }

        toast.success('Katılım isteği gönderildi! Yönetici onayı bekleniyor.');
        setMembershipStatus('Pending');
        setOpen(false);
      }
    } catch (err: any) {
      toast.error('Bir hata oluştu: ' + (err?.message || 'Lütfen tekrar deneyin.'));
    } finally {
      setIsSubmittingJoin(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        Yükleniyor...
      </div>
    );
  }

  if (!group) return <div className="p-8 text-center">Topluluk bulunamadı.</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
            {group.status === 'pending' && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium">
                Onay Bekliyor
              </Badge>
            )}
            {group.status === 'rejected' && (
              <Badge variant="destructive">
                Reddedildi
              </Badge>
            )}
            <Badge variant={isOpen ? 'default' : 'secondary'}>
              {isOpen ? 'Katılıma Açık' : 'Katılımlara Kapalı'}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">{group.members_count || 0} Üye • {group.category}</p>
        </div>
        
        {isOwner && userRole !== 'viewer' ? (
          <div className="flex items-center gap-2">
            <Button
              variant={isOpen ? "outline" : "default"}
              size="lg"
              disabled={isTogglingStatus || isDeleting}
              onClick={toggleGroupStatus}
              className="font-medium flex items-center gap-2"
            >
              {isTogglingStatus ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isOpen ? (
                <Lock className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
              {isOpen ? 'Katılımları Kapat' : 'Katılımları Aç'}
            </Button>
            <Button
              variant="destructive"
              size="lg"
              disabled={isDeleting || isTogglingStatus}
              onClick={handleDeleteGroup}
              className="font-medium flex items-center gap-2"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Topluluğu Sil
            </Button>
          </div>
        ) : membershipStatus === 'Approved' ? (
          <Button variant="outline">Topluluktan Ayrıl</Button>
        ) : membershipStatus === 'Pending' ? (
          <Button variant="secondary" disabled>İstek Beklemede</Button>
        ) : !isOpen ? (
          <Button size="lg" disabled>Katılımlara Kapalı</Button>
        ) : (
          <Dialog open={open} onOpenChange={(val) => {
            if (val && userRole === 'viewer') {
              toast.error('İzleyici hesabıyla işlem yapamazsınız, yalnızca görüntüleme yetkiniz var.');
              return;
            }
            setOpen(val);
          }}>
            <DialogTrigger render={<Button size="lg" onClick={(e) => {
              if (userRole === 'viewer') {
                e.preventDefault();
                toast.error('İzleyici hesabıyla işlem yapamazsınız, yalnızca görüntüleme yetkiniz var.');
              }
            }}>Topluluğa Katıl</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Topluluğa Katıl</DialogTitle>
                <DialogDescription>Topluluk yöneticisine katılma amacınızı veya üstleneceğiniz rolü belirtin.</DialogDescription>
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
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmittingJoin}>İptal</Button>
                    <Button type="submit" disabled={isSubmittingJoin}>
                      {isSubmittingJoin ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Gönderiliyor...
                        </>
                      ) : (
                        'İstek Gönder'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Admin Onay / Red Paneli */}
      {isAdmin && (
        <div className="mb-6 p-4 rounded-lg border bg-muted/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Admin Moderasyonu:</span>
            <span className="text-xs text-muted-foreground">Mevcut Durum:</span>
            {group.status === 'pending' ? (
              <Badge className="bg-amber-500 text-white">Onay Bekliyor</Badge>
            ) : group.status === 'rejected' ? (
              <Badge variant="destructive">Reddedildi</Badge>
            ) : (
              <Badge className="bg-emerald-600 text-white">Onaylandı</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={isUpdatingApproval || group.status === 'approved'}
              onClick={() => handleUpdateGroupApproval('approved')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
            >
              {isUpdatingApproval ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
              Onayla
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isUpdatingApproval || group.status === 'rejected'}
              onClick={() => handleUpdateGroupApproval('rejected')}
              className="text-destructive border-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              {isUpdatingApproval ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
              Reddet
            </Button>
          </div>
        </div>
      )}

      {!isAdmin && group.status === 'pending' && (
        <div className="mb-6 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Bu topluluk henüz yönetici incelemesindedir ve onay beklemektedir.</span>
        </div>
      )}

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="text-lg">Sohbet & Forum Kanalı</CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col justify-end">
          {isOwner || membershipStatus === 'Approved' ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>T</AvatarFallback>
                </Avatar>
                <div className="bg-muted p-3 rounded-2xl rounded-tl-none">
                  <p className="text-sm font-semibold mb-1">Topluluk Yöneticisi</p>
                  <p className="text-sm">Topluluğa hoş geldiniz! Gerçek mesajlaşma altyapısı bir sonraki sprintte eklenecektir.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground my-auto">
              Sohbeti görebilmek için topluluğun onaylı bir üyesi olmalısınız.
            </div>
          )}
        </CardContent>

        <div className="p-4 border-t bg-background flex items-center gap-2">
          <Input
            placeholder="Mesajınızı yazın..."
            className="flex-1"
            disabled={!isOwner && membershipStatus !== 'Approved'}
          />
          <Button size="icon" disabled={!isOwner && membershipStatus !== 'Approved'}>
            <SendIcon className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
