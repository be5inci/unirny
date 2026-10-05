"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

const meetupSchema = z.object({
  title: z.string().min(5, { message: 'Başlık en az 5 karakter olmalıdır.' }),
  description: z.string().min(10, { message: 'Açıklama en az 10 karakter olmalıdır.' }),
  city: z.string().min(2, { message: 'Şehir gereklidir.' }),
  date: z.string().min(10, { message: 'Geçerli bir tarih girin.' }),
  location: z.string().min(3, { message: 'Mekan gereklidir.' }),
});

type MeetupFormValues = z.infer<typeof meetupSchema>;

export default function MatchingPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [meetups, setMeetups] = useState<any[]>([]);
  const [myRsvps, setMyRsvps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [cityFilter, setCityFilter] = useState('');
  const [majorFilter, setMajorFilter] = useState('');
  const [uniFilter, setUniFilter] = useState('');

  const [openMeetupModal, setOpenMeetupModal] = useState(false);
  const supabase = createClient();

  const form = useForm<MeetupFormValues>({
    resolver: zodResolver(meetupSchema),
    defaultValues: {
      title: '',
      description: '',
      city: '',
      date: '',
      location: '',
    },
  });

  async function loadData() {
    setLoading(true);
    
    // Profiles
    let query = supabase.from('profiles').select('*');
    if (cityFilter && cityFilter !== 'All') {
      query = query.eq('city', cityFilter);
    }
    const { data: pData } = await query;
    if (pData) {
      let filteredData = pData;
      if (majorFilter) {
        filteredData = filteredData.filter((p: any) => 
          p.major?.toLowerCase().includes(majorFilter.toLowerCase())
        );
      }
      if (uniFilter) {
        filteredData = filteredData.filter((p: any) => 
          p.university?.toLowerCase().includes(uniFilter.toLowerCase())
        );
      }
      setProfiles(filteredData);
    }

    // Meetups
    const { data: mData, error: mError } = await supabase.from('meetups').select('*').order('date', { ascending: true });
    if (mError) console.error("Meetups fetch error:", mError);
    if (mData) {
      const creatorIds = Array.from(new Set(mData.map(m => m.creator_id).filter(Boolean)));
      const { data: profilesData } = await supabase.from('profiles').select('id, name').in('id', creatorIds);
      
      const profileMap = new Map();
      if (profilesData) {
        profilesData.forEach(p => profileMap.set(p.id, p));
      }

      const meetupsWithCreators = mData.map(m => ({
        ...m,
        creator: profileMap.get(m.creator_id) || { name: 'Bilinmiyor' }
      }));
      setMeetups(meetupsWithCreators);
    }

    // RSVPs
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: rsvpData } = await supabase.from('meetup_attendees').select('meetup_id').eq('user_id', user.id);
      if (rsvpData) {
        setMyRsvps(rsvpData.map(r => r.meetup_id));
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [cityFilter, majorFilter, uniFilter, supabase]);

  async function onSubmitMeetup(data: MeetupFormValues) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Lütfen giriş yapın.');
      return;
    }

    const { data: newMeetup, error } = await supabase.from('meetups').insert({
      title: data.title,
      description: data.description,
      city: data.city,
      date: new Date(data.date).toISOString(),
      location: data.location,
      creator_id: user.id
    }).select().single();

    if (error || !newMeetup) {
      toast.error('Buluşma oluşturulamadı.');
    } else {
      // Kurucuyu da RSVP'ye ekle
      await supabase.from('meetup_attendees').insert({
        meetup_id: newMeetup.id,
        user_id: user.id
      });
      toast.success('Buluşma başarıyla oluşturuldu!');
      setOpenMeetupModal(false);
      form.reset();
      loadData();
    }
  }

  async function toggleRsvp(meetupId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Giriş yapmalısınız.');
      return;
    }

    const isAttending = myRsvps.includes(meetupId);
    if (isAttending) {
      const { error } = await supabase.from('meetup_attendees').delete().eq('meetup_id', meetupId).eq('user_id', user.id);
      if (!error) {
        setMyRsvps(prev => prev.filter(id => id !== meetupId));
        toast.info('Buluşmadan ayrıldınız.');
      }
    } else {
      const { error } = await supabase.from('meetup_attendees').insert({ meetup_id: meetupId, user_id: user.id });
      if (!error) {
        setMyRsvps(prev => [...prev, meetupId]);
        toast.success('Buluşmaya katıldınız!');
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Keşfet & Ağ Oluştur</h1>
          <p className="text-muted-foreground mt-1">İlgi alanlarınıza uygun kişileri bulun veya şehrinizdeki buluşmalara katılın.</p>
        </div>
      </div>

      <Tabs defaultValue="profiles" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="profiles">Kişileri Keşfet</TabsTrigger>
          <TabsTrigger value="meetups">Buluşmalar (Meetups)</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles">
          <div className="bg-card border rounded-lg p-4 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input 
              placeholder="Üniversite ara..." 
              value={uniFilter}
              onChange={(e) => setUniFilter(e.target.value)}
            />
            <Input 
              placeholder="Bölüm ara..." 
              value={majorFilter}
              onChange={(e) => setMajorFilter(e.target.value)}
            />
            <Select onValueChange={(val) => setCityFilter(val || "")} value={cityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Şehir Filtresi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Tüm Şehirler</SelectItem>
                <SelectItem value="Ankara">Ankara</SelectItem>
                <SelectItem value="İstanbul">İstanbul</SelectItem>
                <SelectItem value="İzmir">İzmir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p>Yükleniyor...</p>
          ) : profiles.length === 0 ? (
            <p>Eşleşme bulunamadı.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map((profile) => (
                <Card key={profile.id} className="flex flex-col">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={profile.avatar || `https://ui-avatars.com/api/?name=${profile.name}`} alt={profile.name} />
                      <AvatarFallback>{profile.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl">{profile.name}</CardTitle>
                      <CardDescription>{profile.major}</CardDescription>
                      <CardDescription className="text-xs">{profile.university}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="outline">{profile.city}</Badge>
                      <Badge variant="secondary">{profile.purpose}</Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">İlgi Alanları:</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests?.map((interest: string) => (
                          <Badge key={interest} variant="outline" className="bg-primary/5">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button className="w-full" variant="default">Mesaj Gönder</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="meetups">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Şehrinizdeki Buluşmalar</h2>
            <Dialog open={openMeetupModal} onOpenChange={setOpenMeetupModal}>
              <DialogTrigger
                render={
                  <Button>
                    + Yeni Buluşma Organize Et
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Buluşma</DialogTitle>
                  <DialogDescription>Birlikte çalışmak veya kahve içmek için bir etkinlik oluşturun.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitMeetup)} className="space-y-4 py-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Başlık</FormLabel>
                          <FormControl><Input placeholder="Örn: Frontend Kahve Buluşması" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Şehir</FormLabel>
                            <FormControl><Input placeholder="İstanbul" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tarih & Saat</FormLabel>
                            <FormControl><Input type="datetime-local" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mekan / Adres</FormLabel>
                          <FormControl><Input placeholder="Kadıköy Starbucks" {...field} /></FormControl>
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
                          <FormControl><Textarea placeholder="Detaylar..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setOpenMeetupModal(false)}>İptal</Button>
                      <Button type="submit">Buluşmayı Duyur</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <p>Yükleniyor...</p>
          ) : meetups.length === 0 ? (
            <p>Henüz planlanmış bir buluşma yok.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {meetups.map((meetup) => {
                const isAttending = myRsvps.includes(meetup.id);
                return (
                  <Card key={meetup.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline">{new Date(meetup.date).toLocaleString('tr-TR')}</Badge>
                        <Badge>{meetup.city}</Badge>
                      </div>
                      <CardTitle>{meetup.title}</CardTitle>
                      <CardDescription>Oluşturan: {meetup.creator?.name || 'Bilinmiyor'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-4">{meetup.description}</p>
                      <div className="text-sm font-medium">📍 {meetup.location}</div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant={isAttending ? "secondary" : "default"} 
                        className="w-full"
                        onClick={() => toggleRsvp(meetup.id)}
                      >
                        {isAttending ? "Katılıyorsun (İptal Et)" : "Katılacağım (RSVP)"}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
