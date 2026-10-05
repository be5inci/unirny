"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Medal, BookOpen, Calendar, Briefcase, Settings, Edit, MapPin, GraduationCap, Star, Award, Heart, MessageSquare, DownloadIcon } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { toast } from 'sonner';

export default function ProfilePage() {
  const [authUser, setAuthUser] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const supabase = createClient();
  
  const [editForm, setEditForm] = useState({
    faculty: "",
    class_level: "",
    interests: "",
    city: "",
  });
  
  // MOCK ACTIVITIES (In real app, we would fetch these by filtering by owner_id/creator_id)
  const mockPosts = [
    { id: '1', content: 'Bugün veritabanı projesini nihayet bitirdim. Supabase gerçekten çok pratik!', created_at: new Date().toISOString(), likes_count: 12, comments_count: 3 },
    { id: '2', content: 'React Server Components hakkında ne düşünüyorsunuz? Bence harika bir yenilik.', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 8, comments_count: 5 },
  ];

  const mockHomeworks = [
    { id: '1', title: 'Calculus I - Vize Notları', category: 'Ders Notu', file_type: 'PDF', views: 145, downloads: 42, helpful: 12 },
    { id: '2', title: 'Fizik Lab Raporu Örneği', category: 'Rapor', file_type: 'DOCX', views: 89, downloads: 15, helpful: 5 },
  ];

  const mockEvents = [
    { id: '1', title: 'Yapay Zeka Semineri', date: new Date().toISOString(), type: 'Etkinlik', status: 'Kayıtlı' },
    { id: '2', title: 'Bahar Şenliği', date: new Date(Date.now() + 86400000*5).toISOString(), type: 'Festival', status: 'Organizatör' },
  ];

  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      setAuthUser(currentUser);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser?.id)
        .single();
        
      if (data) {
        setUser(data);
        setEditForm({
          faculty: data.faculty || "",
          class_level: data.class_level || "",
          interests: data.interests ? data.interests.join(", ") : (data.skills ? data.skills.join(", ") : ""),
          city: data.city || "",
        });

        // Projeleri çek (Sahibi oldukları)
        const { data: ownedProjects } = await supabase
          .from('projects')
          .select('*')
          .eq('owner_id', currentUser?.id);
        
        // Projeleri çek (Kabul edildikleri başvurular)
        const { data: applications } = await supabase
          .from('project_applications')
          .select('projects(*)')
          .eq('user_id', currentUser?.id)
          .eq('status', 'Approved');
        
        let myProjects = [...(ownedProjects || [])];
        if (applications) {
          const appliedProjects = applications.map(app => app.projects).filter(Boolean);
          myProjects = [...myProjects, ...appliedProjects];
        }
        
        // Tekilleştirme
        const uniqueProjects = Array.from(new Map(myProjects.map(item => [item.id, item])).values());
        setProjects(uniqueProjects);
      }
      setLoading(false);
    }
    
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveProfile = async () => {
    if (!authUser) return;
    
    const updatedData = {
      faculty: editForm.faculty,
      class_level: editForm.class_level,
      city: editForm.city,
      interests: editForm.interests.split(',').map(i => i.trim()).filter(i => i),
      skills: editForm.interests.split(',').map(i => i.trim()).filter(i => i), // fallback for backward compatibility
    };
    
    const { error } = await supabase
      .from('profiles')
      .update(updatedData)
      .eq('id', authUser.id);
      
    if (!error) {
      setUser({ ...user, ...updatedData });
      setIsEditModalOpen(false);
      toast.success('Profil başarıyla güncellendi!');
    } else {
      console.error("Error updating profile:", error);
      toast.error("Profil güncellenirken bir hata oluştu.");
    }
  };

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

  if (!authUser || !user) return <div className="p-8 text-center">Lütfen giriş yapın.</div>;

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Profile Header Card */}
      <Card className="border-none shadow-md overflow-hidden relative">
        {/* Cover Background */}
        <div className="h-32 bg-gradient-to-r from-primary/80 to-primary w-full absolute top-0 left-0 z-0"></div>
        
        <CardContent className="pt-16 pb-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-background shadow-lg bg-background">
                <AvatarImage src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'A'}&size=256&background=random`} />
                <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-1 text-center md:text-left mt-2 md:mt-4 space-y-2">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">{user?.name || 'İsimsiz Kullanıcı'}</h1>
                  <p className="text-muted-foreground font-medium flex items-center justify-center md:justify-start gap-1 mt-1">
                    {user?.major || user?.faculty ? (
                      <><GraduationCap className="w-4 h-4" /> {user?.major || 'Bölüm Belirtilmemiş'} {user?.faculty ? `(${user.faculty})` : ''}</>
                    ) : (
                      'Bölüm bilgisi yok'
                    )}
                  </p>
                </div>
                
                {/* Edit Button */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                  <DialogTrigger render={<Button variant="outline" size="sm" className="shadow-sm"><Edit className="w-4 h-4 mr-2" /> Profili Düzenle</Button>} />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Profilimi Düzenle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Fakülte</label>
                          <Input placeholder="Örn: Mühendislik Fakültesi" value={editForm.faculty} onChange={e => setEditForm({...editForm, faculty: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Şehir</label>
                          <Input placeholder="Örn: İstanbul" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Sınıf</label>
                        <Select value={editForm.class_level} onValueChange={v => setEditForm({...editForm, class_level: v || ''})}>
                          <SelectTrigger><SelectValue placeholder="Sınıf Seçin" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Hazırlık">Hazırlık</SelectItem>
                            <SelectItem value="1. Sınıf">1. Sınıf</SelectItem>
                            <SelectItem value="2. Sınıf">2. Sınıf</SelectItem>
                            <SelectItem value="3. Sınıf">3. Sınıf</SelectItem>
                            <SelectItem value="4. Sınıf">4. Sınıf</SelectItem>
                            <SelectItem value="Yüksek Lisans">Yüksek Lisans</SelectItem>
                            <SelectItem value="Mezun">Mezun</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">İlgi Alanları / Beceriler (Virgülle ayırın)</label>
                        <Input placeholder="React, Yapay Zeka, Müzik..." value={editForm.interests} onChange={e => setEditForm({...editForm, interests: e.target.value})} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>İptal</Button>
                      <Button onClick={handleSaveProfile}>Kaydet</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Badges & Stats */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
                {user?.class_level && (
                  <Badge variant="secondary" className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {user.class_level}</Badge>
                )}
                {user?.city && (
                  <Badge variant="outline" className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {user.city}</Badge>
                )}
                {user?.purpose && (
                  <Badge variant="outline" className="flex items-center gap-1"><User className="w-3 h-3" /> {user.purpose}</Badge>
                )}
                
                {/* Karma Score Badge */}
                <div className="ml-0 md:ml-auto flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full font-bold border border-amber-500/20 shadow-sm mt-4 md:mt-0 transition-transform hover:scale-105">
                  <Award className="w-5 h-5" />
                  Karma: {user?.karma_score || 0}
                </div>
              </div>

              {/* Interests */}
              {(user?.interests || user?.skills) && (user.interests || user.skills).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-3 justify-center md:justify-start">
                  {(user.interests || user.skills).map((interest: string, i: number) => (
                    <Badge key={i} variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 border-0">{interest}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities Tabs */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="posts" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 shadow-none">Gönderilerim</TabsTrigger>
          <TabsTrigger value="homeworks" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 shadow-none">Kaynaklarım</TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 shadow-none">Etkinliklerim</TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 shadow-none">Projelerim ({projects.length})</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="posts" className="space-y-4">
            {mockPosts.length > 0 ? mockPosts.map(post => (
              <Card key={post.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex flex-col gap-3">
                  <p className="text-sm">{post.content}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{new Date(post.created_at).toLocaleDateString('tr-TR')}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {post.likes_count}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {post.comments_count}</span>
                  </div>
                </CardContent>
              </Card>
            )) : <p className="text-muted-foreground text-center py-8">Henüz gönderi paylaşmadınız.</p>}
          </TabsContent>

          <TabsContent value="homeworks" className="grid md:grid-cols-2 gap-4">
            {mockHomeworks.length > 0 ? mockHomeworks.map(hw => (
              <Card key={hw.id} className="hover:shadow-md transition-all">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline">{hw.category}</Badge>
                    <Badge variant="secondary">{hw.file_type}</Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">{hw.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="flex justify-between text-xs text-muted-foreground border-t pt-3 mt-2">
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-500" /> {hw.helpful} Faydalı</span>
                    <span className="flex items-center gap-1"><DownloadIcon className="w-3.5 h-3.5" /> {hw.downloads} İndirme</span>
                  </div>
                </CardContent>
              </Card>
            )) : <p className="text-muted-foreground text-center py-8 col-span-2">Henüz kaynak yüklemediniz.</p>}
          </TabsContent>

          <TabsContent value="events" className="grid md:grid-cols-2 gap-4">
            {mockEvents.length > 0 ? mockEvents.map(event => (
              <Card key={event.id}>
                <CardHeader className="p-4">
                  <div className="flex justify-between items-center mb-1">
                    <Badge variant={event.status === 'Organizatör' ? 'default' : 'secondary'}>{event.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <CardTitle className="text-md">{event.title}</CardTitle>
                  <CardDescription>{event.type}</CardDescription>
                </CardHeader>
              </Card>
            )) : <p className="text-muted-foreground text-center py-8 col-span-2">Etkinlik geçmişiniz boş.</p>}
          </TabsContent>

          <TabsContent value="projects" className="grid md:grid-cols-2 gap-4">
            {projects.length > 0 ? projects.map(proj => (
              <Card key={proj.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => window.location.href = `/projects/${proj.id}`}>
                <CardHeader className="p-4">
                  <div className="flex justify-between items-center mb-1">
                    <Badge variant="outline">{proj.status === 'Open' ? 'Alıma Açık' : 'Alıma Kapalı'}</Badge>
                  </div>
                  <CardTitle className="text-md">{proj.title}</CardTitle>
                  <CardDescription className="font-medium text-primary line-clamp-1">
                    {proj.owner_id === user?.id ? 'Proje Sahibi' : 'Takım Üyesi'}
                  </CardDescription>
                </CardHeader>
              </Card>
            )) : <p className="text-muted-foreground text-center py-8 col-span-2">Herhangi bir projede yer almıyorsunuz.</p>}
          </TabsContent>
        </div>
      </Tabs>

    </div>
  );
}
