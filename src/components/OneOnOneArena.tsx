import React, { useState, useEffect, useRef } from "react";
import {
  Swords,
  Shield,
  Trophy,
  Users,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageSquare,
  Send,
  Plus,
  Clock,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Coins,
  Sparkles,
  Flame,
  Zap,
  ArrowRight,
  UserCheck,
  Crown,
  HelpCircle,
  X,
  Play,
  Copy,
  Lock as LockIcon
} from "lucide-react";
import { UserWallet, P2PRoom, PlayingCard } from "../types";
import { sound } from "../utils/audio";

interface OneOnOneArenaProps {
  user: UserWallet;
  onUpdateWallet: (updatedUser: UserWallet) => void;
}

interface DuelState {
  matchId: string;
  status: "QUEUE" | "ROLE_COIN_FLIP" | "PEEK_CARDS" | "BETTING" | "SHOWDOWN" | "SETTLED";
  tier: "Express" | "Classic" | "VIP";
  dragonPlayer: {
    userId: string;
    username: string;
    avatarFrame?: string;
    eloRank: number;
    winRate: number;
    card?: PlayingCard;
    currentBet: number;
    action?: "CHECK" | "CALL" | "RAISE" | "ALL_IN" | "FOLD";
    isUser: boolean;
  };
  tigerPlayer: {
    userId: string;
    username: string;
    avatarFrame?: string;
    eloRank: number;
    winRate: number;
    card?: PlayingCard;
    currentBet: number;
    action?: "CHECK" | "CALL" | "RAISE" | "ALL_IN" | "FOLD";
    isUser: boolean;
  };
  userRole: "DRAGON" | "TIGER";
  userCard?: PlayingCard;
  opponentCard?: PlayingCard;
  ante: number;
  currentPot: number;
  currentRaise: number;
  bettingRound: number; // 1, 2, 3
  turnUser: "DRAGON" | "TIGER";
  secondsRemaining: number;
  raisesCount: number; // max 3
  winnerRole?: "DRAGON" | "TIGER" | "TIE";
  foldWinnerRole?: "DRAGON" | "TIGER";
  netProfit?: number;
  spectatorsCount: number;
}

interface ChatMessage {
  id: string;
  sender: string;
  isUser: boolean;
  text: string;
  timestamp: string;
}

interface FloatingEmote {
  id: string;
  emote: string;
  targetRole: "DRAGON" | "TIGER";
}

const VOICE_TAUNTS = [
  { id: "taunt_1", text: "ভাই ফোল্ড দে! (Fold brother!)", audioText: "Fold brother, my card is King!" },
  { id: "taunt_2", text: "আমার কার্ড ভালো! (My card is strong!)", audioText: "My card is super strong!" },
  { id: "taunt_3", text: "Sure তো? (Are you sure?)", audioText: "Are you sure you want to call?" },
  { id: "taunt_4", text: "All-In দিয়ে দেখাও! (All-In if you dare!)", audioText: "Go All In if you dare!" },
  { id: "taunt_5", text: "ব্লাফ দিচ্ছিস না তো? (Is this a bluff?)", audioText: "Are you bluffing me?" },
];

const EMOTES = ["😎", "🤔", "😱", "🔥", "💀", "🤣", "👀", "🎉"];

export const OneOnOneArena: React.FC<OneOnOneArenaProps> = ({ user, onUpdateWallet }) => {
  const [activeMode, setActiveMode] = useState<"lobby" | "in_match" | "spectate">("lobby");
  const [queueTier, setQueueTier] = useState<"Express" | "Classic" | "VIP">("Classic");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchTimer, setSearchTimer] = useState<number>(0);
  
  // Custom challenge state
  const [rooms, setRooms] = useState<P2PRoom[]>([]);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [creatorStake, setCreatorStake] = useState<string>("1000");
  const [opponentStake, setOpponentStake] = useState<string>("5000");
  const [creatorChoice, setCreatorChoice] = useState<"dragon" | "tiger">("dragon");
  
  // Live Duel State
  const [duel, setDuel] = useState<DuelState | null>(null);
  
  // Tactical Squeeze Peeking & Lock States
  const [isBetPlaced, setIsBetPlaced] = useState<boolean>(true); // Bet is placed when room is matched
  const [isPeeked, setIsPeeked] = useState<boolean>(false);
  const [squeezePercent, setSqueezePercent] = useState<number>(0);
  const [isPressingCard, setIsPressingCard] = useState<boolean>(false);
  const [opponentSpeechBubble, setOpponentSpeechBubble] = useState<string | null>(null);
  
  // Stateful Personal Rooms
  const [showCreatePersonal, setShowCreatePersonal] = useState<boolean>(false);
  const [showJoinPersonal, setShowJoinPersonal] = useState<boolean>(false);
  const [personalStake, setPersonalStake] = useState<string>("1");
  const [personalRole, setPersonalRole] = useState<"dragon" | "tiger">("dragon");
  const [personalPassword, setPersonalPassword] = useState<string>("");
  const [newRoomPassword, setNewRoomPassword] = useState<string>("");
  const [personalCreatedRoom, setPersonalCreatedRoom] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  
  const [joinPersonalId, setJoinPersonalId] = useState<string>("");
  const [joinPersonalPassword, setJoinPersonalPassword] = useState<string>("");
  const [challengerStake, setChallengerStake] = useState<string>("1");
  const [roomMinStake, setRoomMinStake] = useState<string>("1");
  const [roomMaxStake, setRoomMaxStake] = useState<string>("100000");
  const [selectedRoomDetails, setSelectedRoomDetails] = useState<any | null>(null);
  const [personalJoinError, setPersonalJoinError] = useState<string>("");
  const [createRoomError, setCreateRoomError] = useState<string>("");
  const [waitingRoomData, setWaitingRoomData] = useState<P2PRoom | null>(null);
  const [expiryCountdown, setExpiryCountdown] = useState<string>("");

  const [lobbyTab, setLobbyTab] = useState<"rooms" | "history">("rooms");
  const [historyRooms, setHistoryRooms] = useState<P2PRoom[]>([]);

  const fetchHistoryRooms = async () => {
    if (!user?.userId) return;
    try {
      const res = await fetch(`/api/rooms/history/${user.userId}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setHistoryRooms(data);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (lobbyTab === "history" && user?.userId) {
      fetchHistoryRooms();
      const interval = setInterval(fetchHistoryRooms, 5000);
      return () => clearInterval(interval);
    }
  }, [lobbyTab, user?.userId]);

  // Automatic Join-Link Detector & Processer on component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinRoomId = params.get("join");
    
    if (joinRoomId && user?.userId) {
      // Open manual Join Modal with prefilled Room ID to require password
      setJoinPersonalId(joinRoomId);
      setShowJoinPersonal(true);
      setPersonalJoinError("🔑 এই ব্যক্তিগত ডুয়েল রুমে যোগ দিতে পাসওয়ার্ড দিন।");
      
      // Clean URL query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user?.userId]);
  
  
  // Audio & Voice States
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isMutedOpponent, setIsMutedOpponent] = useState<boolean>(false);
  
  // Chat & Emotes
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [floatingEmotes, setFloatingEmotes] = useState<FloatingEmote[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Synchronized Multi-User Chat Poller Loop
  useEffect(() => {
    const fetchChat = async () => {
      try {
        const res = await fetch("/api/chat/messages");
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const messages = await res.json();
            if (Array.isArray(messages)) {
              const mapped = messages.map((m: any, idx: number) => ({
                id: `chat_${idx}_${m.time}`,
                sender: m.user,
                isUser: m.user === user?.username,
                text: m.text,
                timestamp: m.time,
              }));
              setChatLog(mapped);
            }
          }
        }
      } catch (e) {
        console.warn(e);
      }
    };
    
    fetchChat();
    const interval = setInterval(fetchChat, 1500);
    return () => clearInterval(interval);
  }, [user.username]);

  // Card Squeezing & Peeling tactile spring hook
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPressingCard && !isPeeked) {
      interval = setInterval(() => {
        setSqueezePercent((prev) => {
          if (prev >= 100) {
            setIsPeeked(true);
            sound.playCardFlip();
            sound.speak("You have fully peeked at your card!");
            
            // Post peek state to backend stateful engine!
            if (duel?.matchId) {
              fetch(`/api/rooms/duel/${duel.matchId}/peek`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.userId }),
              }).catch(() => {});
            }
            
            clearInterval(interval);
            return 100;
          }
          if (prev % 18 === 0) {
            sound.playCardFlip();
          }
          return prev + 6;
        });
      }, 50);
    } else if (!isPressingCard && !isPeeked && squeezePercent > 0) {
      // Spring decay
      interval = setInterval(() => {
        setSqueezePercent((prev) => {
          if (prev <= 0) {
            clearInterval(interval);
            return 0;
          }
          return prev - 8;
        });
      }, 40);
    }
    return () => clearInterval(interval);
  }, [isPressingCard, isPeeked, squeezePercent, duel?.matchId, user.userId]);

  // Stateful Multi-User Duel Polling Loop
  useEffect(() => {
    if (activeMode !== "in_match" || !duel?.matchId) return;
    
    let isMounted = true;
    const pollState = async () => {
      try {
        const res = await fetch(`/api/rooms/duel/${duel.matchId}?userId=${user.userId}`);
        if (res.ok) {
          const serverDuel = await res.json();
          if (!isMounted) return;
          
          setDuel((prev) => {
            if (!prev) return null;
            
            const isCreator = user.userId === serverDuel.creatorId;
            
            // Map player roles
            const dragonPlayer = {
              userId: serverDuel.creatorRole === "DRAGON" ? serverDuel.creatorId : serverDuel.acceptorId,
              username: serverDuel.creatorRole === "DRAGON" ? serverDuel.creatorName : serverDuel.acceptorName,
              eloRank: serverDuel.creatorRole === "DRAGON" ? serverDuel.creatorElo : serverDuel.acceptorElo,
              winRate: 58,
              card: serverDuel.creatorRole === "DRAGON" ? serverDuel.creatorCard : serverDuel.acceptorCard,
              currentBet: serverDuel.creatorRole === "DRAGON" ? serverDuel.creatorBet : serverDuel.acceptorBet,
              action: serverDuel.creatorRole === "DRAGON" ? serverDuel.creatorAction : serverDuel.acceptorAction,
              isUser: serverDuel.creatorRole === "DRAGON" ? isCreator : !isCreator,
            };
            
            const tigerPlayer = {
              userId: serverDuel.creatorRole === "TIGER" ? serverDuel.creatorId : serverDuel.acceptorId,
              username: serverDuel.creatorRole === "TIGER" ? serverDuel.creatorName : serverDuel.acceptorName,
              eloRank: serverDuel.creatorRole === "TIGER" ? serverDuel.creatorElo : serverDuel.acceptorElo,
              winRate: 54,
              card: serverDuel.creatorRole === "TIGER" ? serverDuel.creatorCard : serverDuel.acceptorCard,
              currentBet: serverDuel.creatorRole === "TIGER" ? serverDuel.creatorBet : serverDuel.acceptorBet,
              action: serverDuel.creatorRole === "TIGER" ? serverDuel.creatorAction : serverDuel.acceptorAction,
              isUser: serverDuel.creatorRole === "TIGER" ? isCreator : !isCreator,
            };
            
            // Rich Audio triggers
            if (prev.status !== serverDuel.status) {
              if (serverDuel.status === "PEEK_CARDS") {
                sound.speak("Squeeze and peel your card to peek secretly!");
              } else if (serverDuel.status === "BETTING") {
                sound.playChipStack();
                sound.speak(serverDuel.turnUser === prev.userRole ? "Your turn to act!" : "Opponent's turn to act!");
              } else if (serverDuel.status === "SHOWDOWN") {
                sound.playCardFlip();
                sound.speak("Showdown! Revealing cards...");
              } else if (serverDuel.status === "SETTLED") {
                // Instantly sync wallet
                fetch(`/api/wallet/${user.userId}`)
                  .then((r) => r.json())
                  .then((updated) => onUpdateWallet(updated))
                  .catch(() => {});
              }
            }
            
            // Track opponent actions to play chip clink & custom speech bubble taunts
            const oppRole = prev.userRole === "DRAGON" ? "TIGER" : "DRAGON";
            const prevOppAction = oppRole === "DRAGON" ? prev.dragonPlayer.action : prev.tigerPlayer.action;
            const nextOppAction = oppRole === "DRAGON" ? dragonPlayer.action : tigerPlayer.action;
            const oppName = oppRole === "DRAGON" ? dragonPlayer.username : tigerPlayer.username;
            
            if (prevOppAction !== nextOppAction && nextOppAction) {
              sound.playChip();
              let tauntText = "";
              if (nextOppAction === "RAISE") {
                tauntText = "ডাবল বাড়ালাম! দেখি আপনার সাহস কত!";
              } else if (nextOppAction === "CALL") {
                tauntText = "কল দিলাম! শেষ পর্যন্ত খেলবো!";
              } else if (nextOppAction === "CHECK") {
                tauntText = "চেক দিলাম ভাই, আপনার চাল দিন...";
              } else if (nextOppAction === "ALL_IN") {
                tauntText = "অল-ইন মারলাম! কল দেওয়ার দম আছে?";
              } else if (nextOppAction === "FOLD") {
                tauntText = "ফোল্ড দিলাম! ভালো খেলেছেন ভাই...";
              }
              if (tauntText) {
                setOpponentSpeechBubble(tauntText);
                sound.speak(`${oppName} says ${tauntText}`);
                setTimeout(() => setOpponentSpeechBubble(null), 4000);
              }
            }
            
            return {
              ...prev,
              status: serverDuel.status,
              dragonPlayer,
              tigerPlayer,
              userCard: prev.userRole === "DRAGON" ? serverDuel.creatorCard : serverDuel.acceptorCard,
              opponentCard: prev.userRole === "DRAGON" ? serverDuel.acceptorCard : serverDuel.creatorCard,
              currentPot: serverDuel.currentPot,
              currentRaise: serverDuel.currentRaise,
              bettingRound: serverDuel.bettingRound,
              turnUser: serverDuel.turnUser,
              secondsRemaining: serverDuel.secondsRemaining,
              raisesCount: serverDuel.raisesCount,
              winnerRole: serverDuel.winnerRole,
              foldWinnerRole: serverDuel.foldWinnerRole,
              netProfit: prev.userRole === "DRAGON" ? serverDuel.netProfitCreator : serverDuel.netProfitAcceptor,
            };
          });
        }
      } catch (e) {
        console.error("Duel poll error:", e);
      }
    };
    
    pollState();
    const interval = setInterval(pollState, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeMode, duel?.matchId, user.userId]);

  // Fetch open rooms for custom duel challenges
  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatLog]);

  // Matchmaking Queue Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setSearchTimer(0);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  // Handle waiting lobby auto-match detection and expiry
  useEffect(() => {
    if (!showJoinPersonal || !joinPersonalId) {
      setWaitingRoomData(null);
      return;
    }

    const currentRoom = rooms.find(r => r.id === joinPersonalId);
    
    // If room is no longer in open rooms list, check if it was matched or deleted
    if (!currentRoom) {
      // If we were waiting and it's gone, it might have matched or expired
      // The main pollState handles matched duels and sets activeMode to in_match
      // So if activeMode is already in_match, we just close the modal
      if (activeMode === "in_match") {
        setShowJoinPersonal(false);
      }
      return;
    }

    setWaitingRoomData(currentRoom);

    // Countdown logic
    const updateCountdown = () => {
      const now = Date.now();
      const created = new Date(currentRoom.createdAt!).getTime();
      const expiry = created + (5 * 60 * 1000);
      const remaining = expiry - now;

      if (remaining <= 0) {
        setExpiryCountdown("Expired");
        setShowJoinPersonal(false);
        setPersonalJoinError("⌛ রুমের সময় শেষ হয়ে গেছে! এটি স্বয়ংক্রিয়ভাবে ক্লোজ হয়ে গেছে।");
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setExpiryCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [showJoinPersonal, joinPersonalId, rooms, activeMode]);

  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);

  // Private Room Creation Handler
  const handleCreatePersonalChallenge = async () => {
    sound.playButtonClick();
    setPersonalJoinError("");
    setCreateRoomError("");
    const stakeNum = 1;
    const minNum = 1;
    const maxNum = 100000;
    
    if (!personalPassword.trim()) {
      alert("🚫 দয়া করে রুমের জন্য একটি পাসওয়ার্ড টাইপ করুন।");
      return;
    }
    
    if (user.balance < stakeNum) {
      setCreateRoomError("Insufficient fund to create room");
      return;
    }

    try {
      const randomChoice = Math.random() > 0.5 ? "dragon" : "tiger";
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.userId,
          username: user.username,
          amount: stakeNum,
          choice: randomChoice,
          odds: 2.0,
          isPrivate: true,
          password: personalPassword.trim(),
          minStake: minNum,
          maxStake: maxNum
        }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        setPersonalCreatedRoom(data.room);
        setCreatedRoomId(data.room.id); // Enable polling
        onUpdateWallet(data.user);
        fetchRooms();
      } else {
        alert(data.error || "ব্যক্তিগত রুম তৈরি করতে ব্যর্থ হয়েছে।");
      }
    } catch (e) {
      console.error(e);
      alert("নেটওয়ার্ক সংযোগ ত্রুটি!");
    }
  };

  // Private Room Manual Join Handler
  const handleJoinPersonalChallenge = async () => {
    sound.playButtonClick();
    setPersonalJoinError("");
    
    if (!joinPersonalId.trim()) {
      setPersonalJoinError("🚫 রুম আইডি টাইপ করুন।");
      return;
    }
    if (!joinPersonalPassword.trim()) {
      setPersonalJoinError("🚫 পাসওয়ার্ড টাইপ করুন।");
      return;
    }
    const cStake = Number(challengerStake);
    if (isNaN(cStake) || cStake < 1) {
      setPersonalJoinError("🚫 বৈধ বাজির পরিমাণ দিন (ন্যূনতম ১ চিপস)।");
      return;
    }

    try {
      const res = await fetch("/api/rooms/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: joinPersonalId.trim(),
          userId: user.userId,
          username: user.username,
          password: joinPersonalPassword.trim(),
          acceptorStake: cStake
        }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        setShowJoinPersonal(false);
        setJoinPersonalId("");
        setJoinPersonalPassword("");
        startInteractiveDuel(data.room, data.room.creatorId === user.userId);
        
        // Reload wallet balance
        fetch(`/api/wallet/${user.userId}`)
          .then((r) => r.json())
          .then((updated) => onUpdateWallet(updated))
          .catch(() => {});
      } else {
        setPersonalJoinError(data.error || "🚫 পাসওয়ার্ড বা রুম আইডি ভুল!");
      }
    } catch (e) {
      console.error(e);
      setPersonalJoinError("🚫 নেটওয়ার্ক সংযোগ ত্রুটি!");
    }
  };

  const startInteractiveDuel = (match: any, isCreator: boolean) => {
    const ante = match.amount;
    const isDragon = match.choice === "dragon" ? isCreator : !isCreator;
    const userElo = user.cosmetics?.eloRating || 1250;

    setIsBetPlaced(true);
    setIsPeeked(false);
    setSqueezePercent(0);
    setIsPressingCard(false);
    setOpponentSpeechBubble(null);

    const initialDuel: DuelState = {
      matchId: match.id,
      status: "ROLE_COIN_FLIP",
      tier: queueTier,
      dragonPlayer: {
        userId: match.choice === "dragon" ? match.creatorId : match.acceptorId || "player_2",
        username: match.choice === "dragon" ? match.creatorName : match.acceptorName || "Opponent",
        eloRank: userElo,
        winRate: 0,
        card: match.dragonCard,
        currentBet: ante,
        isUser: isCreator ? match.choice === "dragon" : match.choice !== "dragon",
      },
      tigerPlayer: {
        userId: match.choice === "tiger" ? match.creatorId : match.acceptorId || "player_2",
        username: match.choice === "tiger" ? match.creatorName : match.acceptorName || "Opponent",
        eloRank: userElo,
        winRate: 0,
        card: match.tigerCard,
        currentBet: match.acceptorAmount || ante,
        isUser: isCreator ? match.choice === "tiger" : match.choice !== "tiger",
      },
      userRole: isDragon ? "DRAGON" : "TIGER",
      userCard: isDragon ? match.dragonCard : match.tigerCard,
      opponentCard: isDragon ? match.tigerCard : match.dragonCard,
      ante,
      currentPot: match.amount + (match.acceptorAmount || match.amount),
      currentRaise: ante,
      bettingRound: 1,
      turnUser: "DRAGON",
      secondsRemaining: 60,
      raisesCount: 0,
      spectatorsCount: Math.floor(Math.random() * 12) + 5,
      winnerRole: match.winner.toUpperCase() as "DRAGON" | "TIGER" | "TIE",
    };

    setDuel(initialDuel);
    setActiveMode("in_match");
    setIsSearching(false);

    sound.speak("Match found! Connected with opponent player. Squeeze and peel your card!");
  };

  // Poll open rooms and handle created room completion
  useEffect(() => {
    if (!createdRoomId || !isSearching) return;
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/rooms").catch(() => null);
        if (res && res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const allRooms: P2PRoom[] = await res.json();
            const match = allRooms.find((r) => r.id === createdRoomId);
            if (match && match.status === "matched") {
              setIsSearching(false);
              setCreatedRoomId(null);
              const isCreator = match.creatorId === user.userId;
              startInteractiveDuel(match, isCreator);

              fetch(`/api/wallet/${user.userId}`)
                .then((r) => r.json())
                .then((updated) => onUpdateWallet(updated))
                .catch(() => {});
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    const interval = setInterval(checkStatus, 1500);
    return () => clearInterval(interval);
  }, [createdRoomId, isSearching, user.userId, queueTier]);

  // Handle Find Match Trigger - Instant entry to game table without waiting
  const handleStartMatchmaking = async (tier: "Express" | "Classic" | "VIP") => {
    sound.playButtonClick();
    setQueueTier(tier);
    const ante = tier === "Express" ? 100 : tier === "Classic" ? 500 : 2000;

    if (user.balance < ante) {
      alert("Insufficient balance for this stake!");
      return;
    }

    try {
      // 1. Check if an open room from another real user exists
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const existingRooms: P2PRoom[] = await res.json();
        const availableOpen = existingRooms.find((r) => r.status === "open" && r.creatorId !== user.userId);
        if (availableOpen) {
          await handleAcceptRealChallenge(availableOpen.id);
          return;
        }
      }

      // 2. If no open room exists, create an authentic open room for real peer players
      const createRes = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.userId,
          username: user.username,
          amount: ante,
          choice: Math.random() > 0.5 ? "dragon" : "tiger",
          odds: 2.0,
        }),
      });
      const data = await createRes.json();
      if (data.success && data.room) {
        setCreatedRoomId(data.room.id);
        setIsSearching(true);
        onUpdateWallet(data.user);
      } else {
        alert(data.error || "Failed to create matchmaking room. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Network error connecting to matchmaking lobby.");
    }
  };

  const handleCancelMatchmaking = async () => {
    if (createdRoomId) {
      try {
        const res = await fetch("/api/rooms/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: createdRoomId, userId: user.userId }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          onUpdateWallet(data.user);
        }
      } catch (e) {
        console.error(e);
      }
    }
    setCreatedRoomId(null);
    setPersonalCreatedRoom(null); // Reset personal room state
    setIsSearching(false);
  };

  const handleAcceptRealChallenge = async (roomId: string) => {
    sound.playButtonClick();
    try {
      const res = await fetch("/api/rooms/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          userId: user.userId,
          username: user.username,
        }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        const match = data.room;
        const isCreator = match.creatorId === user.userId;
        startInteractiveDuel(match, isCreator);

        fetch(`/api/wallet/${user.userId}`)
          .then((r) => r.json())
          .then((updated) => onUpdateWallet(updated))
          .catch(() => {});
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Card Strength Glow & Category Identifier
  const getCardStrengthGlow = (card?: PlayingCard) => {
    if (!card) return { glow: "shadow-neutral-800 border-neutral-700", text: "Unknown", color: "text-neutral-400" };
    if (card.value >= 11) {
      return {
        glow: "border-emerald-500 shadow-xl shadow-emerald-500/40 bg-emerald-950/30",
        text: "🔥 STRONG (K/Q/J)",
        color: "text-emerald-400"
      };
    } else if (card.value >= 8) {
      return {
        glow: "border-amber-400 shadow-xl shadow-amber-500/30 bg-amber-950/30",
        text: "✨ GOOD (8-10)",
        color: "text-amber-300"
      };
    } else if (card.value >= 4) {
      return {
        glow: "border-orange-500 shadow-lg shadow-orange-500/20 bg-orange-950/30",
        text: "⚠️ MEDIUM-WEAK (4-7)",
        color: "text-orange-400"
      };
    } else {
      return {
        glow: "border-red-600 shadow-xl shadow-red-600/50 bg-red-950/40",
        text: "💀 VERY WEAK (A/2/3)",
        color: "text-red-400"
      };
    }
  };

  // Handle Poker Betting Action - STATEFUL MULTIPLAYER SERVER COMMAND
  const handleBettingAction = async (action: "CHECK" | "CALL" | "RAISE_2X" | "RAISE_3X" | "ALL_IN" | "FOLD") => {
    if (!duel || duel.status !== "BETTING") return;
    sound.playButtonClick();

    try {
      const res = await fetch(`/api/rooms/duel/${duel.matchId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.userId,
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Action failed");
        return;
      }
      
      // Card chip stack clinking sounds
      sound.playChip();
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Voice Taunt trigger
  const handleSendTaunt = async (taunt: typeof VOICE_TAUNTS[0]) => {
    sound.playButtonClick();
    if (sound.voiceEnabled) {
      sound.speak(taunt.audioText);
    }
    try {
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: user.username,
          text: `🗣️ Voice Taunt: "${taunt.text}"`,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Emote Trigger
  const handleSendEmote = (emote: string) => {
    sound.playButtonClick();
    const newEmote: FloatingEmote = {
      id: `emote_${Date.now()}`,
      emote,
      targetRole: duel?.userRole === "DRAGON" ? "TIGER" : "DRAGON"
    };
    setFloatingEmotes((prev) => [...prev, newEmote]);
    setTimeout(() => {
      setFloatingEmotes((prev) => prev.filter((e) => e.id !== newEmote.id));
    }, 2500);
  };

  // Handle Send Text Message - POST TO GLOBAL SYNC CHAT
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");
    
    try {
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: user.username,
          text,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const userGlow = getCardStrengthGlow(duel?.userCard);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* Lobby View & Queue Selection */}
      {activeMode === "lobby" && (
        <div className="space-y-4 sm:space-y-5">
          {/* Minimal Clean Hero Banner */}
          <div className="relative rounded-2xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border border-amber-500/25 p-4 sm:p-5 shadow-xl overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                  <Swords className="w-3.5 h-3.5 text-amber-400" />
                  <span>1v1 DUAL ARENA</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Head-to-Head Card Battle
                </h1>
                <p className="text-xs text-neutral-400">
                  Real-time turn-based card duel. Higher card takes 95% of pot.
                </p>
              </div>

              {/* Player Stats Chips */}
              <div className="flex items-center gap-2 bg-black/60 border border-white/10 p-2 rounded-xl backdrop-blur-md">
                <div className="text-center px-3">
                  <div className="text-[9px] uppercase text-neutral-500 font-bold">Rating</div>
                  <div className="text-sm font-black text-amber-400 flex items-center justify-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{user.cosmetics?.eloRating || 1250}</span>
                  </div>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="text-center px-3">
                  <div className="text-[9px] uppercase text-neutral-500 font-bold">Played</div>
                  <div className="text-sm font-black text-emerald-400 flex items-center justify-center gap-1">
                    <Swords className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{user.gamesPlayed || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Minimal Clean Matchmaking Queue Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Express Queue */}
            <div className="bg-neutral-900/90 border border-white/10 hover:border-amber-500/40 rounded-xl p-4 shadow-lg transition-all flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Express
                  </span>
                  <span className="text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/25">
                    ৳100 Ante
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">Fast 10s decision rounds</p>
              </div>

              <button
                onClick={() => handleStartMatchmaking("Express")}
                disabled={isSearching}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-amber-300 hover:text-white font-black rounded-lg border border-amber-500/30 hover:border-amber-400 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow"
              >
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                <span>Play Express (৳100)</span>
              </button>
            </div>

            {/* Classic Queue */}
            <div className="bg-neutral-900/95 border-2 border-amber-500/60 hover:border-amber-400 rounded-xl p-4 shadow-lg transition-all flex flex-col justify-between space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-500 text-neutral-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg">
                Popular
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-300 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-amber-400" /> Classic
                  </span>
                  <span className="text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                    ৳500 Ante
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">Standard 15s strategic turns</p>
              </div>

              <button
                onClick={() => handleStartMatchmaking("Classic")}
                disabled={isSearching}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black rounded-lg shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Play Classic (৳500)</span>
              </button>
            </div>

            {/* VIP Queue */}
            <div className="bg-neutral-900/90 border border-white/10 hover:border-amber-500/40 rounded-xl p-4 shadow-lg transition-all flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-amber-400" /> VIP Lounge
                  </span>
                  <span className="text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/25">
                    ৳2,000 Ante
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">High-stakes diamond battle</p>
              </div>

              <button
                onClick={() => handleStartMatchmaking("VIP")}
                disabled={isSearching}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-amber-300 hover:text-white font-black rounded-lg border border-amber-500/30 hover:border-amber-400 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Play VIP (৳2,000)</span>
              </button>
            </div>
          </div>

          {/* Minimal Private Duel Action Bar */}
          <div className="bg-neutral-950/80 border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Private Duel</span>
                <span className="text-[11px] text-neutral-500">Play with friends using custom room code</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={() => {
                  sound.playButtonClick();
                  setShowCreatePersonal(true);
                  setPersonalCreatedRoom(null);
                }}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Room</span>
              </button>
              
              <button
                onClick={() => {
                  sound.playButtonClick();
                  setShowJoinPersonal(true);
                  setPersonalJoinError("");
                }}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-amber-400/50 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                <span>Join with Code</span>
              </button>
            </div>
          </div>

          {/* Searching Modal Overlay */}
          {isSearching && (
            <div className="p-5 bg-neutral-900/95 border-2 border-amber-500/60 rounded-xl text-center space-y-3 backdrop-blur-md shadow-2xl animate-pulse">
              <div className="inline-flex w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400 items-center justify-center text-amber-400">
                <Swords className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-black text-amber-300">
                  {personalCreatedRoom ? "Waiting for Opponent..." : "Searching for Match..."}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {personalCreatedRoom 
                    ? `Room ID: ${personalCreatedRoom.id} · Password: ${personalCreatedRoom.password || "None"}`
                    : `Matching ${queueTier} tier (${searchTimer}s)`
                  }
                </p>
              </div>
              <button
                onClick={handleCancelMatchmaking}
                className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-lg border border-neutral-700 hover:border-amber-400 transition-colors cursor-pointer"
              >
                Cancel Matchmaking
              </button>
            </div>
          )}

          {/* Tab Selection for Active Rooms and History */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h2 className="text-base sm:text-lg font-bold text-white font-black">১v১ চ্যালেঞ্জ কন্ট্রোল প্যানেল (Lobby Control)</h2>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    sound.playButtonClick();
                    setLobbyTab("rooms");
                  }}
                  className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-xl border transition-all ${
                    lobbyTab === "rooms"
                      ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-md"
                      : "bg-neutral-950 text-neutral-400 border-neutral-850 hover:text-white"
                  }`}
                >
                  🟢 সক্রিয় রুম লিস্ট ({rooms.filter((r) => r.status === "open").length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playButtonClick();
                    setLobbyTab("history");
                  }}
                  className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-xl border transition-all ${
                    lobbyTab === "history"
                      ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-md"
                      : "bg-neutral-950 text-neutral-400 border-neutral-850 hover:text-white"
                  }`}
                >
                  📜 আমার ডুয়েল হিস্ট্রি
                </button>
              </div>
            </div>

            {lobbyTab === "rooms" ? (
              <div className="space-y-4">
                {rooms.filter((r) => r.status === "open").length === 0 ? (
                  <div className="p-8 text-center bg-neutral-950/60 rounded-xl border border-neutral-850 text-neutral-500 text-xs space-y-2">
                    <p>No active rooms online right now.</p>
                    <p className="text-[11px] text-amber-400 font-medium">Use matchmaking or click "Create Personal Room" above to start!</p>
                  </div>
                ) : (
                  <div className="max-h-[380px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                    {rooms
                      .filter((r) => r.status === "open")
                      .map((room) => {
                        const isMyRoom = room.creatorId === user.userId;
                        return (
                          <div
                            key={room.id}
                            onClick={() => {
                              sound.playButtonClick();
                              setSelectedRoomDetails(room);
                            }}
                            className={`p-3.5 rounded-xl space-y-2.5 transition-all bg-neutral-950/80 border cursor-pointer hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 ${
                              isMyRoom
                                ? "border-amber-500/50 shadow-lg shadow-amber-500/5 bg-gradient-to-br from-neutral-950 via-neutral-950 to-amber-950/10"
                                : "border-neutral-850"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center font-bold text-amber-300 text-xs">
                                  {room.creatorName.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <span>{room.creatorName}</span>
                                    {isMyRoom && (
                                      <span className="text-[8px] font-black bg-amber-500 text-neutral-950 px-1 py-0.5 rounded uppercase">YOU</span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-neutral-500 flex items-center gap-1">
                                    <span>{room.isPrivate ? "🔒 ব্যক্তিগত রুম" : "🌍 উন্মুক্ত লবি"}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-black text-amber-400">৳{room.amount.toLocaleString()}</div>
                                <div className="text-[9px] text-neutral-500">Odds: {room.odds || 2.0}x</div>
                              </div>
                            </div>

                            {isMyRoom ? (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  sound.playButtonClick();
                                  try {
                                    const res = await fetch("/api/rooms/cancel", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ roomId: room.id, userId: user.userId }),
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                      alert("সফলভাবে আপনার সক্রিয় চ্যালেঞ্জ রুমটি ক্যান্সেল ও রিফান্ড করা হয়েছে।");
                                      if (data.user) onUpdateWallet(data.user);
                                      fetchRooms();
                                    } else {
                                      alert(data.error || "রুম ডিলিট করতে ব্যর্থ হয়েছে।");
                                    }
                                  } catch (err) {
                                    alert("নেটওয়ার্ক ত্রুটি!");
                                  }
                                }}
                                className="w-full py-2 bg-neutral-900 hover:bg-red-600/85 text-red-300 hover:text-white border border-red-500/20 hover:border-red-500 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>ক্যান্সেল ও রিফান্ড (Delete Room)</span>
                              </button>
                            ) : room.isPrivate ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sound.playButtonClick();
                                    setSelectedRoomDetails(room);
                                  }}
                                  className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1 border border-neutral-700"
                                >
                                  <span>রুম ডেসক্রিপশন</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sound.playButtonClick();
                                    setJoinPersonalId(room.id);
                                    setChallengerStake(String(room.minStake || 1));
                                    setShowJoinPersonal(true);
                                    setPersonalJoinError("");
                                  }}
                                  className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1 shadow"
                                >
                                  <LockIcon className="w-3.5 h-3.5" />
                                  <span>রুম এ জয়েন করুন</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sound.playButtonClick();
                                    setSelectedRoomDetails(room);
                                  }}
                                  className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1 border border-neutral-700"
                                >
                                  <span>রুম ডেসক্রিপশন</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sound.playButtonClick();
                                    handleAcceptRealChallenge(room.id);
                                  }}
                                  className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1 shadow"
                                >
                                  <Swords className="w-3.5 h-3.5" />
                                  <span>রুম এ জয়েন করুন</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {historyRooms.length === 0 ? (
                  <div className="p-8 text-center bg-neutral-950/60 rounded-xl border border-neutral-850 text-neutral-500 text-xs">
                    <p>আপনার পূর্বের কোন ডুয়েল খেলার রেকর্ড পাওয়া যায়নি।</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-neutral-850 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-950 text-neutral-400 uppercase tracking-wider font-bold">
                        <tr>
                          <th className="p-3">রুম আইডি / তারিখ</th>
                          <th className="p-3">প্রতিপক্ষ</th>
                          <th className="p-3">বাজির অ্যামাউন্ট</th>
                          <th className="p-3">ফলাফল / কার্ড</th>
                          <th className="p-3 text-right">স্ট্যাটাস</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-850">
                        {historyRooms.map((hr) => {
                          const isCreator = hr.creatorId === user.userId;
                          const opponentName = isCreator ? hr.acceptorName || "Wait for Friend" : hr.creatorName;
                          const winStatus = hr.status === "completed" && hr.winner
                            ? (hr.winner === "tie" ? "TIE" : (isCreator && hr.choice === hr.winner ? "WON" : (!isCreator && hr.choice !== hr.winner ? "WON" : "LOST")))
                            : "";
                          
                          const formattedTime = new Date(hr.createdAt).toLocaleString("bn-BD", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit"
                          });

                          return (
                            <tr key={hr.id} className="hover:bg-neutral-950/40 text-neutral-300">
                              <td className="p-3">
                                <div className="font-mono text-[10px] text-amber-400 font-bold">{hr.id}</div>
                                <div className="text-[9px] text-neutral-500 mt-0.5">{formattedTime}</div>
                              </td>
                              <td className="p-3">
                                <span className="font-bold">{opponentName}</span>
                                <div className="text-[9px] text-neutral-500">Role: {isCreator ? hr.choice?.toUpperCase() : (hr.choice === "dragon" ? "TIGER" : "DRAGON")}</div>
                              </td>
                              <td className="p-3">
                                <div className="font-bold">৳{hr.amount.toLocaleString()}</div>
                                <div className="text-[9px] text-neutral-500">Odds: {hr.odds || 2.0}x</div>
                              </td>
                              <td className="p-3">
                                {hr.status === "completed" ? (
                                  <div className="space-y-1">
                                    <div className={`font-black text-[10px] uppercase ${
                                      winStatus === "WON" ? "text-emerald-400" : winStatus === "LOST" ? "text-red-400" : "text-amber-400"
                                    }`}>
                                      {winStatus === "WON" ? "🏆 WIN" : winStatus === "LOST" ? "❌ LOSS" : "🤝 TIE"}
                                    </div>
                                    {hr.dragonCard && hr.tigerCard && (
                                      <div className="text-[9px] text-neutral-400 font-mono flex items-center gap-1 flex-wrap">
                                        <span className="text-red-400">🐉 D: {hr.dragonCard.rank}{hr.dragonCard.suit}</span>
                                        <span>vs</span>
                                        <span className="text-amber-400">🐯 T: {hr.tigerCard.rank}{hr.tigerCard.suit}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-neutral-500 text-[10px]">—</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  hr.status === "open"
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : hr.status === "matched"
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : hr.status === "completed"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-neutral-800 text-neutral-400"
                                }`}>
                                  {hr.status === "open" ? "সক্রিয় (Open)" : hr.status === "matched" ? "চলমান" : hr.status === "completed" ? "সমাপ্ত" : "বাতিল"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =======================================================================
         CREATE PERSONAL PRIVATE ROOM MODAL SCREEN
         ======================================================================= */}
      {showCreatePersonal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-amber-500/40 rounded-2xl w-full max-w-md p-6 relative shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                sound.playButtonClick();
                setShowCreatePersonal(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 mb-4 shrink-0">
              <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400 animate-pulse" />
                <span>ব্যক্তিগত রুম তৈরি করুন (Create Private Room)</span>
              </h2>
              <p className="text-xs text-neutral-400">
                পাসওয়ার্ড প্রটেক্টেড ডুয়েল চ্যালেঞ্জ তৈরি করে সরাসরি বন্ধুর সাথে খেলুন।
              </p>
            </div>

            <div className="overflow-y-auto pr-1 space-y-4 custom-scrollbar flex-1">
            {!personalCreatedRoom ? (
              rooms.some((r) => r.creatorId === user.userId && r.status === "open") ? (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-3 text-center">
                  <div className="text-2xl">🚫</div>
                  <h4 className="text-xs font-black text-red-400 uppercase tracking-wider">রুম তৈরির সীমা অতিক্রম হয়েছে</h4>
                  <p className="text-xs text-neutral-300">
                    আপনার ইতিমধ্যে একটি সক্রিয় ডুয়েল রুম রয়েছে (রুম আইডি: <span className="font-mono text-amber-400 font-bold">{rooms.find((r) => r.creatorId === user.userId && r.status === "open")?.id}</span>)।
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    ১ বারে শুধুমাত্র ১টি রুম সক্রিয় রাখা সম্ভব। নতুন রুম তৈরি করতে বর্তমান সক্রিয় রুমটি ডিলিট করতে হবে।
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      sound.playButtonClick();
                      const activeRoomId = rooms.find((r) => r.creatorId === user.userId && r.status === "open")?.id;
                      if (!activeRoomId) return;
                      try {
                        const res = await fetch("/api/rooms/cancel", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ roomId: activeRoomId, userId: user.userId }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          alert("সফলভাবে আপনার পূর্বের সক্রিয় রুমটি ডিলিট ও রিফান্ড করা হয়েছে।");
                          if (data.user) onUpdateWallet(data.user);
                          fetchRooms();
                        } else {
                          alert(data.error || "রুম ক্যান্সেল করতে ব্যর্থ হয়েছে।");
                        }
                      } catch (err) {
                        alert("নেটওয়ার্ক ত্রুটি!");
                      }
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>বর্তমান সক্রিয় রুম ডিলিট ও রিফান্ড করুন</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Direct Main Balance Deduction Notice */}
                  <div className="bg-neutral-950 p-3.5 rounded-2xl border border-amber-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                      <Coins className="w-4 h-4" />
                      <span>Stake: ৳1</span>
                    </div>
                    <span className="text-neutral-400 font-mono">
                      Balance: ৳{user.balance.toLocaleString()}
                    </span>
                  </div>

                {/* Password input */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] uppercase font-bold text-neutral-400 flex items-center gap-1">
                    <LockIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Room Password</span>
                  </label>
                  <input
                    type="text"
                    value={personalPassword}
                    onChange={(e) => setPersonalPassword(e.target.value)}
                    placeholder="Enter password (e.g. 1234)"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    maxLength={10}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCreatePersonalChallenge}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Shield className="w-4 h-4" />
                  <span>Create Private Room</span>
                </button>
                {createRoomError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-center text-red-400 text-xs font-bold animate-in fade-in duration-200">
                    {createRoomError}
                  </div>
                )}
              </div>
            )
          ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Private room created success panel */}
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center space-y-1">
                  <div className="text-xl">✅</div>
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">রুম সফলভাবে তৈরি হয়েছে!</h4>
                  <p className="text-[10px] text-neutral-400">নিচের কোড বা শেয়ারিং জয়েনিং লিঙ্কটি আপনার বন্ধুর সাথে শেয়ার করুন।</p>
                </div>

                {/* Room ID and Password details */}
                <div className="grid grid-cols-2 gap-2 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800 text-xs text-neutral-300">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">ROOM ID (রুম আইডি)</span>
                    <div className="font-mono text-amber-400 font-bold text-sm bg-neutral-950 px-2 py-1.5 rounded border border-neutral-800 select-all">
                      {personalCreatedRoom.id}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">CURRENT PASSWORD</span>
                    <div className="font-mono text-amber-400 font-bold text-sm bg-neutral-950 px-2 py-1.5 rounded border border-neutral-800 select-all flex items-center justify-between">
                      <span>{personalCreatedRoom.password}</span>
                      <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded">Active</span>
                    </div>
                  </div>
                </div>

                {/* Change Password Panel */}
                <div className="space-y-2 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                  <label className="block text-[10px] uppercase font-bold text-neutral-400">রুমের পাসওয়ার্ড পরিবর্তন করুন (Change Password)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRoomPassword}
                      onChange={(e) => setNewRoomPassword(e.target.value)}
                      placeholder="নতুন পাসওয়ার্ড দিন..."
                      className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        sound.playButtonClick();
                        if (!newRoomPassword.trim()) {
                          alert("দয়া করে নতুন পাসওয়ার্ড লিখুন।");
                          return;
                        }
                        try {
                          const res = await fetch("/api/rooms/update-password", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              roomId: personalCreatedRoom.id,
                              userId: user.userId,
                              newPassword: newRoomPassword.trim(),
                            }),
                          });
                          const data = await res.json();
                          if (data.success && data.room) {
                            setPersonalCreatedRoom(data.room);
                            setNewRoomPassword("");
                            alert("সফলভাবে রুমের পাসওয়ার্ড আপডেট করা হয়েছে!");
                            fetchRooms();
                          } else {
                            alert(data.error || "পাসওয়ার্ড আপডেট করতে ব্যর্থ হয়েছে।");
                          }
                        } catch (e) {
                          alert("নেটওয়ার্ক সংযোগ ত্রুটি!");
                        }
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-all shadow shrink-0"
                    >
                      Update
                    </button>
                  </div>
                </div>

                {/* Direct Share Link Generator */}
                {(() => {
                  const shareLink = `${window.location.origin}${window.location.pathname}?join=${personalCreatedRoom.id}`;
                  
                  const handleCopyLink = () => {
                    navigator.clipboard.writeText(shareLink);
                    sound.playButtonClick();
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  };

                  return (
                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase font-bold text-neutral-400">DIRECT CHALLENGE LINK (সরাসরি জয়েনিং লিঙ্ক)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={shareLink}
                          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-[10px] font-mono text-neutral-400 focus:outline-none truncate select-all"
                        />
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 hover:border-amber-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-amber-400/90 leading-relaxed font-medium bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-center">
                        🎯 প্রস্তুত থাকুন! আপনার বন্ধু এই লিঙ্কে ক্লিক করে জয়েন করার সাথে সাথেই খেলাটি আপনার স্ক্রিনে স্বয়ংক্রিয়ভাবে লাইভ চালু হয়ে যাবে।
                      </p>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => {
                    sound.playButtonClick();
                    setShowCreatePersonal(false);
                    setIsSearching(true); // Show the waiting overlay
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Swords className="w-4 h-4" />
                  <span>রুমের ভিতরে প্রবেশ করুন (Enter Room Lobby)</span>
                </button>

                <div className="text-[10px] text-neutral-400 text-center bg-neutral-950 p-2 rounded-xl border border-neutral-800">
                  ⏳ রুমটি ৫ মিনিট পর্যন্ত ওপেন থাকবে। এর মধ্যে কেউ জয়েন না করলে স্বয়ংক্রিয়ভাবে ক্লোজ হয়ে মূল ব্যালেন্স রিফান্ড হবে।
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sound.playButtonClick();
                    setShowCreatePersonal(false);
                    setPersonalCreatedRoom(null);
                  }}
                  className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-bold rounded-xl transition-all"
                >
                  Close & Wait for Friend
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
         JOIN PERSONAL PRIVATE ROOM MODAL SCREEN
         ======================================================================= */}
      {/* =======================================================================
          SELECTED ROOM DETAILS POPUP MODAL
          ======================================================================= */}
      {selectedRoomDetails && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-amber-500/40 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                sound.playButtonClick();
                setSelectedRoomDetails(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400 animate-pulse" />
                <span>রুমের বিবরণ (Room Details)</span>
              </h2>
              <p className="text-xs text-neutral-400">
                নির্বাচিত চ্যালেঞ্জ রুমের বিস্তারিত তথ্য ও পরিসংখ্যান।
              </p>
            </div>

            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-3 text-xs text-neutral-300">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Room ID</span>
                <span className="font-mono text-amber-400 font-bold select-all">{selectedRoomDetails.id}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Creator (ক্রিয়েটর)</span>
                <span className="font-bold text-white">{selectedRoomDetails.creatorName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Stake Amount</span>
                <span className="font-bold text-amber-400">৳{selectedRoomDetails.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Room Type</span>
                <span className="font-bold text-white">{selectedRoomDetails.isPrivate ? "🔒 Private Room" : "🌍 Public Lobby"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Status</span>
                <span className="font-bold text-emerald-400 uppercase">{selectedRoomDetails.status}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Room Password</span>
                <span className="font-mono text-amber-400 font-bold select-all bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                  {selectedRoomDetails.password || "N/A"}
                </span>
              </div>
            </div>

            {selectedRoomDetails.creatorId === user.userId ? (
              <div className="space-y-3">
                <div className="space-y-3 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                  <label className="block text-[10px] uppercase font-bold text-neutral-400">রুমের পাসওয়ার্ড পরিবর্তন করুন</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRoomPassword}
                      onChange={(e) => setNewRoomPassword(e.target.value)}
                      placeholder="নতুন পাসওয়ার্ড..."
                      className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        sound.playButtonClick();
                        if (!newRoomPassword.trim()) {
                          alert("দয়া করে নতুন পাসওয়ার্ড লিখুন।");
                          return;
                        }
                        try {
                          const res = await fetch("/api/rooms/update-password", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              roomId: selectedRoomDetails.id,
                              userId: user.userId,
                              newPassword: newRoomPassword.trim(),
                            }),
                          });
                          const data = await res.json();
                          if (data.success && data.room) {
                            setSelectedRoomDetails(data.room);
                            setNewRoomPassword("");
                            alert("সফলভাবে রুমের পাসওয়ার্ড আপডেট করা হয়েছে!");
                            fetchRooms();
                          } else {
                            alert(data.error || "পাসওয়ার্ড আপডেট করতে ব্যর্থ হয়েছে।");
                          }
                        } catch (e) {
                          alert("নেটওয়ার্ক সংযোগ ত্রুটি!");
                        }
                      }}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-all shadow shrink-0"
                    >
                      Update
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sound.playButtonClick();
                    setSelectedRoomDetails(null);
                    setPersonalCreatedRoom(selectedRoomDetails);
                    setIsSearching(true);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Swords className="w-4 h-4" />
                  <span>রুমের ভিতরে প্রবেশ করুন (Enter Room Lobby)</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  sound.playButtonClick();
                  const roomId = selectedRoomDetails.id;
                  setSelectedRoomDetails(null);
                  setJoinPersonalId(roomId);
                  setShowJoinPersonal(true);
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Swords className="w-4 h-4" />
                <span>এই রুমে জয়েন করুন (Join Room)</span>
              </button>
            )}

            <button
              onClick={() => setSelectedRoomDetails(null)}
              className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-xl border border-neutral-700 transition-all"
            >
              বন্ধ করুন (Close)
            </button>
          </div>
        </div>
      )}

      {showJoinPersonal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-amber-500/40 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                sound.playButtonClick();
                setShowJoinPersonal(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500 flex items-center gap-2">
                <Swords className="w-5 h-5 text-amber-400 animate-pulse" />
                <span>ব্যক্তিগত রুমে জয়েন করুন</span>
              </h2>
              <p className="text-xs text-neutral-400">
                আপনার বন্ধুর পাঠানো রুম আইডি এবং পাসওয়ার্ড দিয়ে ডুয়েল চ্যালেঞ্জে প্রবেশ করুন।
              </p>
            </div>

            <div className="space-y-4">
              {waitingRoomData && waitingRoomData.creatorId === user.userId ? (
                // Creator Waiting UI
                <div className="space-y-6 text-center py-4">
                  <div className="relative inline-block">
                    <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center border-2 border-amber-500/30 animate-pulse">
                      <Users className="w-10 h-10 text-amber-500" />
                    </div>
                    <div className="absolute -top-1 -right-1 bg-emerald-500 w-5 h-5 rounded-full border-2 border-neutral-900 animate-bounce" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-white">Waiting for Opponent...</h3>
                    <p className="text-xs text-neutral-400">প্রতিপক্ষের জন্য অপেক্ষা করা হচ্ছে। কেউ জয়েন করা মাত্রই যুদ্ধ শুরু হবে।</p>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-3">
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold">
                      <span className="text-neutral-500">Room ID</span>
                      <span className="text-amber-400 font-mono">{waitingRoomData.id}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold">
                      <span className="text-neutral-500">Auto-Expiry In</span>
                      <span className="text-red-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {expiryCountdown}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-neutral-800">
                      <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Your Side (Randomly Selected)</div>
                      <div className={`text-sm font-black uppercase ${waitingRoomData.choice === 'dragon' ? 'text-red-500' : 'text-amber-500'}`}>
                        {waitingRoomData.choice}
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/20">
                    <p className="text-[10px] text-amber-400 font-bold">
                      💡 আপনি এই পেজ থেকে বের হয়ে গেলেও রুমটি সচল থাকবে। প্রতিপক্ষ জয়েন করলে আপনাকে নোটিফিকেশন দেওয়া হবে।
                    </p>
                  </div>

                  <button
                    onClick={() => setShowJoinPersonal(false)}
                    className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    পজ করুন (Close View)
                  </button>
                </div>
              ) : (
                // Normal Join UI
                <div className="space-y-3">
                  {/* Room ID input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase font-bold text-neutral-400">Room ID (রুম আইডি)</label>
                    <input
                      type="text"
                      value={joinPersonalId}
                      onChange={(e) => setJoinPersonalId(e.target.value)}
                      placeholder="যেমনঃ room_172345678"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>

                  {/* Password input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase font-bold text-neutral-400 flex items-center gap-1">
                      <LockIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Room Password (রুমের পাসওয়ার্ড)</span>
                    </label>
                    <input
                      type="text"
                      value={joinPersonalPassword}
                      onChange={(e) => setJoinPersonalPassword(e.target.value)}
                      placeholder="পাসওয়ার্ড টাইপ করুন"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                      maxLength={10}
                    />
                  </div>

                  {/* Challenger Stake input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase font-bold text-neutral-400 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>Your Stake Amount (বাজির পরিমাণ)</span>
                      </span>
                      <span className="text-amber-400 font-bold text-[10px]">Min: ৳1 chip</span>
                    </label>
                    <input
                      type="number"
                      value={challengerStake}
                      onChange={(e) => setChallengerStake(e.target.value)}
                      placeholder="1"
                      min="1"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none font-bold"
                    />
                    <span className="block text-[9px] text-neutral-500">সর্বনিম্ন বাজি ৳১ চিপস থেকে শুরু করে আপনার ইচ্ছামত বাজি নির্ধারণ করতে পারবেন।</span>
                  </div>

                  {/* Error label */}
                  {personalJoinError && (
                    <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-center text-xs text-red-400 font-bold flex items-center justify-center gap-1.5 animate-bounce">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{personalJoinError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleJoinPersonalChallenge}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Swords className="w-4 h-4" />
                    <span>Join & Battle Now</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live 1v1 Battle Ground Screen */}
      {activeMode === "in_match" && duel && (
        <div className="space-y-4">
          {/* Top Battle Screen Utility Bar */}
          <div className="bg-neutral-900/90 border border-amber-500/30 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => {
                  sound.playButtonClick();
                  setActiveMode("lobby");
                }}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold border border-neutral-700 transition-all flex items-center gap-1.5"
              >
                <X className="w-4 h-4 text-amber-400" />
                <span>Exit</span>
              </button>
              <div className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>1v1 Arena: <span className="text-amber-400">{duel.tier} Tier</span></span>
              </div>
            </div>

            {/* Turn & 1-Minute Countdown Badge */}
            {duel.status === "BETTING" && (
              <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border transition-all ${
                duel.secondsRemaining <= 10
                  ? "bg-red-500/20 border-red-500/80 text-red-400 animate-pulse shadow-lg shadow-red-500/30"
                  : duel.secondsRemaining <= 20
                  ? "bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-md"
                  : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              }`}>
                <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[9px] uppercase font-mono font-bold tracking-wider opacity-80">
                    {duel.turnUser === duel.userRole ? "YOUR TURN" : "OPPONENT'S TURN"}
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono">
                    {Math.floor(duel.secondsRemaining / 60)}:{(duel.secondsRemaining % 60).toString().padStart(2, '0')}s
                  </span>
                </div>
              </div>
            )}

            {/* Spectator Count */}
            <div className="hidden sm:flex items-center gap-2 bg-neutral-950/80 px-3 py-1 rounded-full border border-neutral-800 text-xs text-neutral-400">
              <Eye className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>{duel.spectatorsCount} live</span>
            </div>

            {/* Live Pot Badge */}
            <div className="bg-gradient-to-r from-amber-500/20 via-neutral-950 to-amber-500/20 border border-amber-500/50 px-3.5 sm:px-4 py-1.5 rounded-2xl text-center">
              <div className="text-[9px] sm:text-[10px] uppercase font-bold text-amber-300">POT IN ESCROW</div>
              <div className="text-sm sm:text-base font-black text-amber-400">
                ৳{duel.currentPot.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Main 1v1 Table Felt Canvas */}
          <div className="bg-neutral-950 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-6 relative shadow-2xl overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(180,83,9,0.25),rgba(0,0,0,0.9))]">
            {/* Background Felt Graphic Glows */}
            <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Live 1-Minute Countdown Progress Bar across the Felt */}
            {duel.status === "BETTING" && (
              <div className="w-full bg-neutral-900/80 rounded-full h-2.5 p-0.5 border border-white/10 mb-3 sm:mb-4 overflow-hidden shadow-inner relative z-20">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    duel.secondsRemaining <= 10
                      ? "bg-gradient-to-r from-red-600 via-red-500 to-amber-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                      : duel.secondsRemaining <= 25
                      ? "bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                      : "bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (duel.secondsRemaining / 60) * 100))}%` }}
                />
              </div>
            )}

            {/* Floating Emotes Layer */}
            {floatingEmotes.map((fe) => (
              <div
                key={fe.id}
                className="absolute top-1/3 left-1/2 -translate-x-1/2 text-4xl animate-bounce z-40 pointer-events-none drop-shadow-2xl"
              >
                {fe.emote}
              </div>
            ))}

            {/* Role Assignment Coin Flip Banner */}
            {duel.status === "ROLE_COIN_FLIP" && (
              <div className="p-4 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-center space-y-2 animate-pulse mb-4 z-20 relative">
                <div className="text-2xl">🪙</div>
                <div className="text-base font-black text-amber-300">Flipping coin for roles...</div>
                <div className="text-xs text-neutral-300">
                  You assigned: <span className="font-bold text-amber-400">{duel.userRole}</span> vs Opponent: <span className="font-bold text-amber-400">{duel.userRole === "DRAGON" ? "TIGER" : "DRAGON"}</span>
                </div>
              </div>
            )}

            {/* 2 Players Arena Facing Layout */}
            {(() => {
              const dragonGlow = getCardStrengthGlow(duel.dragonPlayer.card);
              const tigerGlow = getCardStrengthGlow(duel.tigerPlayer.card);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 relative z-10 my-2 sm:my-4">
                  {/* Dragon Player Box */}
                  <div
                    className={`p-3 sm:p-4 rounded-2xl border-2 transition-all relative ${
                      duel.winnerRole === "DRAGON"
                        ? "bg-amber-500/20 border-amber-400 shadow-2xl shadow-amber-500/40 ring-2 ring-amber-400"
                        : "bg-neutral-900/80 border-neutral-800"
                    }`}
                  >
                    {/* Speech Bubble above opponent */}
                    {!duel.dragonPlayer.isUser && opponentSpeechBubble && (
                      <div className="absolute -top-12 sm:-top-16 left-1/2 -translate-x-1/2 bg-amber-500 text-neutral-950 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-[10px] sm:text-xs font-black shadow-2xl border-2 border-white animate-bounce z-30 min-w-[140px] sm:min-w-[180px] text-center">
                        <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-amber-500"></div>
                        <span>{opponentSpeechBubble}</span>
                      </div>
                    )}

                    {/* Winner Crown */}
                    {duel.winnerRole === "DRAGON" && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-neutral-950 px-2 sm:px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-black flex items-center gap-1 shadow-lg whitespace-nowrap">
                        <Crown className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                        <span>DRAGON WINS!</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center font-bold text-red-400 text-xs sm:text-sm">
                          🐉
                        </div>
                        <div>
                          <div className="text-[11px] sm:text-xs font-black text-white flex items-center gap-1">
                            <span className="truncate max-w-[80px] sm:max-w-none">{duel.dragonPlayer.username}</span>
                            {duel.dragonPlayer.isUser && (
                              <span className="text-[8px] sm:text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-neutral-400">ELO {duel.dragonPlayer.eloRank}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[8px] sm:text-[10px] uppercase font-bold text-neutral-400">Bet</div>
                        <div className="text-[11px] sm:text-xs font-black text-amber-400">৳{duel.dragonPlayer.currentBet.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Dragon Hole Card Display */}
                    <div className="flex flex-col items-center justify-center py-2 sm:py-4">
                      {duel.status === "PEEK_CARDS" && duel.dragonPlayer.isUser ? (
                        <div className="flex flex-col items-center justify-center py-2 bg-neutral-900/40 px-3 sm:px-4 rounded-xl border border-dashed border-amber-500/20">
                          <div className="text-center text-[9px] sm:text-[10px] text-amber-300 font-bold mb-1">
                            {isPeeked ? "✅ REVEALED" : "HOLD TO PEEP"}
                          </div>
                          
                          <div
                            onMouseDown={() => setIsPressingCard(true)}
                            onMouseUp={() => setIsPressingCard(false)}
                            onMouseLeave={() => setIsPressingCard(false)}
                            onTouchStart={() => setIsPressingCard(true)}
                            onTouchEnd={() => setIsPressingCard(false)}
                            className={`relative w-24 h-36 sm:w-28 sm:h-40 rounded-xl sm:rounded-2xl border-2 flex flex-col justify-between p-2.5 sm:p-3 select-none transition-all cursor-pointer ${
                              isPeeked
                                ? dragonGlow.glow
                                : isPressingCard
                                ? "border-amber-400 bg-neutral-950 scale-105 shadow-2xl rotate-2 animate-pulse"
                                : "border-amber-500/50 bg-gradient-to-br from-neutral-900 via-neutral-950 to-amber-950 shadow-xl"
                            }`}
                          >
                            {isPeeked ? (
                              <>
                                <div className="text-sm sm:text-base font-black text-white">{duel.dragonPlayer.card?.rank}</div>
                                <div className="text-2xl sm:text-3xl text-center">{duel.dragonPlayer.card?.suit}</div>
                                <div className="text-right text-sm sm:text-base font-black text-white">{duel.dragonPlayer.card?.rank}</div>
                              </>
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                                <div className="text-xl sm:text-2xl animate-bounce">👇</div>
                                <div className="text-[8px] sm:text-[9px] uppercase font-bold text-neutral-400 mt-1">PRESS</div>
                                <div className="w-4/5 bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
                                  <div className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-75" style={{ width: `${squeezePercent}%` }}></div>
                                </div>
                              </div>
                            )}
                          </div>

                          {!isPeeked && (
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={squeezePercent}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setSqueezePercent(val);
                                if (val >= 100) {
                                  setIsPeeked(true);
                                  sound.playCardFlip();
                                  sound.speak("Revealed!");
                                }
                              }}
                              className="w-20 sm:w-24 accent-amber-500 h-1 bg-neutral-800 rounded-lg cursor-pointer mt-2"
                            />
                          )}

                          {isPeeked && (
                            <button
                              onClick={() => {
                                sound.playButtonClick();
                                setDuel((prev) => prev ? { ...prev, status: "BETTING" } : null);
                              }}
                              className="mt-2.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-[9px] sm:text-[10px] rounded-md shadow transition-all active:scale-95 flex items-center gap-1"
                            >
                              <span>Confirm</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      ) : duel.dragonPlayer.isUser || duel.status === "SHOWDOWN" || duel.status === "SETTLED" ? (
                        <div className={`w-24 h-36 sm:w-28 sm:h-40 rounded-xl sm:rounded-2xl border-2 flex flex-col justify-between p-2.5 sm:p-3 transition-all ${dragonGlow.glow}`}>
                          <div className="text-sm sm:text-base font-black text-white">{duel.dragonPlayer.card?.rank}</div>
                          <div className="text-2xl sm:text-3xl text-center">{duel.dragonPlayer.card?.suit}</div>
                          <div className="text-right text-sm sm:text-base font-black text-white">{duel.dragonPlayer.card?.rank}</div>
                        </div>
                      ) : (
                        <div className="w-24 h-36 sm:w-28 sm:h-40 rounded-xl sm:rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-neutral-900 via-neutral-950 to-amber-950 flex items-center justify-center text-2xl sm:text-3xl shadow-xl">
                          🂠
                        </div>
                      )}

                      {/* Strength Glow Text (For User's Hole Card) */}
                      {duel.dragonPlayer.isUser && duel.status !== "ROLE_COIN_FLIP" && (
                        <div className={`mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-black ${dragonGlow.color}`}>
                          {dragonGlow.text}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tiger Player Box */}
                  <div
                    className={`p-3 sm:p-4 rounded-2xl border-2 transition-all relative ${
                      duel.winnerRole === "TIGER"
                        ? "bg-amber-500/20 border-amber-400 shadow-2xl shadow-amber-500/40 ring-2 ring-amber-400"
                        : "bg-neutral-900/80 border-neutral-800"
                    }`}
                  >
                    {/* Speech Bubble above opponent */}
                    {!duel.tigerPlayer.isUser && opponentSpeechBubble && (
                      <div className="absolute -top-12 sm:-top-16 left-1/2 -translate-x-1/2 bg-amber-500 text-neutral-950 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-[10px] sm:text-xs font-black shadow-2xl border-2 border-white animate-bounce z-30 min-w-[140px] sm:min-w-[180px] text-center">
                        <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-amber-500"></div>
                        <span>{opponentSpeechBubble}</span>
                      </div>
                    )}

                    {/* Winner Crown */}
                    {duel.winnerRole === "TIGER" && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-neutral-950 px-2 sm:px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-black flex items-center gap-1 shadow-lg whitespace-nowrap">
                        <Crown className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                        <span>TIGER WINS!</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-400 text-xs sm:text-sm">
                          🐯
                        </div>
                        <div>
                          <div className="text-[11px] sm:text-xs font-black text-white flex items-center gap-1">
                            <span className="truncate max-w-[80px] sm:max-w-none">{duel.tigerPlayer.username}</span>
                            {duel.tigerPlayer.isUser && (
                              <span className="text-[8px] sm:text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-neutral-400">ELO {duel.tigerPlayer.eloRank}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[8px] sm:text-[10px] uppercase font-bold text-neutral-400">Bet</div>
                        <div className="text-[11px] sm:text-xs font-black text-amber-400">৳{duel.tigerPlayer.currentBet.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Tiger Hole Card Display */}
                    <div className="flex flex-col items-center justify-center py-2 sm:py-4">
                      {duel.status === "PEEK_CARDS" && duel.tigerPlayer.isUser ? (
                        <div className="flex flex-col items-center justify-center py-2 bg-neutral-900/40 px-3 sm:px-4 rounded-xl border border-dashed border-amber-500/20">
                          <div className="text-center text-[9px] sm:text-[10px] text-amber-300 font-bold mb-1">
                            {isPeeked ? "✅ REVEALED" : "HOLD TO PEEP"}
                          </div>
                          
                          <div
                            onMouseDown={() => setIsPressingCard(true)}
                            onMouseUp={() => setIsPressingCard(false)}
                            onMouseLeave={() => setIsPressingCard(false)}
                            onTouchStart={() => setIsPressingCard(true)}
                            onTouchEnd={() => setIsPressingCard(false)}
                            className={`relative w-24 h-36 sm:w-28 sm:h-40 rounded-xl sm:rounded-2xl border-2 flex flex-col justify-between p-2.5 sm:p-3 select-none transition-all cursor-pointer ${
                              isPeeked
                                ? tigerGlow.glow
                                : isPressingCard
                                ? "border-amber-400 bg-neutral-950 scale-105 shadow-2xl rotate-2 animate-pulse"
                                : "border-amber-500/50 bg-gradient-to-br from-neutral-900 via-neutral-950 to-amber-950 shadow-xl"
                            }`}
                          >
                            {isPeeked ? (
                              <>
                                <div className="text-sm sm:text-base font-black text-white">{duel.tigerPlayer.card?.rank}</div>
                                <div className="text-2xl sm:text-3xl text-center">{duel.tigerPlayer.card?.suit}</div>
                                <div className="text-right text-sm sm:text-base font-black text-white">{duel.tigerPlayer.card?.rank}</div>
                              </>
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                                <div className="text-xl sm:text-2xl animate-bounce">👇</div>
                                <div className="text-[8px] sm:text-[9px] uppercase font-bold text-neutral-400 mt-1">PRESS</div>
                                <div className="w-4/5 bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
                                  <div className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-75" style={{ width: `${squeezePercent}%` }}></div>
                                </div>
                              </div>
                            )}
                          </div>

                          {!isPeeked && (
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={squeezePercent}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setSqueezePercent(val);
                                if (val >= 100) {
                                  setIsPeeked(true);
                                  sound.playCardFlip();
                                  sound.speak("Revealed!");
                                }
                              }}
                              className="w-20 sm:w-24 accent-amber-500 h-1 bg-neutral-800 rounded-lg cursor-pointer mt-2"
                            />
                          )}

                          {isPeeked && (
                            <button
                              onClick={() => {
                                sound.playButtonClick();
                                setDuel((prev) => prev ? { ...prev, status: "BETTING" } : null);
                              }}
                              className="mt-2.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-[9px] sm:text-[10px] rounded-md shadow transition-all active:scale-95 flex items-center gap-1"
                            >
                              <span>Confirm</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      ) : duel.tigerPlayer.isUser || duel.status === "SHOWDOWN" || duel.status === "SETTLED" ? (
                        <div className={`w-24 h-36 sm:w-28 sm:h-40 rounded-xl sm:rounded-2xl border-2 flex flex-col justify-between p-2.5 sm:p-3 transition-all ${tigerGlow.glow}`}>
                          <div className="text-sm sm:text-base font-black text-white">{duel.tigerPlayer.card?.rank}</div>
                          <div className="text-2xl sm:text-3xl text-center">{duel.tigerPlayer.card?.suit}</div>
                          <div className="text-right text-sm sm:text-base font-black text-white">{duel.tigerPlayer.card?.rank}</div>
                        </div>
                      ) : (
                        <div className="w-24 h-36 sm:w-28 sm:h-40 rounded-xl sm:rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-neutral-900 via-neutral-950 to-amber-950 flex items-center justify-center text-2xl sm:text-3xl shadow-xl">
                          🂠
                        </div>
                      )}

                      {/* Strength Glow Text (For User's Hole Card) */}
                      {duel.tigerPlayer.isUser && duel.status !== "ROLE_COIN_FLIP" && (
                        <div className={`mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-black ${tigerGlow.color}`}>
                          {tigerGlow.text}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Poker Betting Action Toolbar (Sticky Bottom Safe Area) */}
            {duel.status === "BETTING" && (
              <div className="sticky bottom-[62px] md:bottom-3 z-30 p-3.5 sm:p-4 bg-[#0F1420]/95 border-2 border-amber-500/60 rounded-2xl space-y-2.5 shadow-2xl backdrop-blur-xl ring-1 ring-amber-500/30 my-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className={duel.turnUser === duel.userRole ? "text-amber-300" : "text-neutral-400"}>
                      {duel.turnUser === duel.userRole ? "YOUR TURN TO ACT" : "WAITING FOR OPPONENT"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                      duel.secondsRemaining <= 10
                        ? "bg-red-500 text-white animate-pulse"
                        : duel.secondsRemaining <= 20
                        ? "bg-amber-500 text-neutral-950"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}>
                      ⏱️ {Math.floor(duel.secondsRemaining / 60)}:{(duel.secondsRemaining % 60).toString().padStart(2, '0')}s
                    </span>
                  </div>
                  <span className="text-amber-400/80 font-mono text-[11px]">Raises: {duel.raisesCount}/3</span>
                </div>

                {/* Poker Actions Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    onClick={() => handleBettingAction("CHECK")}
                    className="py-2.5 px-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl border border-neutral-600 transition-all active:scale-95 flex flex-col items-center justify-center leading-tight cursor-pointer"
                  >
                    <span className="font-extrabold text-white text-xs">CHECK</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Pass Turn</span>
                  </button>

                  <button
                    onClick={() => handleBettingAction("RAISE_2X")}
                    className="py-2.5 px-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex flex-col items-center justify-center leading-tight cursor-pointer"
                  >
                    <span className="font-black text-xs">RAISE 2X</span>
                    <span className="text-[10px] font-mono font-bold text-neutral-950/80">+৳{(duel.ante * 2).toLocaleString()}</span>
                  </button>

                  <button
                    onClick={() => handleBettingAction("RAISE_3X")}
                    className="py-2.5 px-2 bg-gradient-to-r from-amber-500 via-amber-400 to-red-500 hover:from-amber-400 hover:to-red-400 text-neutral-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex flex-col items-center justify-center leading-tight cursor-pointer"
                  >
                    <span className="font-black text-xs">RAISE 3X</span>
                    <span className="text-[10px] font-mono font-bold text-neutral-950/80">+৳{(duel.ante * 3).toLocaleString()}</span>
                  </button>

                  <button
                    onClick={() => handleBettingAction("ALL_IN")}
                    className="py-2.5 px-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs rounded-xl shadow-lg shadow-red-600/30 transition-all active:scale-95 flex flex-col items-center justify-center leading-tight cursor-pointer"
                  >
                    <span className="font-black text-xs">ALL-IN 💥</span>
                    <span className="text-[10px] text-amber-200 font-mono">Max Pot</span>
                  </button>

                  <button
                    onClick={() => handleBettingAction("FOLD")}
                    className="col-span-2 sm:col-span-1 py-2.5 px-2 bg-red-950/80 hover:bg-red-900 border border-red-600/50 text-red-300 font-bold text-xs rounded-xl transition-all active:scale-95 flex flex-col items-center justify-center leading-tight cursor-pointer"
                  >
                    <span className="font-extrabold text-red-300 text-xs">FOLD</span>
                    <span className="text-[10px] text-red-400/80 font-normal">Forfeit Match</span>
                  </button>
                </div>
              </div>
            )}

            {/* Duel Result Modal Summary */}
            {duel.status === "SETTLED" && (
              <div className="p-6 bg-neutral-900/95 border-2 border-amber-400 rounded-2xl text-center space-y-4 shadow-2xl backdrop-blur-xl animate-fadeIn my-4">
                <div className="text-3xl">
                  {duel.winnerRole === duel.userRole ? "🏆" : duel.winnerRole === "TIE" ? "👔" : "💔"}
                </div>
                <div>
                  <h3 className="text-xl font-black text-amber-300">
                    {duel.winnerRole === duel.userRole
                      ? "VICTORY! YOU WON THE DUEL!"
                      : duel.winnerRole === "TIE"
                      ? "TIE GAME (Company Profit Captured)"
                      : "DUEL LOST!"}
                  </h3>
                  <p className="text-xs text-neutral-300 mt-1">
                    Your Card: <span className="font-bold text-amber-400">{duel.userCard?.display}</span> vs Opponent Card: <span className="font-bold text-amber-400">{duel.opponentCard?.display}</span>
                  </p>
                </div>

                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 max-w-sm mx-auto space-y-1">
                  <div className="text-xs text-neutral-400">Total Pot: ৳{duel.currentPot.toLocaleString()}</div>
                  <div className={`text-base font-black ${duel.netProfit && duel.netProfit > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    Net Profit: {duel.netProfit && duel.netProfit > 0 ? `+৳${duel.netProfit.toLocaleString()}` : `-৳${Math.abs(duel.netProfit || 0).toLocaleString()}`}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleStartMatchmaking(duel.tier)}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Play Again / Rematch</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playButtonClick();
                      setActiveMode("lobby");
                    }}
                    className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-xl border border-neutral-700 transition-all"
                  >
                    Return to Lobby
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Audio, Voice Taunts, Quick Emotes & Live Chat Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
            {/* Quick Emotes & Voice Taunts */}
            <div className="bg-neutral-900/90 border border-amber-500/30 rounded-2xl p-4 space-y-3 shadow-xl relative overflow-hidden">
              {!isBetPlaced && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-2 animate-pulse">
                    <LockIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-black text-red-400 uppercase tracking-wider">Voice Locked</h4>
                  <p className="text-[10px] text-neutral-400 mt-1 max-w-[220px]">
                    বেট প্লেস করে লাইভ ভয়েস ও টন্টবোর্ড আনলক করুন! (Place a bet to unlock Voice Chat & Soundboard!)
                  </p>
                </div>
              )}

              <div className={!isBetPlaced ? "filter blur-sm pointer-events-none" : ""}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Mic className="w-4 h-4 text-amber-400" /> Live Voice & Quick Taunts
                  </span>
                  <button
                    onClick={() => setIsMicOn(!isMicOn)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                      isMicOn ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-red-500/20 border-red-500/40 text-red-300"
                    }`}
                  >
                    {isMicOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                    <span>{isMicOn ? "Mic Active" : "Muted"}</span>
                  </button>
                </div>

                {/* Floating Quick Emotes Toolbar */}
                <div className="mt-3">
                  <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1.5">Quick Emote Reactions</label>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {EMOTES.map((e) => (
                      <button
                        key={e}
                        onClick={() => handleSendEmote(e)}
                        className="w-9 h-9 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-400 text-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all shrink-0"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recorded Voice Taunt Clips */}
                <div className="space-y-1.5 mt-3">
                  <label className="block text-[10px] uppercase font-bold text-neutral-400">Pre-Set Bengali Voice Taunts</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {VOICE_TAUNTS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleSendTaunt(t)}
                        className="py-1.5 px-2.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-amber-500/50 rounded-xl text-left text-[11px] font-medium text-amber-300 transition-all truncate"
                      >
                        {t.text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Chat Drawer */}
            <div className="bg-neutral-900/90 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-xl space-y-3 relative overflow-hidden">
              {!isBetPlaced && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-2 animate-pulse">
                    <LockIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-black text-red-400 uppercase tracking-wider">Chat Locked</h4>
                  <p className="text-[10px] text-neutral-400 mt-1 max-w-[220px]">
                    বেট প্লেস করে লাইভ চ্যাট রুম আনলক করুন! (Place a bet to unlock Live Chat!)
                  </p>
                </div>
              )}

              <div className={`flex flex-col justify-between h-full ${!isBetPlaced ? "filter blur-sm pointer-events-none" : ""}`}>
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-amber-400" /> Live Match Chat
                  </span>
                  <span className="text-[10px] text-neutral-500">WebSocket Live Sync</span>
                </div>

                <div ref={chatScrollRef} className="h-32 overflow-y-auto space-y-2 pr-1 no-scrollbar text-xs my-2">
                  {chatLog.map((m) => (
                    <div
                      key={m.id}
                      className={`p-2 rounded-xl text-xs ${
                        m.sender === "SYSTEM"
                          ? "bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium"
                          : m.isUser
                          ? "bg-amber-600/20 text-amber-200 border border-amber-500/30 ml-4"
                          : "bg-neutral-950 text-neutral-300 border border-neutral-800 mr-4"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-0.5">
                        <span className="font-bold">{m.sender}</span>
                        <span>{m.timestamp}</span>
                      </div>
                      <div>{m.text}</div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type message to opponent..."
                    className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none"
                    maxLength={100}
                  />
                  <button
                    type="submit"
                    className="p-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl font-bold transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clean Mobile End Spacer */}
      <div className="h-6 md:h-2" />
    </div>
  );
};
