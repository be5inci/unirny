"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, MapPin, Users, CheckCircle, Trash2, CreditCard, MessageSquare, QrCode, CalendarPlus, ChevronDown, ChevronUp, Check, X as XIcon, Send, Settings2, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchTitle, setSearchTitle] = useState('');

  // Create Modal
  const [openCreate, setOpenCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Buluşma',
    description: '',
    location: '',
    event_date: '',
    quota: '',
    target_budget: '',
    cost_per_person: '',
    iban: '',
    iban_name: ''
  });

  // Contribution Modal
  const [contribOpen, setContribOpen] = useState(false);
  const [contribEvent, setContribEvent] = useState<any>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribNote, setContribNote] = useState('');

  // QR Modal
  const [qrOpen, setQrOpen] = useState(false);
  const [qrEvent, setQrEvent] = useState<any>(null);

  // Comments State
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  
  // Organizer Panel Toggles
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [filterCategory, searchTitle]);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: profile } = await supabase.from('profiles').select('platform_role').eq('id', user.id).single();
      if (profile?.platform_role === 'admin') setIsAdmin(true);
    }

    let query = supabase.from('events').select('*').order('event_date', { ascending: true });
    
    if (filterCategory && filterCategory !== 'All') {
      query = query.eq('category', filterCategory);
    }
    if (searchTitle) {
      query = query.ilike('title', `%${searchTitle}%`);
    }

    const { data: eventsData } = await query;

    if (!eventsData || eventsData.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const eventIds = eventsData.map(e => e.id);

    // Get Data
    const { data: participantsData } = await supabase.from('event_participants').select('*').in('event_id', eventIds);
    const { data: contribsData } = await supabase.from('event_contributions').select('*').in('event_id', eventIds).order('created_at', { ascending: false });
    const { data: commentsData } = await supabase.from('event_comments').select('*').in('event_id', eventIds).order('created_at', { ascending: true });

    // Collect user ids for profiles
    const userIds = new Set<string>();
    eventsData.forEach(e => userIds.add(e.creator_id));
    participantsData?.forEach(p => userIds.add(p.user_id));
    contribsData?.forEach(c => userIds.add(c.user_id));
    commentsData?.forEach(c => userIds.add(c.author_id));

    const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', Array.from(userIds));

    const enrichedEvents = eventsData.map(event => {
      const eventParts = participantsData?.filter(p => p.event_id === event.id) || [];
      const hasRsvp = user ? eventParts.some(p => p.user_id === user.id) : false;
      const participants = eventParts.map(p => profiles?.find(prof => prof.id === p.user_id));

      const eventContribs = contribsData?.filter(c => c.event_id === event.id).map(c => ({
        ...c,
        user: profiles?.find(prof => prof.id === c.user_id)
      })) || [];
      
      const approvedContribs = eventContribs.filter(c => c.status === 'approved');
      const totalCollected = approvedContribs.reduce((sum, c) => sum + c.amount, 0);

      const eventComments = commentsData?.filter(c => c.event_id === event.id).map(c => ({
        ...c,
        author: profiles?.find(prof => prof.id === c.author_id)
      })) || [];

      return {
        ...event,
        creator: profiles?.find(p => p.id === event.creator_id),
        participants,
        hasRsvp,
        totalCollected,
        allContribs: eventContribs,
        comments: eventComments
      };
    });

    setEvents(enrichedEvents);
    setLoading(false);
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    if (!user) return toast.error('Etkinlik oluşturmak için giriş yapmalısınız.');
    if (!formData.title || !formData.location || !formData.event_date) return toast.error('Zorunlu alanları doldurun.');

    setIsCreating(true);
    try {
      const newEvent = {
        creator_id: user.id,
        title: formData.title,
        category: formData.category,
        description: formData.description,
        location: formData.location,
        event_date: new Date(formData.event_date).toISOString(),
        quota: formData.quota ? parseInt(formData.quota) : null,
        target_budget: formData.target_budget ? parseInt(formData.target_budget) : 0,
        cost_per_person: formData.cost_per_person ? parseInt(formData.cost_per_person) : 0,
        iban: formData.iban,
        iban_name: formData.iban_name
      };

      const { error } = await supabase.from('events').insert(newEvent);
      if (error) {
        toast.error('Oluşturulamadı: ' + error.message);
      } else {
        toast.success('Etkinlik oluşturuldu!');
        setOpenCreate(false);
        setFormData({ title: '', category: 'Buluşma', description: '', location: '', event_date: '', quota: '', target_budget: '', cost_per_person: '', iban: '', iban_name: '' });
        loadData();
      }
    } catch (err: any) {
      console.error('Etkinlik oluşturma hatası:', err);
      toast.error('Bir hata oluştu: ' + (err?.message || 'Lütfen tekrar deneyin.'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleRsvpToggle = async (eventId: string, currentlyRsvpd: boolean) => {
    if (!user) return toast.error('Katılım bildirmek için giriş yapmalısınız.');
    if (currentlyRsvpd) {
      await supabase.from('event_participants').delete().match({ event_id: eventId, user_id: user.id });
      toast.success('Katılım iptal edildi.');
    } else {
      await supabase.from('event_participants').insert({ event_id: eventId, user_id: user.id });
      toast.success('Katılım bildirildi! Biletinizi görebilirsiniz.');
    }
    loadData();
  };

  const handleContributionSubmit = async () => {
    if (!user) return;
    const amount = parseInt(contribAmount);
    if (isNaN(amount) || amount <= 0) return toast.error('Geçerli bir tutar girin.');

    const { error } = await supabase.from('event_contributions').insert({
      event_id: contribEvent.id,
      user_id: user.id,
      amount: amount,
      note: contribNote
    });

    if (error) {
      toast.error('Hata oluştu.');
    } else {
      toast.success('Katkı bildirimi gönderildi. Organizatör onayından sonra bütçeye eklenecektir.');
      setContribOpen(false);
      setContribAmount('');
      setContribNote('');
      loadData();
    }
  };

  const handleUpdateContribution = async (contribId: string, newStatus: string) => {
    const { error } = await supabase.from('event_contributions').update({ status: newStatus }).eq('id', contribId);
    if (error) {
      toast.error('Katkı güncellenemedi: ' + error.message);
    } else {
      toast.success(`Katkı ${newStatus === 'approved' ? 'onaylandı' : 'reddedildi'}.`);
      loadData();
    }
  };

  const handleCommentSubmit = async (eventId: string) => {
    if (!user) return toast.error('Yorum yapmak için giriş yapın.');
    const content = newComment[eventId]?.trim();
    if (!content) return;

    const { error } = await supabase.from('event_comments').insert({
      event_id: eventId,
      author_id: user.id,
      content: content
    });

    if (error) {
      toast.error('Yorum eklenemedi.');
    } else {
      setNewComment({ ...newComment, [eventId]: '' });
      loadData();
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Etkinliği silmek istiyor musunuz?')) return;
    if (isAdmin) {
      const { error } = await supabase.rpc('admin_delete_event', { target_event_id: eventId });
      if (error) toast.error('Hata: ' + error.message);
      else { toast.success('Silindi (Admin).'); loadData(); }
    } else {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) toast.error('Hata: ' + error.message);
      else { toast.success('Silindi.'); loadData(); }
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString('tr-TR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
  };

  const getCalendarLink = (event: any) => {
    const start = new Date(event.event_date).toISOString().replace(/-|:|\.\d+/g, '');
    const end = new Date(new Date(event.event_date).getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/-|:|\.\d+/g, ''); // 2 hours later
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${end}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location)}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Etkinlikler & Kitle Fonlama</h1>
          <p className="text-muted-foreground mt-1">Yaklaşan etkinlikleri keşfet veya bütçeli bir organizasyon başlat.</p>
        </div>

        <Dialog open={openCreate} onOpenChange={(open) => { if (!isCreating) setOpenCreate(open); }}>
          <DialogTrigger render={<Button>Yeni Etkinlik Düzenle</Button>} />
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Etkinlik Oluştur</DialogTitle>
              <DialogDescription>Topluluğu bir araya getirecek bir organizasyon planla.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Başlık</label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kategori</label>
                  <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v || 'Buluşma'})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Buluşma">Buluşma</SelectItem>
                      <SelectItem value="Spor">Spor</SelectItem>
                      <SelectItem value="Eğitim/Atölye">Eğitim / Atölye</SelectItem>
                      <SelectItem value="Sinema/Sanat">Sinema / Sanat</SelectItem>
                      <SelectItem value="Gezi">Gezi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tarih ve Saat</label>
                  <Input type="datetime-local" value={formData.event_date} onChange={e => setFormData({...formData, event_date: e.target.value})} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Konum</label>
                  <Input placeholder="Örn: Merkez Kampüs Çimler" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kontenjan (Kişi)</label>
                  <Input type="number" placeholder="Boş bırakılırsa limitsiz" value={formData.quota} onChange={e => setFormData({...formData, quota: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Açıklama</label>
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold text-sm mb-3 text-primary">Kitle Fonlama / Bütçe (Opsiyonel)</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Hedef Bütçe (TL)</label>
                    <Input type="number" value={formData.target_budget} onChange={e => setFormData({...formData, target_budget: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Kişi Başı Katkı (TL)</label>
                    <Input type="number" value={formData.cost_per_person} onChange={e => setFormData({...formData, cost_per_person: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ödeme IBAN</label>
                    <Input placeholder="TR..." value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Alıcı Ad Soyad</label>
                    <Input value={formData.iban_name} onChange={e => setFormData({...formData, iban_name: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="button" variant="ghost" className="mr-2" disabled={isCreating} onClick={() => setOpenCreate(false)}>İptal</Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isCreating ? 'Oluşturuluyor...' : 'Etkinlik Oluştur'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-lg p-4 mb-8 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input 
            placeholder="Etkinlik adına göre ara..." 
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <Select onValueChange={(val) => setFilterCategory(val || "")} value={filterCategory}>
            <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Tüm Kategoriler</SelectItem>
              <SelectItem value="Buluşma">Buluşma</SelectItem>
              <SelectItem value="Spor">Spor</SelectItem>
              <SelectItem value="Eğitim/Atölye">Eğitim / Atölye</SelectItem>
              <SelectItem value="Sinema/Sanat">Sinema / Sanat</SelectItem>
              <SelectItem value="Gezi">Gezi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p>Yükleniyor...</p>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Yaklaşan etkinlik bulunamadı.</h3>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {events.map(event => {
            const isFull = event.quota && event.participants.length >= event.quota;
            const progress = event.target_budget > 0 ? Math.min(Math.round((event.totalCollected / event.target_budget) * 100), 100) : 0;
            const isCreator = user?.id === event.creator_id;
            
            return (
              <Card key={event.id} className="flex flex-col hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/40"></div>
                
                <CardHeader className="pb-3 pl-5 relative group">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline">{event.category}</Badge>
                    
                    <div className="flex items-center gap-2">
                      <a 
                        href={getCalendarLink(event)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Takvime Ekle"
                      >
                        <CalendarPlus className="w-4 h-4" />
                      </a>
                      {(isCreator || isAdmin) && (
                        <button onClick={() => handleDelete(event.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-xl leading-tight">{event.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{event.description || 'Detay yok.'}</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1 pb-3 pl-5 text-sm space-y-3 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>{formatDate(event.event_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 group cursor-pointer">
                    <MapPin className="w-4 h-4 shrink-0 group-hover:text-primary transition-colors" />
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate group-hover:text-primary group-hover:underline transition-colors"
                    >
                      {event.location}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>{event.participants.length} {event.quota ? `/ ${event.quota}` : ''} Katılımcı</span>
                  </div>

                  {event.target_budget > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <div className="flex justify-between text-xs mb-1.5 font-medium">
                        <span>Toplanan: {event.totalCollected} ₺</span>
                        <span>Hedef: {event.target_budget} ₺</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{width: `${progress}%`}}></div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        {event.cost_per_person > 0 ? (
                          <span className="text-xs">Kişi Başı: {event.cost_per_person} ₺</span>
                        ) : <span />}
                        
                        {/* Katkı Yap Butonu */}
                        <Dialog open={contribOpen && contribEvent?.id === event.id} onOpenChange={(val) => { setContribOpen(val); if(val) setContribEvent(event); else setContribEvent(null); }}>
                          <DialogTrigger render={<Button variant="link" size="sm" className="h-auto p-0 text-xs">Katkı Bildir</Button>} />
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Kitle Fonlama Katkısı</DialogTitle>
                              <DialogDescription>
                                İlgili hesaba gönderdiğiniz tutarı sisteme işleyin. Organizatör onayladığında bütçeye yansıyacaktır.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="bg-muted/50 p-3 rounded-md text-sm mb-2 space-y-1">
                              <p><span className="font-semibold">Alıcı:</span> {event.iban_name || 'Belirtilmedi'}</p>
                              <p className="font-mono"><span className="font-semibold font-sans">IBAN:</span> {event.iban || 'Belirtilmedi'}</p>
                            </div>
                            <div className="space-y-4 py-2">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Gönderilen Tutar (TL)</label>
                                <Input type="number" value={contribAmount} onChange={e => setContribAmount(e.target.value)} placeholder="Örn: 100" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Not / Açıklama (Opsiyonel)</label>
                                <Input value={contribNote} onChange={e => setContribNote(e.target.value)} placeholder="Örn: X Bankası hesabından gönderildi" />
                              </div>
                            </div>
                            <div className="flex justify-end pt-2">
                              <Button onClick={handleContributionSubmit}>Bildirimi Gönder</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  )}

                  {/* Organizer Panel (Accordion style) */}
                  {isCreator && event.allContribs.length > 0 && (
                    <div className="mt-4 border rounded-md overflow-hidden">
                      <button 
                        onClick={() => setOpenPanels({...openPanels, [event.id]: !openPanels[event.id]})}
                        className="w-full px-3 py-2 bg-muted/30 hover:bg-muted/50 flex justify-between items-center text-xs font-semibold"
                      >
                        <span className="flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" /> Organizatör Paneli ({event.allContribs.filter((c:any) => c.status === 'pending').length} Onay Bekleyen)</span>
                        {openPanels[event.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      
                      {openPanels[event.id] && (
                        <div className="p-2 space-y-2 max-h-40 overflow-y-auto bg-card">
                          {event.allContribs.map((c: any) => (
                            <div key={c.id} className="flex justify-between items-center text-xs border-b last:border-0 pb-2 last:pb-0">
                              <div>
                                <p className="font-medium">{c.user?.name || 'Bilinmiyor'} <span className="text-muted-foreground font-normal">- {c.amount} ₺</span></p>
                                {c.note && <p className="text-[10px] text-muted-foreground italic mt-0.5">{c.note}</p>}
                                <p className="text-[10px] mt-0.5">Durum: 
                                  <span className={c.status === 'approved' ? 'text-green-500' : c.status === 'rejected' ? 'text-red-500' : 'text-yellow-500'}> {c.status}</span>
                                </p>
                              </div>
                              {c.status === 'pending' && (
                                <div className="flex gap-1 shrink-0">
                                  <Button size="icon" variant="outline" className="w-6 h-6 rounded-full text-green-500 hover:text-green-600 hover:bg-green-50" onClick={() => handleUpdateContribution(c.id, 'approved')}><Check className="w-3 h-3" /></Button>
                                  <Button size="icon" variant="outline" className="w-6 h-6 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleUpdateContribution(c.id, 'rejected')}><XIcon className="w-3 h-3" /></Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Participant Avatars */}
                  {event.participants.length > 0 && (
                    <div className="flex -space-x-2 overflow-hidden pt-2">
                      {event.participants.slice(0, 5).map((p: any, i: number) => (
                        <Avatar key={i} className="inline-block border-2 border-background w-6 h-6">
                          <AvatarImage src={p?.avatar_url || `https://ui-avatars.com/api/?name=${p?.name || 'A'}`} />
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                      ))}
                      {event.participants.length > 5 && (
                        <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium flex items-center justify-center border-2 border-background z-10">
                          +{event.participants.length - 5}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Discussion Wall */}
                  <div className="mt-4 pt-3 border-t">
                    <h5 className="text-xs font-semibold flex items-center gap-1.5 mb-3 text-foreground"><MessageSquare className="w-3.5 h-3.5" /> Etkinlik Duvarı ({event.comments?.length || 0})</h5>
                    
                    <div className="space-y-3 mb-3 max-h-32 overflow-y-auto pr-1">
                      {event.comments?.map((comment: any) => (
                        <div key={comment.id} className="flex gap-2">
                          <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                            <AvatarImage src={comment.author?.avatar_url} />
                            <AvatarFallback>{comment.author?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="bg-muted/50 rounded-lg rounded-tl-none p-2 text-xs flex-1">
                            <p className="font-semibold text-foreground mb-0.5">{comment.author?.name}</p>
                            <p className="text-foreground/80 break-words">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                      {(!event.comments || event.comments.length === 0) && (
                        <p className="text-xs text-muted-foreground italic text-center py-2">İlk mesajı sen gönder!</p>
                      )}
                    </div>

                    <div className="flex gap-2 items-center">
                      <Input 
                        placeholder="Bir şeyler yaz..." 
                        className="h-8 text-xs" 
                        value={newComment[event.id] || ''}
                        onChange={(e) => setNewComment({...newComment, [event.id]: e.target.value})}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCommentSubmit(event.id);
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-primary" onClick={() => handleCommentSubmit(event.id)}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                </CardContent>
                
                <CardFooter className="pt-3 border-t pl-5 flex gap-2">
                  <Button 
                    className="flex-1" 
                    variant={event.hasRsvp ? "secondary" : "default"}
                    disabled={(!event.hasRsvp && isFull) || !user}
                    onClick={() => handleRsvpToggle(event.id, event.hasRsvp)}
                  >
                    {event.hasRsvp ? (
                      <><CheckCircle className="w-4 h-4 mr-2" /> Katılıyorsun</>
                    ) : isFull ? (
                      'Kontenjan Dolu'
                    ) : (
                      'Katılıyorum'
                    )}
                  </Button>
                  
                  {/* QR Ticket Button */}
                  {event.hasRsvp && (
                    <Dialog open={qrOpen && qrEvent?.id === event.id} onOpenChange={(val) => { setQrOpen(val); if(val) setQrEvent(event); else setQrEvent(null); }}>
                      <DialogTrigger
                        render={
                          <Button variant="outline" size="icon" className="shrink-0 text-primary hover:text-primary">
                            <QrCode className="w-5 h-5" />
                          </Button>
                        }
                      />
                      <DialogContent className="sm:max-w-md text-center flex flex-col items-center py-10">
                        <DialogHeader>
                          <DialogTitle className="text-center">{event.title} Bileti</DialogTitle>
                          <DialogDescription className="text-center">
                            Girişte bu QR kodu görevliye okutun.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="bg-white p-4 rounded-xl shadow-sm border mt-4">
                          <QRCodeSVG 
                            value={JSON.stringify({ eventId: event.id, userId: user?.id })} 
                            size={200}
                            bgColor={"#ffffff"}
                            fgColor={"#000000"}
                            level={"Q"}
                          />
                        </div>
                        
                        <p className="text-sm font-medium mt-6 text-foreground">{user?.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">Katılım onaylandı: {formatDate(new Date().toISOString())}</p>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
