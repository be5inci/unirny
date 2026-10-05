"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

export default function AdminPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  // Announcement Form State
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', type: 'info' });

  async function loadData() {
    setLoading(true);
    
    // Fetch Announcements
    const { data: annData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (annData) setAnnouncements(annData);

    // Fetch Users
    const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (usersData) setUsers(usersData);

    // Fetch Projects
    const { data: projectsData } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (projectsData) setProjects(projectsData);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [supabase]);

  // --- Announcements Actions ---
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast.error('Lütfen başlık ve içerik girin.');
      return;
    }
    const { error } = await supabase.from('announcements').insert([newAnnouncement]);
    if (error) {
      toast.error('Duyuru eklenemedi: ' + error.message);
    } else {
      toast.success('Duyuru eklendi.');
      setNewAnnouncement({ title: '', content: '', type: 'info' });
      loadData();
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      toast.error('Silinirken hata oluştu: ' + error.message);
    } else {
      toast.success('Duyuru silindi.');
      loadData();
    }
  };

  // --- Moderation Actions ---
  const handleUpdateRole = async (userId: string, newRole: string) => {
    // SECURITY DEFINER fonksiyonunu çağır (RPC)
    const { error } = await supabase.rpc('admin_update_user_role', { target_id: userId, new_role: newRole });
    if (error) {
      toast.error('Rol güncellenemedi: ' + error.message);
    } else {
      toast.success('Kullanıcı rolü güncellendi.');
      loadData();
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Bu projeyi tamamen silmek istediğinize emin misiniz?')) return;
    
    // SECURITY DEFINER fonksiyonunu çağır (RPC)
    const { error } = await supabase.rpc('admin_delete_project', { target_id: projectId });
    if (error) {
      toast.error('Proje silinemedi: ' + error.message);
    } else {
      toast.success('Proje silindi.');
      loadData();
    }
  };

  return (
    <Tabs defaultValue="announcements" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="announcements">Duyurular</TabsTrigger>
        <TabsTrigger value="moderation">Üye & Moderasyon</TabsTrigger>
      </TabsList>
      
      {/* DUYURULAR SEKMESİ */}
      <TabsContent value="announcements" className="mt-6 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Yeni Duyuru Ekle</CardTitle>
            <CardDescription>Site genelinde (ana sayfada) görünecek yeni bir duyuru yayınlayın.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Duyuru Başlığı</label>
                <Input 
                  placeholder="Örn: Sistem Bakımı" 
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">İçerik</label>
                <Textarea 
                  placeholder="Duyuru detayı..."
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tür (Öncelik)</label>
                <Select value={newAnnouncement.type} onValueChange={(v) => setNewAnnouncement({...newAnnouncement, type: v || 'info'})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Bilgi (Mavi/Standart)</SelectItem>
                    <SelectItem value="warning">Uyarı (Kırmızı/Destructive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit">Yayınla</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Mevcut Duyurular</h2>
          {loading ? (
            <p>Yükleniyor...</p>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aktif duyuru bulunmuyor.</p>
          ) : (
            <div className="grid gap-4">
              {announcements.map((ann) => (
                <Card key={ann.id} className="flex flex-row items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={ann.type === 'warning' ? 'destructive' : 'secondary'}>{ann.type}</Badge>
                      <h3 className="font-semibold">{ann.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{ann.content}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteAnnouncement(ann.id)}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      {/* MODERASYON SEKMESİ */}
      <TabsContent value="moderation" className="mt-6 space-y-8">
        
        <Card>
          <CardHeader>
            <CardTitle>Üye Rol Yönetimi</CardTitle>
            <CardDescription>Kullanıcıları Admin yapın veya standart üyeye (member) çevirin.</CardDescription>
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
                    {users.map(u => (
                      <tr key={u.id} className="border-b">
                        <td className="p-3 font-medium">{u.name || 'İsimsiz'}</td>
                        <td className="p-3 text-muted-foreground truncate max-w-[200px]">{u.purpose} - {u.skills?.join(', ')}</td>
                        <td className="p-3">
                          <Badge variant={u.platform_role === 'admin' ? 'destructive' : 'secondary'}>
                            {u.platform_role || 'member'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Select 
                            value={u.platform_role || 'member'} 
                            onValueChange={(val) => handleUpdateRole(u.id, val)}
                          >
                            <SelectTrigger className="w-[120px] ml-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
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
    </Tabs>
  );
}
