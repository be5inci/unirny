"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Loader2, Maximize2, User } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: string;
    name: string;
    avatar?: string;
    major?: string;
    university?: string;
  } | null;
  initialSessionId?: string | null;
}

export function DirectMessageModal({
  isOpen,
  onClose,
  targetUser,
  initialSessionId,
}: DirectMessageModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Oturum (session_id) bulma veya oluşturma
  useEffect(() => {
    if (!isOpen || !targetUser) {
      setMessages([]);
      setSessionId(null);
      setNewMessage("");
      return;
    }

    let isMounted = true;

    async function initializeSession() {
      if (!targetUser) return;
      setIsLoadingSession(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          toast.error("Mesajlaşabilmek için lütfen giriş yapın.");
          onClose();
          return;
        }

        if (!isMounted) return;
        setCurrentUserId(user.id);

        if (user.id === targetUser?.id) {
          toast.warning("Kendinize mesaj gönderemezsiniz.");
          onClose();
          return;
        }

        // Eğer başlangıçta geçerli bir session_id verilmişse onu kullan
        if (initialSessionId) {
          setSessionId(initialSessionId);
          setIsLoadingSession(false);
          return;
        }

        // İki kullanıcı arasında var olan aktif/bekleyen bir seans/sohbet var mı kontrol et
        const { data: existingSessions, error: findError } = await supabase
          .from("mentorships")
          .select("id, status")
          .or(
            `and(mentee_id.eq.${user.id},mentor_id.eq.${targetUser?.id}),and(mentee_id.eq.${targetUser?.id},mentor_id.eq.${user.id})`
          )
          .order("created_at", { ascending: false })
          .limit(1);

        if (findError) {
          console.error("Session lookup error:", findError);
        }

        if (existingSessions && existingSessions.length > 0) {
          if (isMounted) setSessionId(existingSessions[0].id);
        } else {
          // İki kullanıcı arasında henüz oturum yoksa yeni bir oturum oluştur
          const { data: newSession, error: createError } = await supabase
            .from("mentorships")
            .insert({
              mentee_id: user.id,
              mentor_id: targetUser?.id,
              focus_area: "Bireysel Mesajlaşma",
              status: "Active",
              start_date: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (createError) {
            console.error("Session creation error:", createError);
            toast.error("Mesajlaşma oturumu başlatılamadı.");
            onClose();
            return;
          }

          if (isMounted && newSession) {
            setSessionId(newSession.id);
          }
        }
      } catch (err: any) {
        console.error("Session init failed:", err);
        toast.error("Bir hata oluştu: " + (err.message || ""));
      } finally {
        if (isMounted) setIsLoadingSession(false);
      }
    }

    initializeSession();

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetUser, initialSessionId]);

  // Geçmiş mesajları çekme ve Realtime dinleme
  useEffect(() => {
    if (!sessionId || !isOpen) return;

    let channel: any;
    let isMounted = true;

    async function fetchMessages() {
      setIsLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*, sender:profiles!messages_sender_id_fkey(name, avatar)")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching messages:", error);
        } else if (isMounted && data) {
          setMessages(data);
        }
      } finally {
        if (isMounted) setIsLoadingMessages(false);
      }

      // Realtime Dinleme
      channel = supabase
        .channel(`dm-realtime-${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `session_id=eq.${sessionId}`,
          },
          async (payload) => {
            const newMsg = payload.new;
            // Gönderici profil bilgilerini çek
            const { data: senderData } = await supabase
              .from("profiles")
              .select("name, avatar")
              .eq("id", newMsg.sender_id)
              .single();

            const msgWithSender = {
              ...newMsg,
              sender: senderData || { name: "Kullanıcı" },
            };

            if (isMounted) {
              setMessages((prev) => {
                // Duplicate koruması
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, msgWithSender];
              });
            }
          }
        )
        .subscribe();
    }

    fetchMessages();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [sessionId, isOpen]);

  // Mesaj gönderme işlemi
  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const text = newMessage.trim();
    if (!text || isSending) return;

    // Eksik değer koruması: session_id ve sender_id (auth.uid()) doğrulaması
    if (!sessionId) {
      toast.error("Geçerli bir oturum kimliği (session_id) bulunamadı.");
      return;
    }

    setIsSending(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        toast.error("Mesaj göndermek için giriş yapmalısınız.");
        setIsSending(false);
        return;
      }

      // DİKKAT: messages tablosunda receiver_id sütunu yoktur!
      // Sadece session_id, sender_id ve content alanları gönderilmelidir.
      const { error } = await supabase.from("messages").insert({
        session_id: sessionId,
        sender_id: user.id, // auth.uid()
        content: text,
      });

      if (error) {
        console.error("Message insert error:", error);
        toast.error("Mesaj iletilemedi: " + error.message);
      } else {
        setNewMessage("");
      }
    } catch (err: any) {
      console.error("Unexpected send message error:", err);
      toast.error("Beklenmeyen bir hata oluştu.");
    } finally {
      setIsSending(false);
    }
  }

  function handleOpenFullScreen() {
    if (!sessionId) return;
    onClose();
    router.push(`/mentorship/session/${sessionId}`);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden flex flex-col h-[600px] max-h-[85vh]">
        {/* Modal Header */}
        <DialogHeader className="p-4 border-b bg-card/60 backdrop-blur flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border">
              <AvatarImage src={targetUser?.avatar} />
              <AvatarFallback>
                {targetUser?.name ? targetUser.name[0] : <User className="w-5 h-5" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                {targetUser?.name || "Kullanıcı"}
                {targetUser?.major && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {targetUser.major}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {targetUser?.university || "Özel Mesajlaşma"}
              </DialogDescription>
            </div>
          </div>

          {sessionId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpenFullScreen}
              className="text-xs text-muted-foreground hover:text-foreground mr-6 flex items-center gap-1.5"
              title="Tam sayfada aç"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tam Sayfada Aç</span>
            </Button>
          )}
        </DialogHeader>

        {/* Mesaj Listesi Alanı */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
          {isLoadingSession || (isLoadingMessages && messages.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p>Sohbet oturumu yükleniyor...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Send className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-foreground text-sm mb-1">
                Henüz mesaj bulunmuyor
              </h4>
              <p className="text-xs max-w-xs">
                {targetUser?.name} ile ilk mesajı paylaşarak sohbeti başlatabilirsiniz.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm shadow-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-xs"
                        : "bg-card border text-card-foreground rounded-bl-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {msg.created_at
                      ? new Date(msg.created_at).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Mesaj Giriş Formu */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 border-t bg-card/80 backdrop-blur flex items-center gap-2"
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              isLoadingSession
                ? "Oturum hazırlanıyor..."
                : `${targetUser?.name || "Kullanıcıya"} mesaj yazın...`
            }
            disabled={isLoadingSession || isSending}
            className="flex-1"
            autoFocus
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || isLoadingSession || isSending}
            className="shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
