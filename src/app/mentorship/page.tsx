"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/utils/supabase/client';

export default function MentorshipPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        // Aktif seansı kontrol et
        const { data } = await supabase
          .from('mentorships')
          .select('id')
          .eq('status', 'Active')
          .or(`mentor_id.eq.${user.id},mentee_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (data) {
          setActiveSessionId(data.id);
        }
      }

      // Mentörleri getir (ilike ile büyük/küçük harf duyarsız veya fallback ile)
      let { data: mentorsData } = await supabase
        .from('profiles')
        .select('*')
        .ilike('purpose', '%mentor%');

      // Eğer hiç mentör bulunamazsa, test için sistemdeki diğer kullanıcıları getir
      if (!mentorsData || mentorsData.length === 0) {
        const { data: fallbackData } = await supabase
          .from('profiles')
          .select('*');
          
        if (fallbackData) {
          // Kendisi hariç diğer profilleri mentör olarak listele (Fallback)
          mentorsData = user ? fallbackData.filter((p: any) => p.id !== user.id) : fallbackData;
        }
      }

      if (mentorsData) {
        setMentors(mentorsData);
      }
      setLoading(false);
    }
    
    loadData();
  }, [supabase]);

  async function handleRequestMentorship(mentorId: string) {
    if (!currentUser) {
      toast.error('Mentörlük talep etmek için giriş yapmalısınız.');
      return;
    }

    if (currentUser.id === mentorId) {
      toast.error('Kendinize mentörlük talebi gönderemezsiniz.');
      return;
    }

    try {
      // Doğrudan bir aktif session oluşturuyoruz (Demo amaçlı direkt Active yapıyoruz)
      const { data, error } = await supabase
        .from('mentorships')
        .insert({
          mentee_id: currentUser.id,
          mentor_id: mentorId,
          focus_area: 'Genel Mentörlük',
          status: 'Active'
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase Insert Error (mentorships): ", error);
        toast.error(`Kayıt hatası: ${error.message || 'Bilinmeyen hata'}`);
        return;
      }

      toast.success('Mentörlük seansınız başarıyla başlatıldı!');
      
      // Bildirim gönder (Mentöre)
      await supabase.from('notifications').insert({
        user_id: mentorId,
        type: 'new_mentorship_session',
        message: 'Yeni bir mentörlük seansınız başladı!',
        related_entity_id: data.id
      });

      // Seans sayfasına yönlendir
      router.push(`/mentorship/session/${data.id}`);
    } catch (err: any) {
      toast.error('Mentörlük talebi oluşturulurken bir hata meydana geldi.');
      console.error("Catch Block Error: ", err);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mentörlük Vitrini</h1>
          <p className="text-muted-foreground mt-1">Sektör profesyonellerinden kariyeriniz için birebir mentörlük alın.</p>
        </div>
        {activeSessionId && (
          <Button render={<Link href={`/mentorship/session/${activeSessionId}`} />} variant="default">
            Aktif Seansıma Git
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10">Mentörler yükleniyor...</div>
      ) : mentors.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">Şu anda aktif mentör bulunmamaktadır.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentors.map((mentor) => (
            <Card key={mentor.id} className="flex flex-col">
              <CardHeader className="text-center">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarImage src={mentor.avatar_url || `https://ui-avatars.com/api/?name=${mentor.name}`} alt={mentor.name} />
                  <AvatarFallback>{mentor.name?.charAt(0) || 'M'}</AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl">{mentor.name}</CardTitle>
                <CardDescription>{mentor.major || 'Uzman'} {mentor.city ? `- ${mentor.city}` : ''}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <p className="text-sm text-center">{mentor.bio || 'Bu mentör henüz bir biyografi girmemiş.'}</p>
                <div>
                  <p className="text-sm font-semibold mb-2 text-center">İlgi / Uzmanlık Alanları:</p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {mentor.interests && mentor.interests.length > 0 ? mentor.interests.map((exp: string) => (
                      <Badge key={exp} variant="secondary" className="text-xs">{exp}</Badge>
                    )) : (
                      <span className="text-xs text-muted-foreground">Belirtilmemiş</span>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => handleRequestMentorship(mentor.id)}
                >
                  Mentörlük Talep Et
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
