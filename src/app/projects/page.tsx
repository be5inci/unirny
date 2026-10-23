"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { Plus as PlusIcon, Loader2 } from 'lucide-react';

const projectSchema = z.object({
  title: z.string().min(5, { message: 'Proje başlığı en az 5 karakter olmalıdır.' }),
  summary: z.string().min(15, { message: 'Proje özeti en az 15 karakter olmalıdır.' }),
  roles: z.string().min(2, { message: 'En az bir rol belirtmelisiniz.' }),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export default function ProjectsPage() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: '',
      summary: '',
      roles: '',
    },
  });

  const [currentUser, setCurrentUser] = useState<any>(null);

  async function loadProjects() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    let query = supabase.from('projects').select('*').order('created_at', { ascending: false });
    
    if (statusFilter && statusFilter !== 'All') {
      query = query.eq('status', statusFilter);
    }
    
    const { data, error } = await query;
    if (data && !error) {
      let filteredData = data;
      if (searchFilter) {
        filteredData = filteredData.filter((p: any) => 
          p.title?.toLowerCase().includes(searchFilter.toLowerCase()) || 
          p.roles?.some((r: string) => r.toLowerCase().includes(searchFilter.toLowerCase()))
        );
      }
      setProjects(filteredData);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProjects();
  }, [searchFilter, statusFilter]);

  async function onSubmit(data: ProjectFormValues) {
    if (!currentUser) {
      toast.error('Önce giriş yapmalısınız!');
      return;
    }

    const newProject = {
      title: data.title,
      summary: data.summary,
      status: 'Open',
      roles: data.roles.split(',').map(r => r.trim()),
      owner_id: currentUser.id,
    };
    
    const { error } = await supabase.from('projects').insert(newProject);
    
    if (error) {
      toast.error('İlan yayınlanırken bir hata oluştu: ' + error.message);
    } else {
      toast.success('Proje ilanı başarıyla yayınlandı!');
      setOpen(false);
      form.reset();
      loadProjects(); 
    }
  }

  const myProjects = currentUser ? projects.filter(p => p.owner_id === currentUser.id) : [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projeler</h1>
          <p className="text-muted-foreground mt-1">Topluluk projelerini keşfedin veya kendi ekibinizi kurun.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button>
                <PlusIcon className="w-4 h-4 mr-2" />
                Yeni Proje Oluştur
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Proje İlanı</DialogTitle>
              <DialogDescription>Projeniz için ekip arkadaşı arayışınızı başlatın.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proje Başlığı</FormLabel>
                      <FormControl>
                        <Input placeholder="Örn: Akıllı Kampüs Navigasyonu" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Özet</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Projenin amacı ve hedef kitlesi..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="roles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aranan Roller (Virgülle ayırın)</FormLabel>
                      <FormControl>
                        <Input placeholder="Frontend, Backend, Tasarımcı" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={() => setOpen(false)}>İptal</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {form.formState.isSubmitting ? 'Yayınlanıyor...' : 'İlanı Yayınla'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="discover" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="discover">Projeleri Keşfet</TabsTrigger>
          <TabsTrigger value="manage">Yönetim Panelim</TabsTrigger>
        </TabsList>
        
        <TabsContent value="discover" className="mt-6">
          <div className="bg-card border rounded-lg p-4 mb-8 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input 
                placeholder="Proje veya rol ara..." 
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <Select onValueChange={(val) => setStatusFilter(val || "")} value={statusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum Filtresi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Tüm Durumlar</SelectItem>
                  <SelectItem value="Open">Alıma Açık (Open)</SelectItem>
                  <SelectItem value="Closed">Alıma Kapalı (Closed)</SelectItem>
                  <SelectItem value="In Progress">Devam Eden (In Progress)</SelectItem>
                  <SelectItem value="Upcoming">Yaklaşan (Upcoming)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <p>Yükleniyor...</p>
          ) : projects.length === 0 ? (
            <p>Henüz ilan yok.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant={project.status === 'Open' ? 'default' : 'secondary'}>
                        {project.status === 'Open' ? 'Alıma Açık' : project.status === 'Closed' ? 'Alıma Kapalı' : project.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{project.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{project.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm font-semibold mb-2">Aranan Roller:</p>
                    <div className="flex flex-wrap gap-2">
                      {project.roles?.map((role: string) => (
                        <Badge key={role} variant="outline">{role}</Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button render={<Link href={`/projects/${project.id}`} />} className="w-full">
                      Projeyi İncele
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="manage" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Oluşturduğum Projeler</CardTitle>
              <CardDescription>Kendi projelerinizi görüntüleyin ve başvuruları yönetin.</CardDescription>
            </CardHeader>
            <CardContent>
              {myProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz yönettiğiniz bir proje bulunmuyor.</p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myProjects.map((project) => (
                    <Card key={project.id} className="flex flex-col">
                      <CardHeader>
                        <CardTitle className="text-lg">{project.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <Badge variant={project.status === 'Open' ? 'default' : 'secondary'} className="mb-2">
                          {project.status === 'Open' ? 'Alıma Açık' : project.status === 'Closed' ? 'Alıma Kapalı' : project.status}
                        </Badge>
                      </CardContent>
                      <CardFooter>
                        <Button render={<Link href={`/projects/${project.id}`} />} className="w-full" variant="default">
                          Projeyi İncele
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
    </div>
  );
}
