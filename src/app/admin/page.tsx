"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Calendar as CalendarIcon, 
  MapPin, 
  ExternalLink, 
  Plus, 
  Eye, 
  EyeOff,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showcaseItems, setShowcaseItems] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Form submit states
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);
  const [isSubmittingShowcase, setIsSubmittingShowcase] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [isSubmittingAbout, setIsSubmittingAbout] = useState(false);
  
  const supabase = createClient();
  const isSuperAdmin = profile?.platform_role === 'super_admin' || currentUserRole === 'super_admin';

  // Announcement Form State
  const [newAnnouncement, setNewAnnouncement] = useState({ 
    title: '', 
    content: '', 
    type: 'info', 
    is_active: true 
  });

  // Showcase Item Form State (Neler Yaptık / Vitrin)
  const [newShowcase, setNewShowcase] = useState({
    title: '',
    description: '',
    metric: '',
    link: ''
  });

  // Event Form State (Yaklaşan Etkinlikler)
  const [newEvent, setNewEvent] = useState({
    title: '',
    category: 'Buluşma',
    event_date: '',
    location: '',
    description: ''
  });

  // Hakkımızda Yönetimi Form State (Sadece Super Admin)
  const [aboutForm, setAboutForm] = useState({
    title: '',
    subtitle: '',
    story: '',
    mission: '',
    vision: ''
  });

  // 1. Yetki & Profil Kontrolü
  useEffect(() => {
    async function checkAdminAccess() {
      setIsLoadingProfile(true);
      setAuthError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Admin Auth Check - User ID:', user?.id);

        if (!user) {
          console.log('Admin Auth Check - No active user session found');
          // router.push('/');
          setAuthError('Giriş yapmış aktif bir kullanıcı bulunamadı. Lütfen önce giriş yapın.');
          setIsLoadingProfile(false);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        console.log('Admin Auth Check - Profile Data:', data);
        console.log('Admin Auth Check - Error:', error);

        setProfile(data || null);

        const hasAdminAccess = data?.platform_role === 'admin' || data?.platform_role === 'super_admin';

        if (!hasAdminAccess) {
          // router.push('/');
          setAuthError(`Hata: Rolünüz yetersiz. Gelen rol: ${data?.platform_role || 'Yok / Tanımsız'}`);
          setIsLoadingProfile(false);
          return;
        }

        setCurrentUserRole(data.platform_role);
      } catch (err: any) {
        console.error('Yetki kontrolü hatası:', err);
        // router.push('/');
        setAuthError(`Yetki kontrolünde beklenmeyen hata: ${err?.message}`);
      } finally {
        setIsLoadingProfile(false);
      }
    }

    checkAdminAccess();
  }, [router, supabase]);

  // 2. Admin Verilerini Yükleme
  async function loadData() {
    setLoading(true);
    try {
      const [
        { data: annData },
        { data: showcaseData },
        { data: eventsData },
        { data: usersData },
        { data: projectsData },
        { data: groupsData },
        { data: aboutData }
      ] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at', { ascending: false }),
        supabase.from('showcase_items').select('*').order('created_at', { ascending: false }),
        supabase.from('events').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('groups').select('*').order('created_at', { ascending: false }),
        supabase.from('site_about').select('*').single()
      ]);

      if (annData) setAnnouncements(annData);
      if (showcaseData) setShowcaseItems(showcaseData);
      if (eventsData) setEvents(eventsData);
      if (usersData) setUsers(usersData);
      if (projectsData) setProjects(projectsData);
      if (groupsData) setGroups(groupsData);
      
      if (aboutData) {
        setAboutForm({
          title: aboutData.title || '',
          subtitle: aboutData.subtitle || '',
          story: aboutData.story || aboutData.content || '',
          mission: aboutData.mission || '',
          vision: aboutData.vision || ''
        });
      }
    } catch (err) {
      console.error('Admin verisi yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoadingProfile && profile) {
      loadData();
    }
  }, [isLoadingProfile, profile]);

  // --- 1. Showcase Actions (Neler Yaptık) ---
  const handleCreateShowcase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShowcase.title) {
      toast.error('Lütfen vitrin başlığını girin.');
      return;
    }

    setIsSubmittingShowcase(true);
    try {
      const { error } = await supabase.from('showcase_items').insert([{
        title: newShowcase.title.trim(),
        description: newShowcase.description.trim() || null,
        metric: newShowcase.metric.trim() || null,
        link: newShowcase.link.trim() || null
      }]);

      if (error) {
        toast.error('Vitrin öğesi eklenemedi: ' + error.message);
      } else {
        toast.success('Vitrin içeriği başarıyla eklendi.');
        setNewShowcase({ title: '', description: '', metric: '', link: '' });
        loadData();
      }
    } catch (err: any) {
      toast.error('Hata oluştu: ' + (err?.message || 'Bilinmeyen hata'));
    } finally {
      setIsSubmittingShowcase(false);
    }
  };

  const handleDeleteShowcase = async (id: string) => {
    if (!confirm('Bu vitrin içeriğini silmek istediğinize emin misiniz?')) return;
    setActionLoadingId(id);
    const { error } = await supabase.from('showcase_items').delete().eq('id', id);
    if (error) {
      toast.error('Silinirken hata oluştu: ' + error.message);
    } else {
      toast.success('Vitrin içeriği silindi.');
      loadData();
    }
    setActionLoadingId(null);
  };

  // --- 2. Announcements Actions ---
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast.error('Lütfen başlık ve içerik girin.');
      return;
    }

    setIsSubmittingAnnouncement(true);
    try {
      const { error } = await supabase.from('announcements').insert([{
        title: newAnnouncement.title.trim(),
        content: newAnnouncement.content.trim(),
        type: newAnnouncement.type || 'info',
        is_active: newAnnouncement.is_active
      }]);

      if (error) {
        toast.error('Duyuru eklenemedi: ' + error.message);
      } else {
        toast.success('Duyuru yayınlandı.');
        setNewAnnouncement({ title: '', content: '', type: 'info', is_active: true });
        loadData();
      }
    } catch (err: any) {
      toast.error('Hata oluştu: ' + (err?.message || 'Bilinmeyen hata'));
    } finally {
      setIsSubmittingAnnouncement(false);
    }
  };

  const handleToggleAnnouncementActive = async (id: string, currentActive: boolean) => {
    setActionLoadingId(id);
    const { error } = await supabase.from('announcements').update({ is_active: !currentActive }).eq('id', id);
    if (error) {
      toast.error('Duyuru durumu güncellenemedi: ' + error.message);
    } else {
      toast.success(!currentActive ? 'Duyuru aktifleştirildi.' : 'Duyuru yayından kaldırıldı.');
      loadData();
    }
    setActionLoadingId(null);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Duyuruyu tamamen silmek istediğinize emin misiniz?')) return;
    setActionLoadingId(id);
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      toast.error('Silinirken hata oluştu: ' + error.message);
    } else {
      toast.success('Duyuru silindi.');
      loadData();
    }
    setActionLoadingId(null);
  };

  // --- 3. Events Actions (Yaklaşan Etkinlikler) ---
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.event_date || !newEvent.location) {
      toast.error('Lütfen başlık, tarih ve konum alanlarını doldurun.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('İşlem için aktif oturum gereklidir.');
      return;
    }

    setIsSubmittingEvent(true);
    try {
      const { error } = await supabase.from('events').insert([{
        creator_id: user.id,
        title: newEvent.title.trim(),
        category: newEvent.category || 'Buluşma',
        event_date: new Date(newEvent.event_date).toISOString(),
        location: newEvent.location.trim(),
        description: newEvent.description.trim() || null
      }]);

      if (error) {
        toast.error('Etkinlik eklenemedi: ' + error.message);
      } else {
        toast.success('Etkinlik başarıyla oluşturuldu.');
        setNewEvent({ title: '', category: 'Buluşma', event_date: '', location: '', description: '' });
        loadData();
      }
    } catch (err: any) {
      toast.error('Hata oluştu: ' + (err?.message || 'Bilinmeyen hata'));
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Bu etkinliği silmek istediğinize emin misiniz?')) return;
    setActionLoadingId(id);
    
    const { error: rpcError } = await supabase.rpc('admin_delete_event', { target_event_id: id });
    if (rpcError) {
      const { error: directError } = await supabase.from('events').delete().eq('id', id);
      if (directError) {
        toast.error('Etkinlik silinemedi: ' + directError.message);
      } else {
        toast.success('Etkinlik silindi.');
        loadData();
      }
    } else {
      toast.success('Etkinlik silindi.');
      loadData();
    }
    setActionLoadingId(null);
  };

  // --- 4. Hakkımızda Yönetimi Actions (Sadece Super Admin) ---
  const handleSaveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      toast.error('Hakkımızda sayfasını yalnızca Süper Yöneticiler düzenleyebilir.');
      return;
    }
    if (!aboutForm.title.trim()) {
      toast.error('Lütfen sayfa başlığını girin.');
      return;
    }

    setIsSubmittingAbout(true);
    try {
      const payload = {
        id: 1,
        title: aboutForm.title.trim(),
        subtitle: aboutForm.subtitle.trim() || null,
        story: aboutForm.story.trim() || null,
        mission: aboutForm.mission.trim() || null,
        vision: aboutForm.vision.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('site_about').upsert(payload, { onConflict: 'id' });
      if (error) {
        toast.error('Güncellenirken hata: ' + error.message);
      } else {
        toast.success('Hakkımızda sayfası başarıyla güncellendi.');
        loadData();
      }
    } catch (err: any) {
      toast.error('Hata oluştu: ' + (err?.message || 'Bilinmeyen hata'));
    } finally {
      setIsSubmittingAbout(false);
    }
  };

  // --- 5. Moderation Actions (Rol Hiyerarşisi: super_admin > admin > user > viewer) ---
  const handleUpdateRole = async (userId: string, newRole: string) => {
    const targetUser = users.find(u => u.id === userId);
    
    // Normal adminler super_admin olan birinin rolünü değiştiremez
    if (targetUser?.platform_role === 'super_admin' && !isSuperAdmin) {
      toast.error('Normal yöneticiler, süper yöneticinin rolünü değiştiremez.');
      return;
    }

    // Normal adminler başka bir kullanıcıyı super_admin yapamaz
    if (newRole === 'super_admin' && !isSuperAdmin) {
      toast.error('Yalnızca süper yöneticiler başka bir kullanıcıya süper yönetici rolü atayabilir.');
      return;
    }

    const { error: rpcError } = await supabase.rpc('admin_update_user_role', { target_id: userId, new_role: newRole });
    if (rpcError) {
      const { error: tableError } = await supabase.from('profiles').update({ platform_role: newRole }).eq('id', userId);
      if (tableError) {
        toast.error('Rol güncellenemedi: ' + tableError.message);
        return;
      }
    }
    toast.success('Kullanıcı rolü güncellendi.');
    loadData();
  };

  // --- 5.1. Delete User (Sadece Super Admin) ---
  const handleDeleteUser = async (userToDelete: any) => {
    if (!isSuperAdmin) {
      toast.error('Bu işlemi yalnızca Süper Yöneticiler yapabilir.');
      return;
    }

    if (userToDelete.id === profile?.id) {
      toast.error('Kendi hesabınızı silemezsiniz.');
      return;
    }

    const confirmed = window.confirm("Bu kullanıcıyı ve tüm verilerini kalıcı olarak silmek istediğinize emin misiniz?");
    if (!confirmed) return;

    setActionLoadingId(userToDelete.id);
    try {
      const { error } = await supabase.rpc('super_admin_delete_user', {
        target_user_id: userToDelete.id
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Kullanıcı başarıyla silindi.');
        loadData();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Bilinmeyen bir hata oluştu.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Bu projeyi tamamen silmek istediğinize emin misiniz?')) return;
    
    const { error } = await supabase.rpc('admin_delete_project', { target_id: projectId });
    if (error) {
      toast.error('Proje silinemedi: ' + error.message);
    } else {
      toast.success('Proje silindi.');
      loadData();
    }
  };

  // --- 6. Groups / Communities Actions ---
  const handleUpdateGroupStatus = async (groupId: string, status: 'approved' | 'rejected') => {
    setActionLoadingId(groupId);
    const { error } = await supabase.from('groups').update({ status }).eq('id', groupId);
    if (error) {
      toast.error('Topluluk durumu güncellenemedi: ' + error.message);
    } else {
      toast.success(status === 'approved' ? 'Topluluk onaylandı.' : 'Topluluk reddedildi.');
      loadData();
    }
    setActionLoadingId(null);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Bu topluluğu tamamen silmek istediğinize emin misiniz?')) return;
    setActionLoadingId(groupId);
    const { error } = await supabase.from('groups').delete().eq('id', groupId);
    if (error) {
      toast.error('Topluluk silinemedi: ' + error.message);
    } else {
      toast.success('Topluluk silindi.');
      loadData();
    }
    setActionLoadingId(null);
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Yetki kontrol ediliyor...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="bg-destructive/15 border-2 border-destructive text-destructive dark:text-red-400 p-6 rounded-xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-lg">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <span>Erişim Engellendi</span>
          </div>
          <p className="font-semibold text-base">
            {authError}
          </p>
          <p className="text-xs text-muted-foreground">
            Tarayıcı konsolunu (F12 -&gt; Console) açarak 'Admin Auth Check' loglarını inceleyebilirsiniz.
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Profil yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Yönetici Paneli</h1>
            {isSuperAdmin && (
              <Badge className="bg-purple-600 text-white flex items-center gap-1 font-semibold">
                <Sparkles className="w-3 h-3" />
                Süper Yönetici
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Platform içeriklerini yönetin, kullanıcı yetkilerini düzenleyin ve topluluk başvurularını değerlendirin.
          </p>
        </div>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className={`grid w-full ${isSuperAdmin ? 'max-w-3xl grid-cols-4' : 'max-w-2xl grid-cols-3'}`}>
          <TabsTrigger value="content">Vitrin & İçerik Yönetimi</TabsTrigger>
          <TabsTrigger value="moderation">Üye & Moderasyon</TabsTrigger>
          <TabsTrigger value="communities">Topluluklar ({groups.filter(g => g.status === 'pending').length} Bekleyen)</TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="about" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white font-medium">
              Hakkımızda Yönetimi
            </TabsTrigger>
          )}
        </TabsList>
        
        {/* ======================================================== */}
        {/* 1. VİTRİN & İÇERİK YÖNETİMİ SEKMESİ                     */}
        {/* ======================================================== */}
        <TabsContent value="content" className="mt-6 space-y-8">
          <Tabs defaultValue="showcase" className="w-full">
            <TabsList className="grid w-full max-w-xl grid-cols-3 bg-muted/60">
              <TabsTrigger value="showcase">Neler Yaptık / Vitrin</TabsTrigger>
              <TabsTrigger value="announcements">Duyurular Panosu</TabsTrigger>
              <TabsTrigger value="events">Yaklaşan Etkinlikler</TabsTrigger>
            </TabsList>

            {/* --- 1.1 NELER YAPTIK / VİTRİN --- */}
            <TabsContent value="showcase" className="mt-6 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Yeni Vitrin İçeriği Ekle</CardTitle>
                  <CardDescription>
                    Ana sayfa 'Neler Yaptık?' bölümünde listelenecek başarı ve proje kartı oluşturun.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateShowcase} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Başlık *</label>
                        <Input 
                          placeholder="Örn: Hackathon & Ideathon" 
                          value={newShowcase.title}
                          onChange={(e) => setNewShowcase({...newShowcase, title: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Metrik / Başarı Göstergesi</label>
                        <Input 
                          placeholder="Örn: 50+ Öğrenci veya 12+ Proje" 
                          value={newShowcase.metric}
                          onChange={(e) => setNewShowcase({...newShowcase, metric: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Yönlendirme Linki (Opsiyonel)</label>
                      <Input 
                        placeholder="Örn: /projects veya /about" 
                        value={newShowcase.link}
                        onChange={(e) => setNewShowcase({...newShowcase, link: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Açıklama</label>
                      <Textarea 
                        placeholder="Öğrencilerin bir araya gelerek yenilikçi projeler ürettiği dönemsel fikir ve kodlama maratonları..."
                        value={newShowcase.description}
                        onChange={(e) => setNewShowcase({...newShowcase, description: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <Button type="submit" disabled={isSubmittingShowcase}>
                      {isSubmittingShowcase ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Kaydediliyor...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Vitrine Ekle
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Vitrin Listesi */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Mevcut Vitrin İçerikleri ({showcaseItems.length})</h3>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                ) : showcaseItems.length === 0 ? (
                  <Card className="p-8 text-center border-dashed">
                    <p className="text-sm text-muted-foreground">Henüz vitrin içeriği eklenmedi.</p>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {showcaseItems.map((item) => (
                      <Card key={item.id} className="flex flex-col justify-between p-4 hover:shadow-sm transition-shadow">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-base">{item.title}</h4>
                            {item.metric && (
                              <Badge variant="secondary" className="font-bold text-primary bg-primary/10 shrink-0">
                                {item.metric}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {item.description}
                            </p>
                          )}
                          {item.link && (
                            <div className="text-xs text-primary flex items-center gap-1 mb-2 font-medium">
                              <ExternalLink className="w-3 h-3" />
                              <span className="truncate">{item.link}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end pt-2 border-t mt-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2.5 text-xs flex items-center gap-1"
                            disabled={actionLoadingId === item.id}
                            onClick={() => handleDeleteShowcase(item.id)}
                          >
                            {actionLoadingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Vitrin Öğesini Sil
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* --- 1.2 DUYURULAR PANOSU --- */}
            <TabsContent value="announcements" className="mt-6 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Yeni Duyuru Ekle</CardTitle>
                  <CardDescription>
                    Ana sayfada ve bildirim alanlarında görüntülenecek yeni bir duyuru yayınlayın.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Duyuru Başlığı *</label>
                      <Input 
                        placeholder="Örn: 2026 Güz Dönemi Başvuruları Başladı" 
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">İçerik *</label>
                      <Textarea 
                        placeholder="Duyuru detayları ve açıklama..."
                        value={newAnnouncement.content}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                        rows={3}
                        required
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tür (Öncelik)</label>
                        <Select 
                          value={newAnnouncement.type} 
                          onValueChange={(v) => setNewAnnouncement({...newAnnouncement, type: v || 'info'})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">Bilgi (Mavi/Standart)</SelectItem>
                            <SelectItem value="warning">Uyarı (Kırmızı/Destructive)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Yayın Durumu</label>
                        <Select 
                          value={newAnnouncement.is_active ? 'active' : 'inactive'} 
                          onValueChange={(v) => setNewAnnouncement({...newAnnouncement, is_active: v === 'active'})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Aktif (Ana Sayfada Göster)</SelectItem>
                            <SelectItem value="inactive">Pasif (Gizli Tut)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button type="submit" disabled={isSubmittingAnnouncement}>
                      {isSubmittingAnnouncement ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Yayınlanıyor...
                        </>
                      ) : (
                        'Duyuruyu Yayınla'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Duyurular Listesi */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Mevcut Duyurular ({announcements.length})</h3>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                ) : announcements.length === 0 ? (
                  <Card className="p-8 text-center border-dashed">
                    <p className="text-sm text-muted-foreground">Aktif duyuru bulunmuyor.</p>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {announcements.map((ann) => (
                      <Card key={ann.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant={ann.type === 'warning' ? 'destructive' : 'secondary'}>
                              {ann.type === 'warning' ? 'Uyarı' : 'Bilgi'}
                            </Badge>
                            {ann.is_active === false ? (
                              <Badge variant="outline" className="text-muted-foreground">Pasif</Badge>
                            ) : (
                              <Badge className="bg-emerald-600 text-white">Yayında</Badge>
                            )}
                            <h4 className="font-semibold">{ann.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">{ann.content}</p>
                          <span className="text-xs text-muted-foreground block pt-1">
                            {new Date(ann.created_at).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs flex items-center gap-1"
                            disabled={actionLoadingId === ann.id}
                            onClick={() => handleToggleAnnouncementActive(ann.id, ann.is_active !== false)}
                          >
                            {ann.is_active === false ? (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                Aktifleştir
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                Gizle
                              </>
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            disabled={actionLoadingId === ann.id}
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* --- 1.3 YAKLAŞAN ETKİNLİKLER --- */}
            <TabsContent value="events" className="mt-6 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Yeni Etkinlik Ekle</CardTitle>
                  <CardDescription>
                    Ana sayfada ve etkinlikler sayfasında görünecek resmi bir organizasyon planlayın.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateEvent} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Etkinlik Başlığı *</label>
                        <Input 
                          placeholder="Örn: Açık Kaynak Geliştiricileri Zirvesi" 
                          value={newEvent.title}
                          onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Kategori</label>
                        <Select 
                          value={newEvent.category} 
                          onValueChange={(v) => setNewEvent({...newEvent, category: v || 'Buluşma'})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Buluşma">Buluşma</SelectItem>
                            <SelectItem value="Atölye">Atölye</SelectItem>
                            <SelectItem value="Seminer">Seminer</SelectItem>
                            <SelectItem value="Hackathon">Hackathon</SelectItem>
                            <SelectItem value="Spor">Spor</SelectItem>
                            <SelectItem value="Diğer">Diğer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tarih & Saat *</label>
                        <Input 
                          type="datetime-local" 
                          value={newEvent.event_date}
                          onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Konum *</label>
                        <Input 
                          placeholder="Örn: ODTÜ Teknokent veya Online (Google Meet)" 
                          value={newEvent.location}
                          onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Açıklama</label>
                      <Textarea 
                        placeholder="Etkinliğin kapsamı, katılımcı beklentisi ve detaylar..."
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <Button type="submit" disabled={isSubmittingEvent}>
                      {isSubmittingEvent ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Oluşturuluyor...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Etkinliği Kaydet
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Etkinlikler Listesi */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Mevcut Etkinlikler ({events.length})</h3>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                ) : events.length === 0 ? (
                  <Card className="p-8 text-center border-dashed">
                    <p className="text-sm text-muted-foreground">Kayıtlı etkinlik bulunmuyor.</p>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {events.map((ev) => (
                      <Card key={ev.id} className="flex flex-col justify-between p-4 hover:shadow-sm transition-shadow">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-base">{ev.title}</h4>
                            <Badge variant="outline">{ev.category || 'Genel'}</Badge>
                          </div>
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground mb-3">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                              {new Date(ev.event_date || ev.date || ev.created_at).toLocaleString('tr-TR', { 
                                day: 'numeric', 
                                month: 'long', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            {ev.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                {ev.location}
                              </span>
                            )}
                          </div>
                          {ev.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{ev.description}</p>
                          )}
                        </div>
                        <div className="flex justify-end pt-2 border-t mt-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2.5 text-xs flex items-center gap-1"
                            disabled={actionLoadingId === ev.id}
                            onClick={() => handleDeleteEvent(ev.id)}
                          >
                            {actionLoadingId === ev.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Etkinliği Sil
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ======================================================== */}
        {/* 2. ÜYE & MODERASYON SEKMESİ                              */}
        {/* ======================================================== */}
        <TabsContent value="moderation" className="mt-6 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Üye Rol Yönetimi</CardTitle>
              <CardDescription>
                Rol Hiyerarşisi: Süper Yönetici (super_admin) &gt; Yönetici (admin) &gt; Standart Kullanıcı (user) &gt; İzleyici (viewer).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <p>Yükleniyor...</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3">Kullanıcı (Name)</th>
                        <th className="p-3">Purpose / Skills</th>
                        <th className="p-3">Mevcut Rol</th>
                        <th className="p-3 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => {
                        const isTargetSuperAdmin = u.platform_role === 'super_admin';
                        const cannotModify = isTargetSuperAdmin && !isSuperAdmin;

                        return (
                          <tr key={u.id} className="border-b">
                            <td className="p-3 font-medium flex items-center gap-2">
                              {u.name || 'İsimsiz'}
                              {isTargetSuperAdmin && (
                                <span title="Süper Yönetici">
                                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground truncate max-w-[200px]">{u.purpose} - {u.skills?.join(', ')}</td>
                            <td className="p-3">
                              <Badge 
                                variant={
                                  u.platform_role === 'super_admin'
                                    ? 'default'
                                    : u.platform_role === 'admin' 
                                    ? 'destructive' 
                                    : u.platform_role === 'viewer' 
                                    ? 'outline' 
                                    : 'secondary'
                                }
                                className={
                                  u.platform_role === 'super_admin'
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white font-semibold'
                                    : u.platform_role === 'viewer' 
                                    ? 'border-amber-500 text-amber-600 dark:text-amber-400' 
                                    : ''
                                }
                              >
                                {u.platform_role === 'super_admin'
                                  ? 'Süper Yönetici'
                                  : u.platform_role === 'admin' 
                                  ? 'Yönetici' 
                                  : u.platform_role === 'viewer' 
                                  ? 'İzleyici' 
                                  : 'Standart Kullanıcı'}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {cannotModify ? (
                                  <span className="text-xs text-muted-foreground font-medium italic flex items-center justify-end gap-1">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    Kilitli (Super Admin)
                                  </span>
                                ) : (
                                  <Select 
                                    value={
                                      u.platform_role === 'super_admin' 
                                        ? 'super_admin' 
                                        : u.platform_role === 'admin' 
                                        ? 'admin' 
                                        : u.platform_role === 'viewer' 
                                        ? 'viewer' 
                                        : 'user'
                                    } 
                                    onValueChange={(val) => handleUpdateRole(u.id || '', val || 'user')}
                                  >
                                    <SelectTrigger className="w-[190px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {isSuperAdmin && (
                                        <SelectItem value="super_admin">Süper Yönetici (Super Admin)</SelectItem>
                                      )}
                                      <SelectItem value="admin">Yönetici (Admin)</SelectItem>
                                      <SelectItem value="user">Standart Kullanıcı</SelectItem>
                                      <SelectItem value="viewer">İzleyici (Viewer)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}

                                {isSuperAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                                    disabled={u.id === profile?.id || actionLoadingId === u.id}
                                    onClick={() => handleDeleteUser(u)}
                                    title={u.id === profile?.id ? "Kendi hesabınızı silemezsiniz" : "Kullanıcıyı Sil"}
                                  >
                                    {actionLoadingId === u.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Proje Moderasyonu</CardTitle>
              <CardDescription>Sistemdeki tüm projeleri inceleyebilir ve uygunsuz olanları silebilirsiniz.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <p>Yükleniyor...</p> : projects.length === 0 ? <p>Proje bulunmuyor.</p> : (
                <div className="grid md:grid-cols-2 gap-4">
                  {projects.map(p => (
                    <Card key={p.id} className="border-red-100 dark:border-red-900/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{p.title}</CardTitle>
                        <CardDescription className="line-clamp-1">{p.summary}</CardDescription>
                      </CardHeader>
                      <CardFooter className="pt-2 justify-end">
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteProject(p.id)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Projeyi Sil
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* 3. TOPLULUKLAR SEKMESİ                                   */}
        {/* ======================================================== */}
        <TabsContent value="communities" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Topluluk Onay & Moderasyon</CardTitle>
              <CardDescription>
                Kullanıcıların başvurduğu yeni toplulukları inceleyin, onaylayın (status: approved) veya reddedin (status: rejected).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Yükleniyor...</p>
              ) : groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz kayıtlı topluluk bulunmuyor.</p>
              ) : (
                <div className="grid gap-4">
                  {groups.map((group) => {
                    const isPending = group.status === 'pending';
                    const isApproved = group.status === 'approved' || !group.status;
                    const isRejected = group.status === 'rejected';

                    return (
                      <Card key={group.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{group.name}</h3>
                            <Badge variant="outline">{group.category}</Badge>
                            {isPending ? (
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Onay Bekliyor</Badge>
                            ) : isRejected ? (
                              <Badge variant="destructive">Reddedildi</Badge>
                            ) : (
                              <Badge className="bg-emerald-600 text-white">Onaylandı</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">({group.members_count || 0} Üye)</span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
                          <Button
                            size="sm"
                            disabled={actionLoadingId === group.id || isApproved}
                            onClick={() => handleUpdateGroupStatus(group.id, 'approved')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                          >
                            {actionLoadingId === group.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            )}
                            Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoadingId === group.id || isRejected}
                            onClick={() => handleUpdateGroupStatus(group.id, 'rejected')}
                            className="text-destructive border-destructive hover:bg-destructive/10 disabled:opacity-50"
                          >
                            {actionLoadingId === group.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                            )}
                            Reddet
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={actionLoadingId === group.id}
                            onClick={() => handleDeleteGroup(group.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* 4. HAKKIMIZDA YÖNETİMİ SEKMESİ (SADECE SUPER ADMIN)      */}
        {/* ======================================================== */}
        {isSuperAdmin && (
          <TabsContent value="about" className="mt-6 space-y-6">
            <Card className="border-purple-200 dark:border-purple-900/40">
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-purple-600 text-white flex items-center gap-1 font-semibold">
                    <Sparkles className="w-3 h-3" />
                    Süper Yönetici Yetkisi
                  </Badge>
                </div>
                <CardTitle className="text-xl">Hakkımızda Sayfası İçerik Yönetimi</CardTitle>
                <CardDescription>
                  Bu form üzerinden yapılan düzenlemeler doğrudan /about sayfasında yayınlanır. Bu alana yalnızca 'super_admin' rolüne sahip kullanıcılar erişebilir.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveAbout} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sayfa Ana Başlığı *</label>
                    <Input 
                      placeholder="Örn: Hakkımızda" 
                      value={aboutForm.title}
                      onChange={(e) => setAboutForm({ ...aboutForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Alt Başlık (Hero Özeti)</label>
                    <Textarea 
                      placeholder="unirny, üniversite öğrencilerinin fikirlerini projelere dönüştürdüğü..."
                      value={aboutForm.subtitle}
                      onChange={(e) => setAboutForm({ ...aboutForm, subtitle: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Biz Kimiz & Hikayemiz</label>
                    <Textarea 
                      placeholder="Platformun kuruluş hikayesi, amacı ve ekosisteme katkıları..."
                      value={aboutForm.story}
                      onChange={(e) => setAboutForm({ ...aboutForm, story: e.target.value })}
                      rows={5}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Misyonumuz</label>
                      <Textarea 
                        placeholder="Akademik sınırların ötesine geçerek öğrencileri pratik projeler etrafında birleştirmek..."
                        value={aboutForm.mission}
                        onChange={(e) => setAboutForm({ ...aboutForm, mission: e.target.value })}
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Vizyonumuz</label>
                      <Textarea 
                        placeholder="Start-up kültürünü kampüse taşıyan global standartlarda bir yetenek platformu olmak..."
                        value={aboutForm.vision}
                        onChange={(e) => setAboutForm({ ...aboutForm, vision: e.target.value })}
                        rows={4}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={isSubmittingAbout} className="bg-purple-600 hover:bg-purple-700 text-white font-medium">
                    {isSubmittingAbout ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Kaydediliyor...
                      </>
                    ) : (
                      'Hakkımızda Sayfasını Güncelle'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
