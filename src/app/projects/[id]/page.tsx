"use client";

import { useState, useEffect, use } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/utils/supabase/client';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const projectId = unwrappedParams.id;
  
  const [project, setProject] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applyMessage, setApplyMessage] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const supabase = createClient();

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // 1. Projeyi çek (join yapmadan, sadece ana veriyi al)
    const { data: projData, error: projError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projData) {
      // Proje sahibinin profilini ayrıca çekelim
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('name, university, major')
        .eq('id', projData.owner_id)
        .single();
        
      const projectWithOwner = { ...projData, owner: ownerProfile || null };
      setProject(projectWithOwner);

      // Sadece sahibiyse başvuruları görsün
      if (user?.id === projData.owner_id) {
        const { data: appData } = await supabase
          .from('project_applications')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
        
        if (appData && appData.length > 0) {
          // Başvuranların profillerini çek
          const applicantIds = appData.map(a => a.user_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', applicantIds);
            
          const enrichedApps = appData.map(app => {
            const matchedProfile = profilesData?.find(p => p.id === app.user_id);
            return {
              ...app,
              user: matchedProfile || { name: 'Bilinmiyor' }
            };
          });
          setApplications(enrichedApps);
        } else {
          setApplications([]);
        }
      } else if (user) {
        // Kullanıcı kendi başvurusunu görsün ki tekrar başvuramasın
        const { data: myApp } = await supabase
          .from('project_applications')
          .select('*')
          .eq('project_id', projectId)
          .eq('user_id', user.id);
        
        if (myApp && myApp.length > 0) {
          setApplications(myApp);
        }
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [projectId, supabase]);

  const isOwner = currentUser?.id === project?.owner_id;
  const myApplication = !isOwner ? applications.find(a => a.user_id === currentUser?.id) : null;

  async function handleApply() {
    if (!currentUser) {
      toast.error('Lütfen önce giriş yapın.');
      return;
    }

    const { error } = await supabase.from('project_applications').insert({
      project_id: projectId,
      user_id: currentUser.id,
      message: applyMessage
    });

    if (error) {
      toast.error('Başvuru yapılamadı.');
    } else {
      toast.success('Başvurunuz alındı!');
      
      // Proje sahibine bildirim gönder
      await supabase.from('notifications').insert({
        user_id: project.owner_id,
        type: 'new_project_application',
        message: `${currentUser.email || 'Bir kullanıcı'} projenize başvurdu.`,
        related_entity_id: projectId
      });

      setIsDialogOpen(false);
      setApplyMessage('');
      loadData();
    }
  }

  async function updateApplicationStatus(appId: string, applicantId: string, status: string) {
    const { error } = await supabase
      .from('project_applications')
      .update({ status })
      .eq('id', appId);

    if (error) {
      toast.error('İşlem başarısız.');
    } else {
      toast.success(`Başvuru ${status === 'Approved' ? 'onaylandı' : 'reddedildi'}.`);
      
      // Başvurana bildirim
      await supabase.from('notifications').insert({
        user_id: applicantId,
        type: 'application_status_change',
        message: `${project.title} projesine yaptığınız başvuru ${status === 'Approved' ? 'onaylandı' : 'reddedildi'}.`,
        related_entity_id: projectId
      });

      loadData();
    }
  }

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;
  if (!project) return <div className="p-8 text-center">Proje bulunamadı.</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{project.title}</h1>
            <Badge variant={project.status === 'Open' ? 'default' : 'secondary'}>
              {project.status === 'Open' ? 'Alıma Açık' : 'Alıma Kapalı'}
            </Badge>
          </div>
          <p className="text-muted-foreground text-lg">{project.summary}</p>
        </div>
        
        {!isOwner && (
          <div>
            {myApplication ? (
              <Badge variant="outline" className="text-sm px-4 py-2">
                Başvuru Durumu: {
                  myApplication.status === 'Pending' ? 'Beklemede' : 
                  myApplication.status === 'Approved' ? 'Onaylandı' : 'Reddedildi'
                }
              </Badge>
            ) : (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger
                  render={
                    <Button size="lg" disabled={project.status !== 'Open'}>
                      {project.status === 'Open' ? 'Projeye Başvur' : 'Alıma Kapalı'}
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Projeye Başvur</DialogTitle>
                    <DialogDescription>
                      Kendinizi tanıtın ve neden bu projeye katılmak istediğinizi belirtin.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Textarea 
                      placeholder="Başvuru mesajınız..." 
                      value={applyMessage} 
                      onChange={(e) => setApplyMessage(e.target.value)} 
                      rows={5}
                    />
                    <Button className="w-full" onClick={handleApply} disabled={!applyMessage.trim()}>
                      Gönder
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Aranan Roller</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {project.roles && project.roles.length > 0 ? (
                  project.roles.map((role: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-sm py-1 px-3">{role}</Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">Rol belirtilmemiş.</span>
                )}
              </div>
            </CardContent>
          </Card>

          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Gelen Başvurular</CardTitle>
                <CardDescription>Başvuruları inceleyip onaylayabilir veya reddedebilirsiniz.</CardDescription>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Henüz başvuru yok.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aday</TableHead>
                        <TableHead>Mesaj</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="flex items-center gap-2 font-medium">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={`https://ui-avatars.com/api/?name=${app.user?.name || 'Aday'}`} />
                              <AvatarFallback>{app.user?.name?.charAt(0) || 'A'}</AvatarFallback>
                            </Avatar>
                            {app.user?.name || 'Bilinmiyor'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={app.message}>{app.message}</TableCell>
                          <TableCell>
                            <Badge variant={app.status === 'Approved' ? 'default' : app.status === 'Rejected' ? 'destructive' : 'secondary'}>
                              {app.status === 'Pending' ? 'Beklemede' : app.status === 'Approved' ? 'Onaylandı' : 'Reddedildi'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {app.status === 'Pending' && (
                              <>
                                <Button size="sm" variant="default" onClick={() => updateApplicationStatus(app.id, app.user_id, 'Approved')}>Onayla</Button>
                                <Button size="sm" variant="outline" onClick={() => updateApplicationStatus(app.id, app.user_id, 'Rejected')}>Reddet</Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Proje Sahibi</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={`https://ui-avatars.com/api/?name=${project.owner?.name || 'Sahip'}`} />
                <AvatarFallback>{project.owner?.name?.charAt(0) || 'S'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{project.owner?.name || 'Bilinmiyor'}</p>
                <p className="text-sm text-muted-foreground">{project.owner?.major || ''}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
