import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, VolumeX, Sparkles, MoreVertical } from "lucide-react";
import { sound } from "../utils/audio";

interface ChatMessage {
  id: string;
  user: string;
  userId?: string;
  text: string;
  time: string;
  reactions?: Record<string, string[]>; // emoji -> array of usernames
  isPing?: boolean;
}

interface P2PTableChatProps {
  roomId?: string;
  username: string;
  userId: string;
  onInspectUser?: (userId: string, username: string) => void;
}

const PROFANITY_LIST = ["bitch", "bastard", "shit", "fuck", "damn", "asshole", "sala", "magi", "bal", "chuda", "haramzada"];

function filterProfanity(text: string): string {
  let cleaned = text;
  PROFANITY_LIST.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    cleaned = cleaned.replace(regex, "***");
  });
  return cleaned;
}

const QUICK_EMOJIS = ["❤️", "👍", "🔥", "😮", "😂", "👏"];

export const P2PTableChat: React.FC<P2PTableChatProps> = ({ roomId = "global", username, userId, onInspectUser }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [mutedUsers, setMutedUsers] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem(`p2p_chat_muted_${roomId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeMenuUser, setActiveMenuUser] = useState<string | null>(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(`p2p_chat_muted_${roomId}`, JSON.stringify(mutedUsers));
    } catch {}
  }, [mutedUsers, roomId]);

  // Connect WebSocket / fetch initial
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/chat/messages?roomId=${roomId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setMessages(data);
          }
        }
      } catch {}
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 3000);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(`${protocol}//${window.location.host}`);
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "P2P_CHAT" && (data.roomId === roomId || !data.roomId)) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message.id)) {
                return prev.map((m) => (m.id === data.message.id ? data.message : m));
              }
              return [...prev.slice(-80), data.message];
            });
          }
        } catch {}
      };
      setWs(socket);
    } catch {}

    return () => {
      clearInterval(interval);
      if (socket) socket.close();
    };
  }, [roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const filtered = filterProfanity(inputText.trim());
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user: username,
      userId,
      text: filtered,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      reactions: {},
    };

    setInputText("");
    setMessages((prev) => [...prev, newMsg]);
    sound.playChip();

    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "P2P_CHAT", roomId, message: newMsg }));
      } catch {}
    }

    try {
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newMsg, roomId }),
      });
    } catch {}
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    sound.playButtonClick();
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const currentReactions = { ...(msg.reactions || {}) };
        const usersForEmoji = [...(currentReactions[emoji] || [])];
        const userIndex = usersForEmoji.indexOf(username);

        if (userIndex > -1) {
          usersForEmoji.splice(userIndex, 1);
          if (usersForEmoji.length === 0) {
            delete currentReactions[emoji];
          } else {
            currentReactions[emoji] = usersForEmoji;
          }
        } else {
          usersForEmoji.push(username);
          currentReactions[emoji] = usersForEmoji;
        }

        const updated = { ...msg, reactions: currentReactions };
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: "P2P_CHAT", roomId, message: updated }));
          } catch {}
        }
        return updated;
      })
    );
    setActiveReactionMessageId(null);
  };

  const toggleMuteUser = (targetUsername: string) => {
    sound.playButtonClick();
    setMutedUsers((prev) =>
      prev.includes(targetUsername)
        ? prev.filter((u) => u !== targetUsername)
        : [...prev, targetUsername]
    );
    setActiveMenuUser(null);
  };

  const visibleMessages = messages.filter((m) => !mutedUsers.includes(m.user));

  return (
    <div className="flex flex-col h-full bg-[#0b0f19] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black text-white uppercase tracking-wider">P2P Table Chat & Reactions</span>
        </div>
        <div className="text-[10px] text-neutral-400 font-mono">
          {mutedUsers.length > 0 && <span className="text-rose-400 mr-2">{mutedUsers.length} muted</span>}
          Room: {roomId.slice(0, 8)}
        </div>
      </div>

      {/* Messages List */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {visibleMessages.length === 0 ? (
          <div className="text-center py-12 text-neutral-500 text-xs">
            No messages yet. Click any message to attach emoji reactions!
          </div>
        ) : (
          visibleMessages.map((msg) => {
            const isMe = msg.user === username;
            const showMenu = activeMenuUser === msg.user;
            const showReactionPicker = activeReactionMessageId === msg.id;

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                {/* Sender Name with Context Menu */}
                <div className="relative flex items-center gap-1.5 mb-1">
                  <button
                    onClick={() => {
                      if (!isMe) {
                        setActiveMenuUser(showMenu ? null : msg.user);
                      }
                    }}
                    className={`text-[11px] font-bold hover:underline transition-colors ${
                      isMe ? "text-amber-400" : "text-neutral-300"
                    }`}
                  >
                    @{msg.user}
                  </button>
                  <span className="text-[9px] text-neutral-500 font-mono">{msg.time}</span>

                  {/* Context Menu for Mute */}
                  {showMenu && !isMe && (
                    <div className="absolute top-5 left-0 z-30 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl p-1.5 min-w-[130px] animate-in fade-in zoom-in-95">
                      <button
                        onClick={() => toggleMuteUser(msg.user)}
                        className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-neutral-800 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Mute User</span>
                      </button>
                      {onInspectUser && msg.userId && (
                        <button
                          onClick={() => {
                            setActiveMenuUser(null);
                            onInspectUser(msg.userId!, msg.user);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-blue-400 hover:bg-neutral-800 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <span>Inspect Profile</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div className="relative group max-w-[85%]">
                  <div
                    onClick={() => setActiveReactionMessageId(showReactionPicker ? null : msg.id)}
                    className={`p-3 rounded-2xl text-xs cursor-pointer transition-all border ${
                      isMe
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-100 rounded-tr-none"
                        : "bg-neutral-900 border-neutral-800 text-neutral-200 rounded-tl-none hover:border-neutral-700"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>

                  {/* Quick Reaction Emoji Picker Popup on Click */}
                  {showReactionPicker && (
                    <div className="absolute -top-10 left-0 z-40 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-1.5 flex items-center gap-1 animate-in fade-in zoom-in-95">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleAddReaction(msg.id, emoji)}
                          className="w-7 h-7 rounded-xl hover:bg-neutral-800 flex items-center justify-center text-sm transition-transform hover:scale-125"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Render Attached Reactions */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {Object.entries(msg.reactions).map(([emoji, usersArr]) => {
                        const reactedByMe = usersArr.includes(username);
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleAddReaction(msg.id, emoji)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 transition-all ${
                              reactedByMe
                                ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                                : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                            }`}
                            title={`Reacted by: ${usersArr.join(", ")}`}
                          >
                            <span>{emoji}</span>
                            <span className="font-mono">{usersArr.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-3 bg-neutral-900 border-t border-neutral-800 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type message or click message to react..."
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
          maxLength={250}
        />
        <button
          type="submit"
          className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 shadow transition-all"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
};
