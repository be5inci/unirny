"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Heart, 
  MessageCircle, 
  Trash2, 
  Send, 
  Image as ImageIcon, 
  BarChart2, 
  Bookmark, 
  X,
  Flame,
  Compass,
  UserCircle,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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

const TABS = [
  { id: 'all', label: 'Tümü', icon: Compass },
  { id: 'trending', label: 'Trend / Popüler', icon: Flame },
  { id: 'liked', label: 'Beğendiklerim', icon: Heart },
  { id: 'saved', label: 'Kaydedilenler', icon: Bookmark },
  { id: 'my_posts', label: 'Paylaşımlarım', icon: UserCircle },
];

const CATEGORIES = [
  'Tümü',
  'Soru & Cevap',
  'İkinci El',
  'Kayıp Eşya',
  'Yurt / Ev',
  'Sosyal'
];

function FeedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTag = searchParams.get('tag');
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Tabs & Category State
  const [activeTab, setActiveTab] = useState('all'); // all, trending, liked, saved, my_posts
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  
  // User Stats for Mini Profile Card
  const [userStats, setUserStats] = useState({
    totalPosts: 0,
    totalLikes: 0,
    totalSaved: 0
  });

  // Post Create State
  const [newPostContent, setNewPostContent] = useState('');
  const [postCategory, setPostCategory] = useState('Genel');
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
    
    // Auth & Profile
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setUser(authUser);

    let userSavedPostIds: string[] = [];
    let userLikedPostIds: string[] = [];

    if (authUser) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
        
      setProfile(profileData || null);

      if (profileData?.platform_role) {
        setUserRole(profileData.platform_role);
      }
      if (profileData?.platform_role === 'admin' || profileData?.platform_role === 'super_admin') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }

      // Fetch user's saved/bookmarked post IDs
      const { data: bmData, error: bmErr } = await supabase
        .from('post_bookmarks')
        .select('post_id')
        .eq('user_id', authUser.id);

      if (!bmErr && bmData) {
        userSavedPostIds = bmData.map(b => b.post_id);
      } else {
        const { data: savedData } = await supabase
          .from('saved_posts')
          .select('post_id')
          .eq('user_id', authUser.id);
        userSavedPostIds = savedData?.map(s => s.post_id) || [];
      }

      // Fetch user's liked post IDs
      const { data: userLikesData } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', authUser.id);
      userLikedPostIds = userLikesData?.map(l => l.post_id) || [];

      // Calculate stats for mini profile card
      // 1. Total posts count
      const { count: postCount } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', authUser.id);

      // 2. Total likes received on user's posts
      const { data: userPostsList } = await supabase
        .from('posts')
        .select('id')
        .eq('author_id', authUser.id);

      let totalLikesReceived = 0;
      if (userPostsList && userPostsList.length > 0) {
        const userPostIds = userPostsList.map(p => p.id);
        const { count: likesCount } = await supabase
          .from('post_likes')
          .select('id', { count: 'exact', head: true })
          .in('post_id', userPostIds);
        totalLikesReceived = likesCount || 0;
      }

      setUserStats({
        totalPosts: postCount || 0,
        totalLikes: totalLikesReceived,
        totalSaved: userSavedPostIds.length
      });
    } else {
      setProfile(null);
      setUserRole(null);
      setIsAdmin(false);
      setUserStats({ totalPosts: 0, totalLikes: 0, totalSaved: 0 });
    }

    // Tab checks for guest
    if (!authUser && (activeTab === 'saved' || activeTab === 'liked' || activeTab === 'my_posts')) {
      setPosts([]);
      setLoading(false);
      return;
    }

    if (activeTab === 'saved' && userSavedPostIds.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    if (activeTab === 'liked' && userLikedPostIds.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // 1. Posts Query (vw_posts view'ından çekiyoruz)
    let query = supabase.from('vw_posts').select('*').order('created_at', { ascending: false });

    if (currentTag) {
      query = query.contains('hashtags', [currentTag]);
    }

    if (activeTab === 'saved') {
      query = query.in('id', userSavedPostIds);
    } else if (activeTab === 'liked') {
      query = query.in('id', userLikedPostIds);
    } else if (activeTab === 'my_posts' && authUser) {
      query = query.eq('author_id', authUser.id);
    }

    // Limit to latest 100 posts
    query = query.limit(100);

    const { data: postsData } = await query;

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const postIds = postsData.map(p => p.id);

    // 2. Beğeniler, Yorumlar, Anketler
    const [likesRes, commentsRes, pollsRes, pollOptionsRes, pollVotesRes] = await Promise.all([
      supabase.from('post_likes').select('*').in('post_id', postIds),
      supabase.from('post_comments').select('*').in('post_id', postIds).order('created_at', { ascending: true }),
      supabase.from('post_polls').select('*').in('post_id', postIds),
      supabase.from('poll_options').select('*'),
      supabase.from('poll_votes').select('*')
    ]);

    const likesData = likesRes.data || [];
    const commentsData = commentsRes.data || [];
    const pollsData = pollsRes.data || [];
    const pollOptionsData = pollOptionsRes.data || [];
    const pollVotesData = pollVotesRes.data || [];

    // 3. Yazar Profillerini Topla
    const authorIds = new Set<string>();
    postsData.forEach(p => { if (p.author_id) authorIds.add(p.author_id); });
    commentsData.forEach(c => { if (c.author_id) authorIds.add(c.author_id); });

    let profilesData: any[] = [];
    if (authorIds.size > 0) {
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', Array.from(authorIds));
      profilesData = profiles || [];
    }

    // 4. Verileri Birleştir
    let enriched = postsData.map(post => {
      const postLikes = likesData.filter(l => l.post_id === post.id);
      const hasLiked = authUser ? postLikes.some(l => l.user_id === authUser.id) : false;
      const isSaved = userSavedPostIds.includes(post.id);
      
      const postComments = commentsData.filter(c => c.post_id === post.id).map(c => ({
        ...c,
        author: profilesData.find(p => p.id === c.author_id)
      }));

      const postPoll = pollsData.find(p => p.post_id === post.id);
      let pollDetails = null;
      if (postPoll) {
        const options = pollOptionsData.filter(o => o.poll_id === postPoll.id);
        const votes = pollVotesData.filter(v => v.poll_id === postPoll.id);
        const userVotedOptionId = authUser ? votes.find(v => v.user_id === authUser.id)?.option_id : null;
        
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
          }).sort((a, b) => a.id.localeCompare(b.id))
        };
      }

      return {
        ...post,
        author: profilesData.find(p => p.id === post.author_id),
        likesCount: postLikes.length,
        hasLiked,
        isSaved,
        comments: postComments,
        poll: pollDetails
      };
    });

    // Trending sıralaması: Beğeni + yorum sayısına göre popülerlik
    if (activeTab === 'trending') {
      enriched = [...enriched].sort((a, b) => {
        const scoreA = (a.likesCount * 2) + (a.comments?.length || 0);
        const scoreB = (b.likesCount * 2) + (b.comments?.length || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    setPosts(enriched);
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
    if (userRole === 'viewer') {
      return toast.error('İzleyici hesabıyla işlem yapamazsınız, yalnızca görüntüleme yetkiniz var.');
    }
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

      // 3. Insert Post payload
      const postPayload: any = {
        author_id: user.id,
        content: newPostContent.trim(),
        media_url: uploadedMediaUrl,
        is_anonymous: isAnonymous === true,
        hashtags: extractedHashtags
      };

      if (postCategory && postCategory !== 'Genel') {
        postPayload.category = postCategory;
      }

      let { data: postData, error: postError } = await supabase.from('posts').insert(postPayload).select().single();

      // Fallback if category column doesn't exist yet
      if (postError && (postError.message?.toLowerCase().includes('category') || postError.code === '42703')) {
        delete postPayload.category;
        const retry = await supabase.from('posts').insert(postPayload).select().single();
        postData = retry.data;
        postError = retry.error;
      }

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

      // Reset Form State
      setNewPostContent('');
      setPostCategory('Genel');
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
    if (userRole === 'viewer') {
      return toast.error('İzleyici hesabıyla işlem yapamazsınız, yalnızca görüntüleme yetkiniz var.');
    }
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

  // Bookmark (Kaydet) Toggle
  const handleBookmarkToggle = async (postId: string, isSaved: boolean) => {
    if (!user) return toast.error('Kaydetmek için giriş yapmalısınız.');
    if (userRole === 'viewer') {
      return toast.error('İzleyici hesabıyla işlem yapamazsınız, yalnızca görüntüleme yetkiniz var.');
    }

    // Optimistic UI Update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, isSaved: !isSaved };
      }
      return p;
    }));

    setUserStats(prev => ({
      ...prev,
      totalSaved: isSaved ? Math.max(0, prev.totalSaved - 1) : prev.totalSaved + 1
    }));

    // If in saved tab and unsaved, remove from current list instantly
    if (activeTab === 'saved' && isSaved) {
      setPosts(prev => prev.filter(p => p.id !== postId));
    }

    try {
      if (isSaved) {
        const { error } = await supabase.from('post_bookmarks').delete().match({ post_id: postId, user_id: user.id });
        if (error) {
          await supabase.from('saved_posts').delete().match({ post_id: postId, user_id: user.id });
        }
        toast.success('Gönderi kaydedilenlerden çıkarıldı.');
      } else {
        const { error } = await supabase.from('post_bookmarks').insert({ post_id: postId, user_id: user.id });
        if (error) {
          await supabase.from('saved_posts').insert({ post_id: postId, user_id: user.id });
        }
        toast.success('Gönderi kaydedildi.');
      }
    } catch (err: any) {
      console.error('Bookmark toggle error:', err);
      // Revert optimistic update
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isSaved } : p));
      toast.error('İşlem gerçekleştirilemedi.');
    }
  };

  const handleLikeToggle = async (postId: string, currentlyLiked: boolean) => {
    if (!user) return toast.error('Beğenmek için giriş yapmalısınız.');
    if (userRole === 'viewer') {
      return toast.error('İzleyici hesabıyla işlem yapamazsınız, yalnızca görüntüleme yetkiniz var.');
    }

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

    if (activeTab === 'liked' && currentlyLiked) {
      setPosts(prev => prev.filter(p => p.id !== postId));
    }

    try {
      if (currentlyLiked) {
        await supabase.from('post_likes').delete().match({ post_id: postId, user_id: user.id });
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
      }
    } catch (err: any) {
      console.error('Like toggle error:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (userRole === 'viewer') {
      return toast.error('İzleyici hesabıyla işlem yapamazsınız, yalnızca görüntüleme yetkiniz var.');
    }
    const confirmDelete = window.confirm("Bu gönderiyi silmek istediğinize emin misiniz?");
    if (!confirmDelete) return;

    if (isAdmin) {
      const { error } = await supabase.rpc('admin_delete_post', { target_post_id: postId });
      if (error) toast.error('Silinirken hata oluştu.');
      else { 
        toast.success('Gönderi silindi.'); 
        loadData(); 
      }
    } else {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) toast.error('Silinirken hata oluştu.');
      else { 
        toast.success('Gönderiniz silindi.'); 
        loadData(); 
      }
    }
  };

  const handleCommentSubmit = async (postId: string) => {
    if (!user) return toast.error('Yorum yapmak için giriş yapmalısınız.');
    if (userRole === 'viewer') {
      return toast.error('İzleyici hesabıyla işlem yapamazsınız, yalnızca görüntüleme yetkiniz var.');
    }
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

  // Kategori Filtresi Uygulama (Anlık / Client-side)
  const displayedPosts = posts.filter(post => {
    if (selectedCategory === 'Tümü') return true;
    if (post.category && post.category === selectedCategory) return true;
    
    // Eski veya kategorisi belirtilmemiş gönderiler için etiket ve içerik araması fallback'i
    const catLower = selectedCategory.toLowerCase();
    if (post.hashtags?.some((h: string) => h.toLowerCase() === catLower || catLower.includes(h.toLowerCase()))) {
      return true;
    }
    if (post.content?.toLowerCase().includes(catLower)) {
      return true;
    }
    return false;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ======================================================== */}
        {/* SOL SÜTUN / SIDEBAR: MASAÜSTÜ MİNİ PROFİL KARTI          */}
        {/* ======================================================== */}
        <aside className="lg:col-span-4 space-y-6 hidden lg:block sticky top-24">
          <Card className="p-5 bg-card border-border/60 shadow-sm rounded-2xl overflow-hidden">
            {user && profile ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <Avatar className="w-20 h-20 border-2 border-primary/20 ring-4 ring-background shadow-md">
                      <AvatarImage 
                        src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || user.email)}`} 
                      />
                      <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                        {(profile.name || user.email || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {profile.platform_role === 'super_admin' ? (
                      <Badge className="absolute -bottom-1 -right-1 bg-purple-600 text-[10px] px-1.5 py-0 h-4 border-2 border-background font-semibold">
                        Süper
                      </Badge>
                    ) : profile.platform_role === 'admin' ? (
                      <Badge className="absolute -bottom-1 -right-1 bg-red-600 text-[10px] px-1.5 py-0 h-4 border-2 border-background font-semibold">
                        Admin
                      </Badge>
                    ) : null}
                  </div>

                  <h3 className="font-bold text-base text-foreground leading-snug">
                    {profile.name || user.email?.split('@')[0]}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {profile.title || profile.faculty || profile.university || 'Öğrenci'}
                  </p>
                </div>

                {/* İstatistikler */}
                <div className="grid grid-cols-3 gap-2 py-3 px-2 bg-muted/40 rounded-xl text-center border border-border/40">
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground">Gönderi</span>
                    <p className="text-base font-bold text-foreground">{userStats.totalPosts}</p>
                  </div>
                  <div className="space-y-0.5 border-x border-border/60">
                    <span className="text-xs text-muted-foreground">Beğeni</span>
                    <p className="text-base font-bold text-rose-500">{userStats.totalLikes}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground">Kaydedilen</span>
                    <p className="text-base font-bold text-primary">{userStats.totalSaved}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href="/profile" className="w-full block">
                    <Button variant="outline" className="w-full text-xs h-9 justify-center">
                      <UserCircle className="w-4 h-4 mr-1.5" />
                      Profilime Git
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">unirny Kampüs</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tartışmalara katılmak, sorularını sormak ve diğer öğrencilerle etkileşime geçmek için giriş yap.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <Link href="/login" className="w-full block">
                    <Button size="sm" className="w-full text-xs">
                      Giriş Yap
                    </Button>
                  </Link>
                  <Link href="/register" className="w-full block">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Kayıt Ol
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </Card>

          {/* Hızlı Bilgi & İpuçları Kartı */}
          <Card className="p-4 bg-muted/30 border-border/50 rounded-2xl text-xs space-y-2 text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Compass className="w-4 h-4 text-primary" />
              <span>Akış İpuçları</span>
            </div>
            <p>
              İlgilendiğin kategorideki gönderileri hap filtrelere basarak süzebilir, beğendiğin veya daha sonra okumak istediğin gönderileri yer işaretiyle kaydedebilirsin.
            </p>
          </Card>
        </aside>

        {/* ======================================================== */}
        {/* SAĞ SÜTUN / ANA AKIŞ ALANI                               */}
        {/* ======================================================== */}
        <main className="lg:col-span-8 space-y-6 min-w-0">
          
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Kampüs Akışı</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Öğrencilerle fikirlerini paylaş, sorular sor ve gündemi yakala.
              </p>
            </div>
            {currentTag && (
              <Button variant="outline" size="sm" onClick={() => router.push('/feed')} className="text-xs">
                #{currentTag} (Filtreyi Kaldır)
              </Button>
            )}
          </div>

          {/* Mobil Mini Profil Kartı (Sadece < lg ekranlarda) */}
          {user && profile && (
            <Card className="lg:hidden p-3.5 bg-card border-primary/10 shadow-sm rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-10 h-10 border border-primary/20 shrink-0">
                    <AvatarImage 
                      src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || user.email)}`} 
                    />
                    <AvatarFallback>{(profile.name || user.email || 'U')[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{profile.name || user.email?.split('@')[0]}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile.title || profile.faculty || 'Öğrenci'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-center shrink-0">
                  <div className="px-2 py-1 bg-muted/50 rounded-lg">
                    <span className="text-xs font-bold block">{userStats.totalPosts}</span>
                    <span className="text-[10px] text-muted-foreground">Post</span>
                  </div>
                  <div className="px-2 py-1 bg-muted/50 rounded-lg">
                    <span className="text-xs font-bold block text-rose-500">{userStats.totalLikes}</span>
                    <span className="text-[10px] text-muted-foreground">Beğeni</span>
                  </div>
                  <div className="px-2 py-1 bg-muted/50 rounded-lg">
                    <span className="text-xs font-bold block text-primary">{userStats.totalSaved}</span>
                    <span className="text-[10px] text-muted-foreground">Kayıt</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ======================================================== */}
          {/* İKİ KATMANLI MENÜ & FİLTRELEME YAPISI                     */}
          {/* ======================================================== */}
          <div className="space-y-3">
            {/* 1. Katman: Kaydırılabilir Segmented Tabs */}
            <div className="relative">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar rounded-xl bg-muted/60 p-1.5 border border-border/50">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0 ${
                        isActive
                          ? 'bg-background text-foreground shadow-sm font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span>{tab.label}</span>
                      {tab.id === 'saved' && userStats.totalSaved > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-primary/15 text-primary font-bold' : 'bg-muted text-muted-foreground'}`}>
                          {userStats.totalSaved}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Katman: Kategori Hapları (Topic Filter Pills) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/40'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Misafir Kullanıcı İçin Sekme Uyarısı */}
          {!user && (activeTab === 'saved' || activeTab === 'liked' || activeTab === 'my_posts') && (
            <Card className="p-8 text-center bg-muted/20 border-dashed rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <UserCircle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-base">Giriş Yapmalısınız</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {activeTab === 'liked' && 'Beğendiğiniz gönderileri listelemek için lütfen oturum açın.'}
                {activeTab === 'saved' && 'Kaydettiğiniz gönderilere erişmek için lütfen oturum açın.'}
                {activeTab === 'my_posts' && 'Kendi paylaştığınız gönderileri görmek için lütfen oturum açın.'}
              </p>
              <div className="pt-2">
                <Link href="/login">
                  <Button size="sm">Giriş Yap</Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Post Creation Box */}
          {user && activeTab === 'all' && !currentTag && (
            <Card className="p-4 sm:p-5 bg-card shadow-sm border-primary/10 rounded-2xl">
              <div className="flex gap-3 sm:gap-4">
                <Avatar className="w-10 h-10 shrink-0 border">
                  <AvatarImage src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}`} />
                  <AvatarFallback>{(profile?.name || user.email || 'U')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea 
                    placeholder="Neler düşünüyorsun? (#etiket ekleyebilirsin)"
                    className="resize-none min-h-[100px] bg-muted/30 focus-visible:ring-primary/20 rounded-xl text-sm"
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
                    <div className="p-3 border rounded-xl space-y-3 bg-muted/20">
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

                  <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary text-xs" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                        Medya
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary text-xs" onClick={() => setPollEnabled(!pollEnabled)}>
                        <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
                        Anket
                      </Button>

                      {/* Kategori Seçimi Dropdown'ı (Opsiyonel) */}
                      <Select value={postCategory} onValueChange={(val) => setPostCategory(val || 'Genel')}>
                        <SelectTrigger className="w-[140px] sm:w-[155px] h-8 text-xs bg-muted/40 border-border/60">
                          <SelectValue placeholder="Kategori Seç" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Genel">Kategori: Genel</SelectItem>
                          <SelectItem value="Soru & Cevap">Soru & Cevap</SelectItem>
                          <SelectItem value="İkinci El">İkinci El</SelectItem>
                          <SelectItem value="Kayıp Eşya">Kayıp Eşya</SelectItem>
                          <SelectItem value="Yurt / Ev">Yurt / Ev</SelectItem>
                          <SelectItem value="Sosyal">Sosyal</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex items-center space-x-1.5 ml-1">
                        <Checkbox id="anonymous" checked={isAnonymous} onCheckedChange={(checked) => setIsAnonymous(checked === true)} />
                        <label htmlFor="anonymous" className="text-xs font-medium leading-none cursor-pointer text-muted-foreground">
                          Anonim
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                      <span className={`text-xs ${newPostContent.length > 450 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {newPostContent.length}/500
                      </span>
                      <Button 
                        size="sm"
                        onClick={handlePostSubmit} 
                        disabled={isPosting || (!newPostContent.trim() && !mediaFile && !pollEnabled)}
                      >
                        {isPosting ? 'Paylaşılıyor...' : 'Paylaş'}
                        {!isPosting && <Send className="w-3.5 h-3.5 ml-1.5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Gönderi Akışı (Feed List) */}
          <div className="space-y-4 sm:space-y-5">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : displayedPosts.length === 0 ? (
              <div className="text-center py-16 bg-muted/20 rounded-2xl border border-dashed p-6">
                <MessageCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-base font-semibold">Gönderi bulunamadı</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  {currentTag 
                    ? `#${currentTag} etiketine sahip gönderi bulunamadı.` 
                    : selectedCategory !== 'Tümü'
                    ? `"${selectedCategory}" kategorisinde henüz bir gönderi bulunmuyor.`
                    : activeTab === 'saved' 
                    ? 'Henüz hiçbir gönderiyi kaydetmedin.' 
                    : activeTab === 'liked'
                    ? 'Henüz hiçbir gönderiyi beğenmedin.'
                    : activeTab === 'my_posts'
                    ? 'Henüz hiçbir gönderi paylaşmadın.'
                    : 'Henüz akışta paylaşım yapılmadı. İlk gönderiyi sen paylaş!'}
                </p>
                {selectedCategory !== 'Tümü' && (
                  <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={() => setSelectedCategory('Tümü')}>
                    Kategori Filtresini Sıfırla
                  </Button>
                )}
              </div>
            ) : (
              displayedPosts.map(post => {
                const isAnon = post.is_anonymous === true;
                const authorName = isAnon 
                  ? 'Anonim' 
                  : (post.author?.name || post.author?.full_name || post.profiles?.full_name || post.profiles?.name || post.author_name || 'Bilinmeyen Kullanıcı');
                const authorAvatar = isAnon 
                  ? `https://ui-avatars.com/api/?name=Anonim&background=6b7280&color=fff` 
                  : (post.author?.avatar_url || post.author?.avatar || post.profiles?.avatar_url || post.profiles?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random`);
                
                return (
                  <Card key={post.id} className="p-4 sm:p-5 hover:shadow-md transition-shadow rounded-2xl border-border/60">
                    {/* Post Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-border">
                          <AvatarImage src={authorAvatar} />
                          <AvatarFallback>{isAnon ? '?' : authorName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-sm leading-tight flex items-center gap-2">
                            <span>{authorName}</span>
                            {!isAnon && post.author?.title && (
                              <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                                · {post.author.title}
                              </span>
                            )}
                            {post.category && post.category !== 'Genel' && (
                              <Badge variant="secondary" className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                                {post.category}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                            <span>{timeAgo(post.created_at)}</span>
                            {isAnon && user?.id === post.author_id && (
                               <span className="text-primary opacity-80">(Anonim Olarak Paylaştın)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {(user?.id === post.author_id || isAdmin) && userRole !== 'viewer' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                          onClick={() => handleDeletePost(post.id)}
                          title="Gönderiyi Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Post Content */}
                    <div className="whitespace-pre-wrap text-[15px] mb-3 text-foreground/90 leading-relaxed">
                      {formatContentWithHashtags(post.content)}
                    </div>

                    {/* Post Media */}
                    {post.media_url && (
                      <div className="mb-3 rounded-xl overflow-hidden border bg-muted/20">
                        <img src={post.media_url} alt="Post media" className="w-full max-h-[450px] object-contain" loading="lazy" />
                      </div>
                    )}

                    {/* Post Poll */}
                    {post.poll && (
                      <div className="mb-3 p-3.5 border rounded-xl bg-card shadow-xs">
                        <h4 className="font-semibold text-sm mb-2.5 flex items-center gap-2">
                          <BarChart2 className="w-4 h-4 text-primary" />
                          {post.poll.question}
                        </h4>
                        <div className="space-y-2">
                          {post.poll.options.map((opt: any) => {
                            const isVotedByMe = post.poll.userVotedOptionId === opt.id;
                            const hasVoted = post.poll.userVotedOptionId != null;
                            
                            return (
                              <div 
                                key={opt.id} 
                                className="relative overflow-hidden rounded-lg border group cursor-pointer" 
                                onClick={() => { if (!hasVoted) handleVote(post.poll.id, opt.id); }}
                              >
                                <div 
                                  className={`absolute top-0 left-0 h-full transition-all duration-500 ${isVotedByMe ? 'bg-primary/20' : 'bg-muted'}`} 
                                  style={{ width: hasVoted ? `${opt.percentage}%` : '0%' }}
                                />
                                <div className="relative p-2.5 px-3 flex justify-between items-center text-sm z-10">
                                  <span className={`font-medium ${isVotedByMe ? 'text-primary' : ''}`}>{opt.option_text}</span>
                                  {hasVoted && <span className="text-xs font-semibold">{opt.percentage}%</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 text-right">
                          Toplam {post.poll.totalVotes} oy
                        </div>
                      </div>
                    )}

                    {/* Interaction Bar (Beğen, Yorum ve Sağ Alt Köşede Kaydet) */}
                    <div className="flex items-center justify-between border-t pt-2.5 mt-2">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <button 
                          onClick={() => handleLikeToggle(post.id, post.hasLiked)}
                          className={`flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
                            post.hasLiked 
                              ? 'text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/30' 
                              : 'text-muted-foreground hover:text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/20'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-current' : ''}`} />
                          <span>{post.likesCount > 0 ? post.likesCount : 'Beğen'}</span>
                        </button>

                        <button 
                          onClick={() => toggleComments(post.id)}
                          className={`flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
                            expandedComments[post.id]
                              ? 'text-primary bg-primary/10 font-semibold'
                              : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                          }`}
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.comments?.length > 0 ? post.comments.length : 'Yorum'}</span>
                        </button>
                      </div>

                      {/* Sağ Alt Köşe: Kaydet (Bookmark) Butonu */}
                      <button 
                        onClick={() => handleBookmarkToggle(post.id, post.isSaved)}
                        className={`flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
                          post.isSaved 
                            ? 'text-primary font-semibold bg-primary/10' 
                            : 'text-muted-foreground hover:text-primary hover:bg-muted'
                        }`}
                        title={post.isSaved ? "Kaydedilenlerden Çıkar" : "Kaydet"}
                      >
                        <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-current' : ''}`} />
                        <span className="hidden sm:inline">{post.isSaved ? 'Kaydedildi' : 'Kaydet'}</span>
                      </button>
                    </div>

                    {/* Comments Section */}
                    {expandedComments[post.id] && (
                      <div className="mt-3 pt-3 border-t space-y-3">
                        <div className="space-y-2.5">
                          {post.comments?.map((comment: any) => (
                            <div key={comment.id} className="flex gap-2">
                              <Avatar className="w-7 h-7 shrink-0">
                                <AvatarImage src={comment.author?.avatar_url || `https://ui-avatars.com/api/?name=${comment.author?.name || 'A'}`} />
                                <AvatarFallback>C</AvatarFallback>
                              </Avatar>
                              <div className="bg-muted/50 rounded-xl p-2.5 px-3 text-xs sm:text-sm flex-1">
                                <div className="font-semibold flex items-center justify-between">
                                  <span>{comment.author?.name || 'Anonim'}</span>
                                  <span className="text-[11px] text-muted-foreground font-normal">{timeAgo(comment.created_at)}</span>
                                </div>
                                <div className="mt-1 leading-snug">{comment.content}</div>
                              </div>
                            </div>
                          ))}
                          {post.comments?.length === 0 && (
                            <div className="text-xs text-muted-foreground text-center py-2">Henüz yorum yapılmamış. İlk yorumu sen yap!</div>
                          )}
                        </div>

                        {/* Add Comment Input */}
                        {user && (
                          <div className="flex gap-2 mt-2">
                            <Avatar className="w-8 h-8 shrink-0">
                              <AvatarImage src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}`} />
                              <AvatarFallback>{(profile?.name || user.email || 'U')[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-1 gap-2">
                              <Input 
                                placeholder="Yorum yaz..." 
                                className="h-9 text-xs sm:text-sm bg-muted/30 focus-visible:ring-primary/20 rounded-xl"
                                value={newComments[post.id] || ''}
                                onChange={(e) => setNewComments(prev => ({...prev, [post.id]: e.target.value}))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCommentSubmit(post.id);
                                }}
                              />
                              <Button size="icon" className="h-9 w-9 shrink-0 rounded-xl" onClick={() => handleCommentSubmit(post.id)}>
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
        </main>
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
