"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AlertCircle, Info, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Announcement = {
  id: string;
  title: string;
  content: string;
  type: string;
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    async function fetchAnnouncements() {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error) {
        setAnnouncements(data);
      }
    }

    fetchAnnouncements();
    
    // Yalnızca istemci tarafında sessionStorage'dan kapatılanları al
    const saved = sessionStorage.getItem('dismissedAnnouncements');
    if (saved) {
      setDismissed(new Set(JSON.parse(saved)));
    }
  }, [supabase]);

  const handleDismiss = (id: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(id);
    setDismissed(newDismissed);
    sessionStorage.setItem('dismissedAnnouncements', JSON.stringify(Array.from(newDismissed)));
  };

  const visibleAnnouncements = announcements.filter(a => !dismissed.has(a.id));

  if (visibleAnnouncements.length === 0) return null;

  return (
    <div className="w-full space-y-2 mb-6">
      {visibleAnnouncements.map((announcement) => (
        <Alert 
          key={announcement.id} 
          variant={announcement.type === 'warning' ? 'destructive' : 'default'}
          className="relative"
        >
          {announcement.type === 'warning' ? <AlertCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
          <AlertTitle className="pr-6">{announcement.title}</AlertTitle>
          <AlertDescription>
            {announcement.content}
          </AlertDescription>
          <button 
            onClick={() => handleDismiss(announcement.id)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </Alert>
      ))}
    </div>
  );
}
