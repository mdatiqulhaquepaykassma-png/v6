import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Sparkles, VolumeX, Volume2, Bell, AlertCircle } from "lucide-react";
import { sound } from "../utils/audio";

interface ChatMessage {
  user: string;
  text: string;
  time: string;
  isPing?: boolean;
}

interface LiveChatProps {
  username: string;
  onInspectUser?: (username: string) => void;
  onRequireLogin?: () => void;
}

export const LiveChat: React.FC<LiveChatProps> = ({ username, onInspectUser, onRequireLogin }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [mutedUsers, setMutedUsers] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem("dt_muted_chat_users");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [lastPingTime, setLastPingTime] = useState<number>(0);
  const endRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Sync muted users to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem("dt_muted_chat_users", JSON.stringify(mutedUsers));
    } catch {}
  }, [mutedUsers]);

  const toggleMuteUser = (userToMute: string) => {
    sound.playButtonClick();
    setMutedUsers((prev) =>
      prev.includes(userToMute) ? prev.filter((u) => u !== userToMute) : [...prev, userToMute]
    );
  };

  useEffect(() => {
    // Initial fetch of chat history
    const fetchChat = async () => {
      try {
        const res = await fetch("/api/chat/messages");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setMessages(data);
          }
        }
      } catch (e) {
        // quiet fallback
      }
    };

    fetchChat();
    const pollInterval = setInterval(fetchChat, 2000);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(`${protocol}//${window.location.host}`);
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "CHAT_MESSAGE") {
            if (data.isPing) {
              sound.playChip();
            }
            setMessages((prev) => {
              if (prev.some((m) => m.time === data.time && m.user === data.user && m.text === data.text)) {
                return prev;
              }
              return [...prev.slice(-60), data];
            });
          }
        } catch (e) {
          console.error(e);
        }
      };
      setWs(socket);
    } catch {
      // ws unsupported or blocked
    }

    return () => {
      clearInterval(pollInterval);
      if (socket) socket.close();
    };
  }, []);

  // Auto-scroll behavior to always keep newest message in view
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isGuest = !username || username.toLowerCase().includes("guest");

  const handlePingTable = async () => {
    if (isGuest) {
      onRequireLogin?.();
      return;
    }
    const now = Date.now();
    if (now - lastPingTime < 10000) {
      return; // 10s cooldown
    }
    setLastPingTime(now);
    sound.playChip();

    const pingMsg: ChatMessage = {
      user: username,
      text: "⚡ PING! Ready for real action? Place your bets or challenge me 1v1!",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isPing: true,
    };

    setMessages((prev) => [...prev, pingMsg]);

    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "CHAT", ...pingMsg }));
      } catch {}
    }

    try {
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pingMsg),
      });
    } catch {}
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      onRequireLogin?.();
      return;
    }
    if (!inputText.trim()) return;

    const trimmed = inputText.trim();
    const newMsg: ChatMessage = {
      user: username,
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");

    // 1. Send via WebSocket if open
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "CHAT", ...newMsg }));
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Dual send via REST API to persist in server and broadcast to all HTTP-polling players
    try {
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMsg),
      });
    } catch (e) {
      console.error("Failed to push chat via REST", e);
    }
  };

  const visibleMessages = messages.filter((m) => !mutedUsers.includes(m.user));

  return (
    <div className="flex flex-col h-[420px] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Social Lounge</h3>
            <p className="text-[9px] text-neutral-600 uppercase tracking-tighter">Live player interaction</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {mutedUsers.length > 0 && (
            <button
              onClick={() => setMutedUsers([])}
              className="text-[8px] font-black text-red-500 uppercase tracking-widest hover:text-red-400"
            >
              Unmute All ({mutedUsers.length})
            </button>
          )}
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Messages */}
      <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-6 no-scrollbar">
        {visibleMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-700 text-[10px] uppercase tracking-[0.3em] font-bold italic">
            Silence in the sanctuary
          </div>
        ) : (
          visibleMessages.map((m, idx) => {
            const isSelf = m.user === username;
            return (
              <div key={idx} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onInspectUser && onInspectUser(m.user)}
                      className={`text-[10px] font-bold uppercase tracking-widest hover:underline ${isSelf ? "text-violet-400" : "text-neutral-400"}`}
                    >
                      {m.user}
                    </button>
                    {!isSelf && (
                      <button onClick={() => toggleMuteUser(m.user)} className="text-neutral-700 hover:text-red-500">
                        <VolumeX className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-neutral-700">{m.time}</span>
                </div>
                <div className={`p-4 rounded-2xl text-xs leading-relaxed ${m.isPing ? "bg-violet-500/10 border border-violet-500/20 text-violet-200" : "bg-white/5 text-neutral-400"}`}>
                  {m.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-6 border-t border-white/5 bg-neutral-950/40">
        <div className="relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              if (isGuest) {
                onRequireLogin?.();
                return;
              }
              setInputText(e.target.value);
            }}
            onFocus={() => {
              if (isGuest) {
                onRequireLogin?.();
              }
            }}
            placeholder={isGuest ? "চ্যাট করতে অনুগ্রহ করে লগইন করুন..." : "Write a message..."}
            maxLength={120}
            className="w-full bg-white/5 border border-white/5 focus:border-violet-500/40 rounded-2xl py-3 pl-4 pr-12 text-xs text-white placeholder:text-neutral-500 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-violet-500 text-white disabled:opacity-20 transition-all active:scale-90"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
