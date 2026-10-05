"use client";

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    let active = true;
    let channel: any;

    async function loadNotifications() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;

      // İlk yüklemede bildirimleri getir
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data && active) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }

      if (!active) return;

      // Realtime Subscribe
      channel = supabase
        .channel(`realtime-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new;
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);
            toast.info(`Yeni bildirim: ${newNotif.message}`);
          }
        )
        .subscribe();
    }

    loadNotifications();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase]);

  async function markAsRead(id: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }

  async function markAllAsRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon", className: "relative" })}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full text-[10px]">
            {unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex justify-between items-center px-4 py-2 border-b">
          <span className="font-semibold text-sm">Bildirimler</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-auto p-0">
              Tümünü Okundu İşaretle
            </Button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Bildiriminiz yok.</div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem 
                key={n.id} 
                className={`flex flex-col items-start p-3 cursor-pointer border-b last:border-b-0 ${n.is_read ? 'opacity-60' : 'bg-primary/5'}`}
                onClick={() => !n.is_read && markAsRead(n.id)}
              >
                <div className="text-sm">{n.message}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleString('tr-TR')}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
