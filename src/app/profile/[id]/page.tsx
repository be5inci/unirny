"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DirectMessageModal } from "@/components/common/DirectMessageModal";
import { User, BookOpen, MapPin, GraduationCap, Star, Award, Heart, MessageSquare, DownloadIcon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { notFound, useParams } from "next/navigation";

export default function PublicProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [user, setUser] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDmOpen, setIsDmOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  
  // MOCK ACTIVITIES (In real app, we would fetch these by filtering by id)
  const mockPosts = [
    { id: '1', content: 'Supabase ile RLS politikalarını yapılandırmak çok eğlenceli.', created_at: new Date().toISOString(), likes_count: 5, comments_count: 1 },
  ];

  const mockHomeworks = [
    { id: '1', title: 'İleri Algoritmalar - Final Özeti', category: 'Ders Notu', file_type: 'PDF', views: 230, downloads: 85, helpful: 45 },
  ];

  const mockEvents = [
    { id: '1', title: 'Açık Kaynak Geliştiricileri Buluşması', date: new Date(Date.now() + 86400000*2).toISOString(), type: 'Buluşma', status: 'Katılımcı' },
  ];

  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    async function fetchProfile() {
      if (!id) return;

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) setCurrentUserId(authUser.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
        
      if (data) {
        setUser(data);
        
        // Fetch projects for this user
        const { data: ownedProjects } = await supabase
          .from('projects')
          .select('*')
          .eq('owner_id', id);
        
        const { data: applications } = await supabase
          .from('project_applications')
          .select('projects(*)')
          .eq('user_id', id)
          .eq('status', 'Approved');
        
        let myProjects = [...(ownedProjects || [])];
        if (applications) {
          const appliedProjects = applications.map(app => app.projects).filter(Boolean);
          myProjects = [...myProjects, ...appliedProjects];
        }
        
        const uniqueProjects = Array.from(new Map(myProjects.map(item => [item.id, item])).values());
        setProjects(uniqueProjects);
      } else {
        // User not found
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    
    fetchProfile();
  }, [id, supabase]);

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

  if (!user) return (
    <div className="p-8 text-center text-muted-foreground">
      <h2 className="text-xl font-semibold mb-2">Kullanıcı Bulunamadı</h2>
      <p>Aradığınız profil mevcut değil veya silinmiş.</p>
    </div>
  );

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Profile Header Card */}
      <Card className="border-none shadow-md overflow-hidden relative">
        <div className="h-32 bg-gradient-to-r from-secondary/80 to-secondary w-full absolute top-0 left-0 z-0"></div>
        
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
                {currentUserId && currentUserId !== user?.id && (
                  <Button onClick={() => setIsDmOpen(true)} className="gap-2 shrink-0">
                    <MessageSquare className="w-4 h-4" />
                    Mesaj Gönder
                  </Button>
                )}
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
                <div className="ml-0 md:ml-auto flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full font-bold border border-amber-500/20 shadow-sm mt-4 md:mt-0">
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
          <TabsTrigger value="posts" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 shadow-none">Gönderiler</TabsTrigger>
          <TabsTrigger value="homeworks" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 shadow-none">Kaynaklar</TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 shadow-none">Etkinlikler</TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 shadow-none">Projeler ({projects.length})</TabsTrigger>
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
            )) : <p className="text-muted-foreground text-center py-8">Kullanıcı henüz gönderi paylaşmamış.</p>}
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
            )) : <p className="text-muted-foreground text-center py-8 col-span-2">Kullanıcı henüz kaynak yüklememiş.</p>}
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
            )) : <p className="text-muted-foreground text-center py-8 col-span-2">Etkinlik geçmişi boş.</p>}
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
            )) : <p className="text-muted-foreground text-center py-8 col-span-2">Herhangi bir projede yer almıyor.</p>}
          </TabsContent>
        </div>
      </Tabs>

      <DirectMessageModal
        isOpen={isDmOpen}
        onClose={() => setIsDmOpen(false)}
        targetUser={user}
      />
    </div>
  );
}
