"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Trash2, Send, Image as ImageIcon, BarChart2, Bookmark, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return `${diffInSeconds} saniye önce`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} dakika önce`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} saat önce`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} gün önce`;
  return date.toLocaleDateString('tr-TR');
}

// Hashtag formatlayıcı
function formatContentWithHashtags(content: string) {
  // #etiket formatını yakala (Türkçe karakterleri de destekler)
  const regex = /#[\p{L}\d_]+/gu;
  const parts = content.split(regex);
  const matches = content.match(regex) || [];

  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {matches[i] && (
            <Link href={`/feed?tag=${matches[i].replace('#', '')}`} className="text-primary hover:underline font-medium">
              {matches[i]}
            </Link>
          )}
        </span>
      ))}
    </>
  );
}

function FeedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTag = searchParams.get('tag');
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all, saved
  
  // Post Create State
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  // Media State
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll State
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Comments Toggle State
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newComments, setNewComments] = useState<Record<string, string>>({});

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [currentTag, activeTab]);

  async function loadData() {
    setLoading(true);
    
    // Auth & Role
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    let currentIsAdmin = false;
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('platform_role').eq('id', user.id).single();
      if (profile?.platform_role === 'admin') {
        setIsAdmin(true);
        currentIsAdmin = true;
      }
    }

    // Tab filtrelemesi - Saved Posts
    let savedPostIds: string[] = [];
    if (user) {
      const { data: savedData } = await supabase.from('saved_posts').select('post_id').eq('user_id', user.id);
      savedPostIds = savedData?.map(s => s.post_id) || [];
    }

    if (activeTab === 'saved' && savedPostIds.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // 1. Gönderileri çek (vw_posts view'ından çekiyoruz ki is_anonymous maskelensin)
    let query = supabase.from('vw_posts').select('*').order('created_at', { ascending: false });

    if (currentTag) {
      query = query.contains('hashtags', [currentTag]);
    }
    
    if (activeTab === 'saved') {
      query = query.in('id', savedPostIds);
    }

    const { data: postsData } = await query;

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const postIds = postsData.map(p => p.id);

    // 2. Beğeniler, Yorumlar, Kaydedilenler, Anketler
    const [likesRes, commentsRes, pollsRes, pollOptionsRes, pollVotesRes] = await Promise.all([
      supabase.from('post_likes').select('*').in('post_id', postIds),
      supabase.from('post_comments').select('*').in('post_id', postIds).order('created_at', { ascending: true }),
      supabase.from('post_polls').select('*').in('post_id', postIds),
      supabase.from('poll_options').select('*'), // Tümünü çekip postta filtreleyeceğiz
      supabase.from('poll_votes').select('*')
    ]);

    const likesData = likesRes.data || [];
    const commentsData = commentsRes.data || [];
    const pollsData = pollsRes.data || [];
    const pollOptionsData = pollOptionsRes.data || [];
    const pollVotesData = pollVotesRes.data || [];

    // 4. Tüm yazar ID'lerini topla (Post sahipleri + Yorum sahipleri)
    const authorIds = new Set<string>();
    postsData.forEach(p => { if (p.author_id) authorIds.add(p.author_id); });
    commentsData.forEach(c => { if (c.author_id) authorIds.add(c.author_id); });

    // 5. Profilleri çek
    let profilesData: any[] = [];
    if (authorIds.size > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url, title').in('id', Array.from(authorIds));
      profilesData = profiles || [];
    }

    // 6. Verileri birleştir
    const enrichedPosts = postsData.map(post => {
      const postLikes = likesData.filter(l => l.post_id === post.id);
      const hasLiked = user ? postLikes.some(l => l.user_id === user.id) : false;
      const isSaved = savedPostIds.includes(post.id);
      
      const postComments = commentsData.filter(c => c.post_id === post.id).map(c => ({
        ...c,
        author: profilesData.find(p => p.id === c.author_id)
      }));

      // Anket verisi birleştirme
      const postPoll = pollsData.find(p => p.post_id === post.id);
      let pollDetails = null;
      if (postPoll) {
        const options = pollOptionsData.filter(o => o.poll_id === postPoll.id);
        const votes = pollVotesData.filter(v => v.poll_id === postPoll.id);
        const userVotedOptionId = user ? votes.find(v => v.user_id === user.id)?.option_id : null;
        
        pollDetails = {
          ...postPoll,
          totalVotes: votes.length,
          userVotedOptionId,
          options: options.map(opt => {
            const optionVotes = votes.filter(v => v.option_id === opt.id).length;
            return {
              ...opt,
              votesCount: optionVotes,
              percentage: votes.length > 0 ? Math.round((optionVotes / votes.length) * 100) : 0
            };
          }).sort((a, b) => a.id.localeCompare(b.id)) // basit sıralama
        };
      }

      return {
        ...post,
        author: profilesData.find(p => p.id === post.author_id), // Eğer is_anonymous ise vw_posts'dan null geliyor (yazar veya admin değilse)
        likesCount: postLikes.length,
        hasLiked,
        isSaved,
        comments: postComments,
        poll: pollDetails
      };
    });

    setPosts(enrichedPosts);
    setLoading(false);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
         toast.error("Görsel 5MB'dan küçük olmalıdır.");
         return;
      }
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) setPollOptions([...pollOptions, '']);
  };
  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };
  const updatePollOption = (index: number, val: string) => {
    const newOpts = [...pollOptions];
    newOpts[index] = val;
    setPollOptions(newOpts);
  };

  const handlePostSubmit = async () => {
    if (!user) return toast.error('Gönderi paylaşmak için giriş yapmalısınız.');
    if (!newPostContent.trim() && !mediaFile && !pollEnabled) return toast.error('Lütfen bir içerik ekleyin.');
    if (newPostContent.length > 500) return toast.error('Gönderi en fazla 500 karakter olabilir.');

    if (pollEnabled) {
      if (!pollQuestion.trim()) return toast.error('Lütfen anket sorusunu yazın.');
      const validOptions = pollOptions.filter(o => o.trim() !== '');
      if (validOptions.length < 2) return toast.error('Anket için en az 2 geçerli seçenek girin.');
    }

    setIsPosting(true);
    let uploadedMediaUrl = null;

    try {
      // 1. Upload Media
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('feed_media')
          .upload(filePath, mediaFile);

        if (uploadError) {
          toast.error('Görsel yüklenemedi: ' + uploadError.message);
          console.error("Upload Error:", uploadError);
          setIsPosting(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage.from('feed_media').getPublicUrl(filePath);
        uploadedMediaUrl = publicUrlData.publicUrl;
      }

      // 2. Extract Hashtags
      const extractedHashtags = Array.from(new Set(
        (newPostContent.match(/#[\p{L}\d_]+/gu) || []).map(tag => tag.replace('#', ''))
      ));

      // 3. Insert Post (Tabloya direkt insert)
      const { data: postData, error: postError } = await supabase.from('posts').insert({
        author_id: user.id,
        content: newPostContent.trim(),
        media_url: uploadedMediaUrl,
        is_anonymous: isAnonymous,
        hashtags: extractedHashtags
      }).select().single();

      if (postError || !postData) {
        toast.error('Gönderi paylaşılamadı: ' + (postError?.message || 'Bilinmeyen hata'));
        console.error("Post Insert Error:", postError);
        setIsPosting(false);
        return;
      }

      // 4. Insert Poll if enabled
      if (pollEnabled) {
        const { data: pollData, error: pollError } = await supabase.from('post_polls').insert({
          post_id: postData.id,
          question: pollQuestion.trim()
        }).select().single();

        if (pollError || !pollData) {
          toast.error('Anket kaydedilemedi: ' + (pollError?.message || 'Bilinmeyen hata'));
          console.error("Poll Insert Error:", pollError);
        } else {
          const optionsToInsert = pollOptions.filter(o => o.trim() !== '').map(opt => ({
            poll_id: pollData.id,
            option_text: opt.trim()
          }));
          const { error: optionsError } = await supabase.from('poll_options').insert(optionsToInsert);
          
          if (optionsError) {
            toast.error('Anket seçenekleri eklenemedi: ' + optionsError.message);
            console.error("Poll Options Insert Error:", optionsError);
          }
        }
      }

      // Reset State
      setNewPostContent('');
      setMediaFile(null);
      setMediaPreview(null);
      setIsAnonymous(false);
      setPollEnabled(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      toast.success('Gönderi paylaşıldı!');
      loadData();
    } catch (err: any) {
      toast.error('Beklenmeyen bir hata oluştu: ' + err.message);
      console.error("Submit Exception:", err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) return toast.error('Oy vermek için giriş yapmalısınız.');
    const { error } = await supabase.from('poll_votes').insert({
      poll_id: pollId,
      option_id: optionId,
      user_id: user.id
    });
    if (error) toast.error('Oy verilirken hata oluştu. Daha önce oy kullanmış olabilirsiniz.');
    else {
      toast.success('Oyunuz kaydedildi.');
      loadData();
    }
  };

  const handleBookmarkToggle = async (postId: string, isSaved: boolean) => {
    if (!user) return toast.error('Kaydetmek için giriş yapmalısınız.');

    // Optimistic UI Update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, isSaved: !isSaved };
      }
      return p;
    }));

    if (isSaved) {
      await supabase.from('saved_posts').delete().match({ post_id: postId, user_id: user.id });
    } else {
      await supabase.from('saved_posts').insert({ post_id: postId, user_id: user.id });
    }
    
    // Refresh if in saved tab to remove items
    if (activeTab === 'saved' && isSaved) {
      setPosts(prev => prev.filter(p => p.id !== postId));
    }
  };

  const handleLikeToggle = async (postId: string, currentlyLiked: boolean) => {
    if (!user) return toast.error('Beğenmek için giriş yapmalısınız.');
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          hasLiked: !currentlyLiked,
          likesCount: currentlyLiked ? p.likesCount - 1 : p.likesCount + 1
        };
      }
      return p;
    }));

    if (currentlyLiked) {
      await supabase.from('post_likes').delete().match({ post_id: postId, user_id: user.id });
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
    }
  };

  const handleDeletePost = async (postId: string) => {
    const confirmDelete = window.confirm("Bu gönderiyi silmek istediğinize emin misiniz?");
    if (!confirmDelete) return;

    if (isAdmin) {
      const { error } = await supabase.rpc('admin_delete_post', { target_post_id: postId });
      if (error) toast.error('Silinirken hata oluştu.');
      else { toast.success('Gönderi admin olarak silindi.'); loadData(); }
    } else {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) toast.error('Silinirken hata oluştu.');
      else { toast.success('Gönderiniz silindi.'); loadData(); }
    }
  };

  const handleCommentSubmit = async (postId: string) => {
    if (!user) return toast.error('Yorum yapmak için giriş yapmalısınız.');
    const content = newComments[postId]?.trim();
    if (!content) return;

    const { error } = await supabase.from('post_comments').insert({
      post_id: postId,
      author_id: user.id,
      content: content
    });

    if (error) {
      toast.error('Yorum eklenemedi.');
    } else {
      setNewComments(prev => ({ ...prev, [postId]: '' }));
      loadData();
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Kampüs Akışı</h1>
          <p className="text-muted-foreground">Öğrencilerle fikirlerini paylaş, tartışmalara katıl.</p>
        </div>
        {currentTag && (
          <Button variant="outline" onClick={() => router.push('/feed')}>
            #{currentTag} (Filtreyi Temizle)
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="mb-6" onValueChange={(val) => setActiveTab(val || "")}>
        <TabsList>
          <TabsTrigger value="all">Tüm Gönderiler</TabsTrigger>
          <TabsTrigger value="saved">Kaydedilenler</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Post Creation Box */}
      {user && activeTab === 'all' && !currentTag && (
        <Card className="p-4 mb-8 bg-card shadow-sm border-primary/10">
          <div className="flex gap-4">
            <Avatar className="w-10 h-10 shrink-0">
              <AvatarImage src={`https://ui-avatars.com/api/?name=${user.email}`} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea 
                placeholder="Neler düşünüyorsun? (#etiket ekleyebilirsin)"
                className="resize-none min-h-[100px] bg-muted/30 focus-visible:ring-primary/20"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                maxLength={500}
              />
              
              {/* Medya Önizleme */}
              {mediaPreview && (
                <div className="relative inline-block mt-2">
                  <img src={mediaPreview} alt="Preview" className="max-h-48 rounded-md border" />
                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6 rounded-full" onClick={removeMedia}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Anket Oluşturma Kutusu */}
              {pollEnabled && (
                <div className="p-3 border rounded-md space-y-3 bg-muted/20">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold">Anket Oluştur</span>
                    <Button variant="ghost" size="sm" onClick={() => setPollEnabled(false)}>İptal</Button>
                  </div>
                  <Input placeholder="Anket Sorusu..." value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} />
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input placeholder={`${i+1}. Seçenek`} value={opt} onChange={(e) => updatePollOption(i, e.target.value)} />
                      {pollOptions.length > 2 && (
                        <Button variant="ghost" size="icon" onClick={() => removePollOption(i)}>
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 4 && (
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={addPollOption}>
                      + Seçenek Ekle
                    </Button>
                  )}
                </div>
              )}

              <div className="flex flex-wrap justify-between items-center gap-4 pt-2 border-t">
                <div className="flex items-center gap-3">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary" onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="w-4 h-4 mr-1.5" />
                    Medya
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary" onClick={() => setPollEnabled(!pollEnabled)}>
                    <BarChart2 className="w-4 h-4 mr-1.5" />
                    Anket
                  </Button>
                  <div className="flex items-center space-x-2 ml-2">
                    <Checkbox id="anonymous" checked={isAnonymous} onCheckedChange={(checked) => setIsAnonymous(checked as boolean)} />
                    <label htmlFor="anonymous" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground">
                      Anonim Gönder
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs ${newPostContent.length > 450 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {newPostContent.length} / 500
                  </span>
                  <Button onClick={handlePostSubmit} disabled={isPosting || (!newPostContent.trim() && !mediaFile && !pollEnabled)}>
                    {isPosting ? 'Paylaşılıyor...' : 'Paylaş'}
                    {!isPosting && <Send className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Feed List */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed">
            <MessageCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Buralar henüz çok sessiz.</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {currentTag ? `#${currentTag} etiketine sahip gönderi bulunamadı.` : activeTab === 'saved' ? 'Henüz hiçbir gönderiyi kaydetmedin.' : 'İlk gönderiyi sen paylaş!'}
            </p>
          </div>
        ) : (
          posts.map(post => {
            const isAnon = post.is_anonymous && !post.author; // If author is null because of masking
            const authorName = isAnon ? 'Gizli Kullanıcı' : (post.author?.name || 'Bilinmeyen Kullanıcı');
            const authorAvatar = isAnon ? `https://ui-avatars.com/api/?name=?&background=random` : (post.author?.avatar_url || `https://ui-avatars.com/api/?name=${authorName}`);
            
            return (
            <Card key={post.id} className="p-4 sm:p-5 hover:shadow-md transition-shadow">
              {/* Post Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3">
                  <Avatar className="w-10 h-10 border border-border">
                    <AvatarImage src={authorAvatar} />
                    <AvatarFallback>{authorName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-sm leading-tight flex items-center gap-2">
                      {authorName}
                      {!isAnon && post.author?.title && <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">· {post.author.title}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      {timeAgo(post.created_at)}
                      {post.is_anonymous && post.author && (
                         <span className="text-primary opacity-80">(Anonim Olarak Paylaştın)</span>
                      )}
                    </div>
                  </div>
                </div>
                {(user?.id === post.author_id || isAdmin) && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50" onClick={() => handleDeletePost(post.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Post Content */}
              <div className="whitespace-pre-wrap text-[15px] mb-4 text-foreground/90">
                {formatContentWithHashtags(post.content)}
              </div>

              {/* Post Media */}
              {post.media_url && (
                <div className="mb-4 rounded-xl overflow-hidden border bg-muted/20">
                  <img src={post.media_url} alt="Post media" className="w-full max-h-[500px] object-contain" loading="lazy" />
                </div>
              )}

              {/* Post Poll */}
              {post.poll && (
                <div className="mb-4 p-4 border rounded-xl bg-card shadow-sm">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-primary" />
                    {post.poll.question}
                  </h4>
                  <div className="space-y-2">
                    {post.poll.options.map((opt: any) => {
                      const isVotedByMe = post.poll.userVotedOptionId === opt.id;
                      const hasVoted = post.poll.userVotedOptionId != null;
                      
                      return (
                      <div key={opt.id} className="relative overflow-hidden rounded-md border group cursor-pointer" onClick={() => { if (!hasVoted) handleVote(post.poll.id, opt.id) }}>
                        <div 
                          className={`absolute top-0 left-0 h-full transition-all duration-500 ${isVotedByMe ? 'bg-primary/20' : 'bg-muted'}`} 
                          style={{ width: hasVoted ? `${opt.percentage}%` : '0%' }}
                        />
                        <div className="relative p-2.5 px-3 flex justify-between items-center text-sm z-10">
                          <span className={`font-medium ${isVotedByMe ? 'text-primary' : ''}`}>{opt.option_text}</span>
                          {hasVoted && <span className="text-xs font-semibold">{opt.percentage}%</span>}
                        </div>
                      </div>
                    )})}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 text-right">
                    Toplam {post.poll.totalVotes} oy
                  </div>
                </div>
              )}

              {/* Interaction Bar */}
              <div className="flex gap-4 sm:gap-6 border-t pt-3 mt-2">
                <button 
                  onClick={() => handleLikeToggle(post.id, post.hasLiked)}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${post.hasLiked ? 'text-red-500 font-medium' : 'text-muted-foreground hover:text-red-500 hover:bg-red-50 px-2 py-1 -ml-2 rounded-md'}`}
                >
                  <Heart className={`w-5 h-5 ${post.hasLiked ? 'fill-current' : ''}`} />
                  <span>{post.likesCount > 0 ? post.likesCount : 'Beğen'}</span>
                </button>

                <button 
                  onClick={() => toggleComments(post.id)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 px-2 py-1 rounded-md transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>{post.comments?.length > 0 ? post.comments.length : 'Yorum'}</span>
                </button>

                <button 
                  onClick={() => handleBookmarkToggle(post.id, post.isSaved)}
                  className={`flex items-center gap-1.5 text-sm transition-colors ml-auto ${post.isSaved ? 'text-primary font-medium' : 'text-muted-foreground hover:text-primary hover:bg-primary/5 px-2 py-1 -mr-2 rounded-md'}`}
                >
                  <Bookmark className={`w-5 h-5 ${post.isSaved ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Comments Section */}
              {expandedComments[post.id] && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  {/* Existing Comments */}
                  <div className="space-y-3">
                    {post.comments?.map((comment: any) => (
                      <div key={comment.id} className="flex gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={comment.author?.avatar_url || `https://ui-avatars.com/api/?name=${comment.author?.name || 'A'}`} />
                          <AvatarFallback>C</AvatarFallback>
                        </Avatar>
                        <div className="bg-muted/50 rounded-lg p-2 px-3 text-sm flex-1">
                          <div className="font-semibold flex items-center justify-between">
                            <span>{comment.author?.name || 'Anonim'}</span>
                            <span className="text-xs text-muted-foreground font-normal">{timeAgo(comment.created_at)}</span>
                          </div>
                          <div className="mt-0.5">{comment.content}</div>
                        </div>
                      </div>
                    ))}
                    {post.comments?.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-2">Henüz yorum yapılmamış. İlk yorumu sen yap!</div>
                    )}
                  </div>

                  {/* Add Comment Input */}
                  {user && (
                    <div className="flex gap-2 mt-2">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={`https://ui-avatars.com/api/?name=${user.email}`} />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-1 gap-2">
                        <Input 
                          placeholder="Yorum yaz..." 
                          className="h-9 text-sm bg-muted/30 focus-visible:ring-primary/20"
                          value={newComments[post.id] || ''}
                          onChange={(e) => setNewComments(prev => ({...prev, [post.id]: e.target.value}))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCommentSubmit(post.id);
                          }}
                        />
                        <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => handleCommentSubmit(post.id)}>
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <FeedContent />
    </Suspense>
  );
}
