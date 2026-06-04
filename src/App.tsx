/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, 
  Store, 
  RotateCcw, 
  FileSpreadsheet, 
  Sparkles, 
  Heart, 
  Send, 
  Trash2, 
  ExternalLink, 
  AlertTriangle,
  Flame,
  Info,
  Volume2,
  VolumeX,
  Languages,
  Home
} from 'lucide-react';
import { 
  type LanguageType, 
  translations, 
  LOCALIZED_ITEMS, 
  LOCALIZED_QUIC_REPLIES 
} from './translations';
import { 
  GUEST_PROFILES_LOCALIZED,
  getRandomTargetsForGuest,
  getLocalizedOfflineQuickReplies,
  evaluateChatOffline,
  getOfflineDialogueAndTargets,
  getOfflineTargetsForDialogue
} from './offlineGameEngine';

// Shelf items interface
interface ShelfItem {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  cost: string;
}

// Google Drive link helper wrapper with referrerpolicy support
function getDriveImageUrl(url: string | null | undefined, fallbackId?: string): string {
  if (!url || url === 'None' || url.trim() === '') {
    if (fallbackId) {
      return `https://drive.google.com/thumbnail?id=${fallbackId}&sz=w800`;
    }
    return '';
  }
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  }
  return url;
}

export default function App() {
  // Language states
  const [lang, setLang] = useState<LanguageType>(() => {
    const saved = localStorage.getItem('game_lang');
    if (saved === 'zh' || saved === 'en' || saved === 'ko') return saved;
    return 'zh';
  });

  const t = translations[lang];

  const changeLanguage = (newLang: LanguageType) => {
    if (newLang === lang) return;
    setLang(newLang);
    localStorage.setItem('game_lang', newLang);
    const successMsg = newLang === 'zh' ? "语言已切换为中文 🇨🇳" : newLang === 'en' ? "Language changed to English 🇬🇧" : "한국어로 변경되었습니다 🇰🇷";
    showToast(successMsg, "success");
    // Immediately update quick replies list to avoid language selection mismatch
    setQuickReplies(LOCALIZED_QUIC_REPLIES[newLang] || []);
    // If we have an active guest, reload them in the new language
    if (activeGuest) {
      loadNewCustomer(activeGuest.guestId, newLang, false, true);
    }
  };

  const formatToastText = (template: string, d: number) => {
    return template.replace("${delta}", (d >= 0 ? "+" : "") + d);
  };

  // Spreadsheet integration states
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [gameConfig, setGameConfig] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // Active game states
  const [satisfaction, setSatisfaction] = useState<number>(50);
  const [activeGuest, setActiveGuest] = useState<any>(null);
  const [loadingGuest, setLoadingGuest] = useState(true);
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  // Dynamic quick replies & shelf items rotation
  const [quickReplies, setQuickReplies] = useState<string[]>(() => {
    return LOCALIZED_QUIC_REPLIES[lang] || [];
  });
  const [customerCount, setCustomerCount] = useState<number>(0);
  const [rotatedItemIds, setRotatedItemIds] = useState<string[]>([]);

  // BGM & Sparkle/Crisis effects state
  const [bgmPlaying, setBgmPlaying] = useState<boolean>(false);
  const [particles, setParticles] = useState<{ id: number; left: number; delay: number; scale: number; duration: number }[]>([]);
  const [particlesType, setParticlesType] = useState<'stars' | 'warnings' | 'none'>('none');
  const [hasAlertedUnder30, setHasAlertedUnder30] = useState<boolean>(false);

  // Start Screen and Gameplay Tutorial/Introduction States
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  const [bgmAudio] = useState(() => {
    const audio = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3");
    audio.loop = true;
    audio.volume = 0.35;
    return audio;
  });

  // Pure synthesized hazard alarm siren to guarantee sound generation offline/online
  const playAlertSiren = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const now = ctx.currentTime;
      // Tone 1: Sawtooth sweeping frequency
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(560, now);
      osc1.frequency.linearRampToValueAtTime(860, now + 0.35);
      osc1.frequency.linearRampToValueAtTime(560, now + 0.7);
      osc1.frequency.linearRampToValueAtTime(860, now + 1.05);
      osc1.frequency.linearRampToValueAtTime(560, now + 1.4);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 1.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      // Tone 2: Sine wave sweep
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(600, now);
      osc2.frequency.linearRampToValueAtTime(900, now + 0.35);
      osc2.frequency.linearRampToValueAtTime(600, now + 0.7);
      osc2.frequency.linearRampToValueAtTime(900, now + 1.05);
      osc2.frequency.linearRampToValueAtTime(600, now + 1.4);
      gain2.gain.setValueAtTime(0.08, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc1.start(now);
      osc1.stop(now + 1.4);
      osc2.start(now);
      osc2.stop(now + 1.4);
    } catch (e) {
      console.warn("Synthesizer warning siren play blocked or failed:", e);
    }
  };

  // Pure synthesized tragic funeral march melody played when game is over (satisfaction === 0)
  const playFailureTragicMelody = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      
      const notes = [
        { freq: 130.81, start: 0.0, end: 0.6, type: "sawtooth" as const }, // C3 somber organ base
        { freq: 130.81, start: 0.8, end: 1.4, type: "sawtooth" as const }, // C3
        { freq: 130.81, start: 1.6, end: 2.2, type: "sawtooth" as const }, // C3
        { freq: 103.83, start: 2.4, end: 3.2, type: "sawtooth" as const }, // G#2 heavy minor chord note 
        { freq: 98.00,  start: 3.4, end: 4.2, type: "sawtooth" as const }, // G2 sliding down
        { freq: 87.31,  start: 4.4, end: 5.2, type: "sawtooth" as const }, // F2 sliding further
        { freq: 65.41,  start: 5.4, end: 7.2, type: "sawtooth" as const }  // C2 deep grave pitch block
      ];
      
      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.type = n.type;
        osc.frequency.setValueAtTime(n.freq, now + n.start);
        
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(320, now + n.start); // muffled, extremely dark sound
        
        gain.gain.setValueAtTime(0, now + n.start);
        gain.gain.linearRampToValueAtTime(0.18, now + n.start + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + n.end);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + n.start);
        osc.stop(now + n.end + 0.1);
      });
    } catch (e) {
      console.warn("Tragic organ synthesising failed:", e);
    }
  };

  // Switch BGM track seamlessly based on satisfaction levels
  useEffect(() => {
    let targetUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"; // Standard cute lofi
    if (satisfaction >= 90) {
      targetUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"; // Success uplifting upbeat
    } else if (satisfaction < 30) {
      targetUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3"; // Melancholic / Sombre and slow tragedy
    }
    
    if (bgmAudio.src !== targetUrl) {
      const wasPlaying = bgmPlaying;
      bgmAudio.src = targetUrl;
      bgmAudio.load();
      if (wasPlaying) {
        bgmAudio.play().then(() => {
          setBgmPlaying(true);
        }).catch(err => {
          console.log("Audio play blocked by browser:", err);
        });
      }
    }
  }, [satisfaction, bgmAudio]);

  // Handle single triggering alert siren & alert prompt when falling below 30
  useEffect(() => {
    if (satisfaction < 30) {
      if (satisfaction === 0) {
        // Pauses the current background loop and fires the mournful death march synth
        bgmAudio.pause();
        setBgmPlaying(false);
        playFailureTragicMelody();
      } else if (!hasAlertedUnder30) {
        setHasAlertedUnder30(true);
        playAlertSiren();
        showToast(
          lang === "en" 
            ? "⚠️ Danger: Convenience store satisfaction dropped below 30%! Somber backup music activated!"
            : lang === "ko" 
            ? "⚠️ 위기: 만족도가 30% 이하로 급락했습니다! 배경음악이 슬픈 멜로디로 바뀝니다!"
            : "⚠️ 警报：便利店满意度已跌破30%危急线！小店工期告急，背景音乐已自动切换为凄惨悲歌！", 
          "error"
        );
      }
    } else {
      // Reset the warning alert trigger state once satisfaction returns to normal
      if (hasAlertedUnder30) {
        setHasAlertedUnder30(false);
      }
    }
  }, [satisfaction, hasAlertedUnder30, lang]);

  // Click-to-play listener helper to bypass browser autostart policies
  useEffect(() => {
    const handleInteraction = () => {
      if (bgmPlaying && bgmAudio.paused) {
        bgmAudio.play().catch(() => {});
      }
    };
    window.addEventListener("click", handleInteraction);
    return () => {
      window.removeEventListener("click", handleInteraction);
      bgmAudio.pause();
    };
  }, [bgmPlaying, bgmAudio]);

  // Generate particles based on satisfaction states
  useEffect(() => {
    if (satisfaction >= 90) {
      const list = Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 4,
        scale: 0.6 + Math.random() * 1.0,
        duration: 2.5 + Math.random() * 3.5,
      }));
      setParticles(list);
      setParticlesType('stars');
    } else if (satisfaction < 30) {
      const list = Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 3,
        scale: 0.7 + Math.random() * 0.8,
        duration: 3.0 + Math.random() * 3.0,
      }));
      setParticles(list);
      setParticlesType('warnings');
    } else {
      setParticles([]);
      setParticlesType('none');
    }
  }, [satisfaction]);

  const toggleBgm = () => {
    if (bgmPlaying) {
      bgmAudio.pause();
      setBgmPlaying(false);
      showToast("背景音乐已暂停 ⏸️", "info");
    } else {
      bgmAudio.play().then(() => {
        setBgmPlaying(true);
        showToast("背景音乐开启成功 🎵", "success");
      }).catch(err => {
        console.error("Audio playback error:", err);
        showToast("请先点击页面任意区域激活，再播放BGM喔！", "error");
      });
    }
  };

  // Dialog messages displayed
  const [customerMessage, setCustomerMessage] = useState<string>("欢迎光临萌萌AI便利店！");
  const [customerFeeling, setCustomerFeeling] = useState<string>("👋 正常");
  const [shopkeeperMessage, setShopkeeperMessage] = useState<string>("（正在柜台整理货架，微笑等候客人……）");

  // User responses
  const [responseText, setResponseText] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [evaluateLoading, setEvaluateLoading] = useState<boolean>(false);
  const [dialogRoundCount, setDialogRoundCount] = useState<number>(0);
  const [aiOfflineMode, setAiOfflineMode] = useState<boolean>(false);
  const [transitioningNext, setTransitioningNext] = useState<boolean>(false);
  const [currentTargets, setCurrentTargets] = useState<string[]>([]);

  // Load configuration from spreadsheet (dynamic driver)
  const fetchConfigAndInit = async (shouldResetScore: boolean = true) => {
    setLoadingConfig(true);
    showToast(t.toastSyncing, "info");
    try {
      const res = await fetch("/api/game/config");
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }
      const data = await res.json();
      console.log("Loaded game config:", data);
      setGameConfig(data);
      
      const initialScore = 50; // Set to exactly 50% baseline as explicitly requested
      if (shouldResetScore) {
        setSatisfaction(initialScore);
      }
      showToast(t.toastSyncSuccess, "success");
    } catch (err: any) {
      console.warn("Config fetch error, applying robust offline fallback scenario:", err);
      
      // Complete client-side fallback matching SPREADSHEET_ID / SPREADSHEET layouts
      const fallbackConfig = {
        bg: [
          { state: "0", link: "https://drive.google.com/file/d/12vjxOHGH1u1jYE-KgwwJbG8DTG5JwZlh/view?usp=sharing" },
          { state: "1", link: "https://drive.google.com/file/d/12vjxOHGH1u1jYE-KgwwJbG8DTG5JwZlh/view?usp=sharing" },
          { state: "2", link: "https://drive.google.com/file/d/1qeGYv-mAR_xit9ZcdvUO1lyo8c2dYxXP/view?usp=sharing" },
          { state: "3", link: "https://drive.google.com/file/d/13zt8hos-X6PriyUw_FwuVcbxzLvgL8t-/view?usp=sharing" }
        ],
        character: {
          base: "https://drive.google.com/file/d/1g13V7gc7L8XJy4-M5T2CLH9nOniB7yNJ/view?usp=sharing",
          states: [
            { state: "0", link: "https://drive.google.com/file/d/10Cp7j5RgEtfkdsmQEUewh8qt_XM2U4ML/view?usp=sharing", min: 0, max: 30 },
            { state: "1", link: "None", min: 31, max: 70 },
            { state: "2", link: "https://drive.google.com/file/d/1wNL5xNn5hjAtrNNtuxZ4gGxFGg62a-WD/view?usp=sharing", min: 71, max: 90 },
            { state: "3", link: "https://drive.google.com/file/d/1WTDHNugpk5ZKGXFxfW-MMPZ1Qlq3yG1w/view?usp=sharing", min: 91, max: 100 },
            { state: "clear", link: "https://drive.google.com/file/d/12abPlPGDJTRMtcMtVZhkFsK2VjL2h4fv/view?usp=sharing", min: 100, max: 100 }
          ]
        },
        guests: [
          { state: "0", link: "https://drive.google.com/file/d/1QtUAYTHKQgr3LLkVgbhoriQ-l3U4KcTx/view?usp=sharing" },
          { state: "1", link: "https://drive.google.com/file/d/1rzxw8RexI4UyrIKJRHyW4LqS9r9B_w5N/view?usp=sharing" },
          { state: "2", link: "https://drive.google.com/file/d/14_0TlErm2uLaKMMDaYOa_j7x2kjhnNeQ/view?usp=sharing" },
          { state: "3", link: "https://drive.google.com/file/d/1ZfNPAe0v8Pzvtchl9dCW5gDRNvNG_Gsz/view?usp=sharing" }
        ],
        initial: {
          bg_state: 0,
          cha_state: 1,
          value: 50
        }
      };
      
      setGameConfig(fallbackConfig);
      if (shouldResetScore) {
        setSatisfaction(50);
      }
      showToast(t.toastSyncFail ? t.toastSyncFail + " (Using Offline Config Backup)" : "Using Offline Backup Story mode", "info");
    } finally {
      setLoadingConfig(false);
    }
  };

  const resetGame = async () => {
    // 1. Instantly reset all UI state so there is zero perceived delay, returning to 50% satisfaction
    setSatisfaction(50);
    setDialogRoundCount(0);
    setHasAlertedUnder30(false);
    setSelectedItems([]);
    setResponseText("");
    setParticles([]);
    setParticlesType('none');
    setTransitioningNext(false);
    setChatHistory([]);
    setCustomerCount(0);
    setCustomerFeeling(lang === "en" ? "👋 Normal" : lang === "ko" ? "👋 정상" : "👋 正常");

    showToast(lang === "en" ? "Game Resetting... 🏪" : lang === "ko" ? "게임 리셋 중... 🏪" : "正在重新开始游戏... 🏪", "info");

    try {
      // 2. Directly load the new customer (skipping the slow spreadsheet config call)
      await loadNewCustomer(undefined, undefined, true);
    } catch (e) {
      console.error("Error resetting game guest:", e);
      // Even if loadNewCustomer fails, we don't get stuck! We force local state safety
      setSatisfaction(50);
    }
  };

  useEffect(() => {
    fetchConfigAndInit(true);
  }, []);

  // Bring in a new customer
  const loadNewCustomer = async (
    forcedId?: number, 
    overrideLang?: LanguageType, 
    forceResetItems = false, 
    isLangChange = false
  ) => {
    setLoadingGuest(true);
    setSelectedItems([]);
    setResponseText("");
    setDialogRoundCount(0);
    
    const activeLang = overrideLang || lang;
    const welcomeMsg = activeLang === "en" 
      ? "（Untangling shelves behind counter, smiling and welcoming the guest...）" 
      : activeLang === "ko" 
      ? "（계산대를 정리하며 미소로 새로운 손님을 맞이하는 중……）" 
      : "（正在柜台整理货架，微笑欢迎新客人……）";
    setShopkeeperMessage(welcomeMsg);
    
    // Choose randomized guest state from 0 to 3, guaranteeing we swap the customer
    let nextGuestId = forcedId !== undefined ? forcedId : Math.floor(Math.random() * 4);
    if (forcedId === undefined && activeGuest && activeGuest.guestId !== undefined) {
      const currentGuestId = activeGuest.guestId;
      const candidates = [0, 1, 2, 3].filter(id => id !== currentGuestId);
      nextGuestId = candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Determine customer rotation count
    const nextCount = isLangChange ? customerCount : (forceResetItems ? 1 : customerCount + 1);
    if (!isLangChange) {
      setCustomerCount(nextCount);
    }

    try {
      let data;
      try {
        const response = await fetch("/api/game/guest-init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestId: nextGuestId, lang: activeLang })
        });
        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }
        data = await response.json();
      } catch (fetchErr) {
        console.warn("API guest-init call failed, running robust client offline generator:", fetchErr);
        const profilesList = GUEST_PROFILES_LOCALIZED[activeLang] || GUEST_PROFILES_LOCALIZED.zh;
        const currentProfile = profilesList[nextGuestId % profilesList.length];
        
        const dialogues = currentProfile.offlineDialogues || ["你好！请问有什么推荐吗？"];
        const dialogueIndex = Math.floor(Math.random() * dialogues.length);
        
        const { targets: targetItems, customerSpeech } = getOfflineDialogueAndTargets(nextGuestId, dialogueIndex, activeLang);

        const qReplies = getLocalizedOfflineQuickReplies(activeLang, nextGuestId, targetItems);

        data = {
          guestId: nextGuestId,
          guestName: currentProfile.name,
          customerSpeech: customerSpeech,
          targets: targetItems,
          quickReplies: qReplies,
          offlineBadge: true
        };
      }

      setActiveGuest(data);
      setCustomerMessage(data.customerSpeech);
      
      const feelingExpect = activeLang === "en" ? "👀 Expectant" : activeLang === "ko" ? "👀 기대" : "👀 期待";
      setCustomerFeeling(feelingExpect);
      setAiOfflineMode(!!data.offlineBadge);
      
      const targetsForGuest = data.targets || [];
      setCurrentTargets(targetsForGuest);

      // Trigger items rotation upon empty, forced reset, or on every new customer (per-round update)
      if (rotatedItemIds.length === 0 || forceResetItems || !isLangChange) {
        const allItems = LOCALIZED_ITEMS[activeLang];
        const allIds = allItems.map(x => x.id);
        
        // Robust targeted matching guarantee
        const targeted: string[] = [];
        for (const t of targetsForGuest) {
          const foundId = allIds.find(id => id === t || id.includes(t) || t.includes(id));
          if (foundId) {
            if (!targeted.includes(foundId)) {
              targeted.push(foundId);
            }
          }
        }
        
        const others = allIds.filter(id => !targeted.includes(id));
        
        let finalRotatedIds: string[] = [];
        let attempts = 0;
        
        while (attempts < 20) {
          // We MUST include all requested elements under targetsForGuest on the counter shelf
          const selectedTargeted = [...targeted];
          const remainingCount = 8 - selectedTargeted.length; // Allow 8 items to ensure diversity
          const shuffledOthers = [...others].sort(() => Math.random() - 0.5);
          const selectedOthers = shuffledOthers.slice(0, remainingCount);
          
          const candidate = [...selectedTargeted, ...selectedOthers];
          // Shuffle the candidate array to ensure visual layout positions are completely randomized/different
          candidate.sort(() => Math.random() - 0.5);
          
          // Ensure the SET of items is different from previous round to keep it fresh
          const candidateSorted = [...candidate].sort();
          const prevSorted = [...rotatedItemIds].sort();
          const isSameSet = JSON.stringify(candidateSorted) === JSON.stringify(prevSorted);
          
          finalRotatedIds = candidate;
          
          // If they are not the same set of items, or we have tried too many times, we proceed
          if (!isSameSet || attempts >= 15) {
            break;
          }
          attempts++;
        }
        
        setRotatedItemIds(finalRotatedIds);
      }
      
      // Dynamically load quick replies returned by the model
      if (data.quickReplies && Array.isArray(data.quickReplies)) {
        setQuickReplies(data.quickReplies);
      } else {
        setQuickReplies(LOCALIZED_QUIC_REPLIES[activeLang] || []);
      }
      
      // Update chat history list
      setChatHistory([{ sender: 'customer', text: data.customerSpeech }]);
    } catch (e) {
      console.error("Failed to fetch customer initialization:", e);
      
      const { targets: targetsForGuest, customerSpeech: fbSpeech } = getOfflineDialogueAndTargets(nextGuestId, 0, activeLang);
      setCurrentTargets(targetsForGuest);

      // Trigger items rotation in catch block too
      const allItems = LOCALIZED_ITEMS[activeLang];
      const allIds = allItems.map(x => x.id);
      
      const targeted: string[] = [];
      for (const t of targetsForGuest) {
        const foundId = allIds.find(id => id === t || id.includes(t) || t.includes(id));
        if (foundId) {
          if (!targeted.includes(foundId)) {
            targeted.push(foundId);
          }
        }
      }
      const others = allIds.filter(id => !targeted.includes(id));
      
      const selectedTargeted = [...targeted];
      const remainingCount = 8 - selectedTargeted.length;
      const shuffledOthers = [...others].sort(() => Math.random() - 0.5);
      const selectedOthers = shuffledOthers.slice(0, remainingCount);
      const finalRotatedIds = [...selectedTargeted, ...selectedOthers].sort(() => Math.random() - 0.5);
      setRotatedItemIds(finalRotatedIds);

      // Fallback
      const fbGuestName = activeLang === "en" ? `Mystic Regular ${nextGuestId}` : activeLang === "ko" ? `신비한 단골 ${nextGuestId}` : `神秘常客 ${nextGuestId}`;
      
      setActiveGuest({
        guestId: nextGuestId,
        guestName: fbGuestName,
        customerSpeech: fbSpeech
      });
      setCustomerMessage(fbSpeech);
      setCustomerFeeling(activeLang === "en" ? "👀 Expectant" : activeLang === "ko" ? "👀 기대" : "👀 期待");
      setQuickReplies(getLocalizedOfflineQuickReplies(activeLang, nextGuestId, targetsForGuest));
      setChatHistory([{ sender: 'customer', text: fbSpeech }]);
    } finally {
      setLoadingGuest(false);
    }
  };

  // Launch initial guest once spreadsheet config is loaded
  useEffect(() => {
    if (gameConfig) {
      loadNewCustomer();
    }
  }, [gameConfig]);

  // Toast auto-dismissal
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Submit Shopkeeper message + Item checklist
  const handleServe = async () => {
    if (loadingGuest || evaluateLoading || transitioningNext) return;
    if (!responseText.trim() && selectedItems.length === 0) {
      showToast(t.toastNoInput, "error");
      return;
    }

    setEvaluateLoading(true);

    // Format shopkeeper bubble entry
    const activeItems = LOCALIZED_ITEMS[lang];
    const itemNames = selectedItems.map(itemId => {
      const found = activeItems.find(x => x.id === itemId);
      return found ? `${found.emoji} ${found.name}` : itemId;
    });
    const itemsLabel = selectedItems.length > 0
      ? (lang === "en"
         ? ` [Served Items: ${itemNames.join(", ")}]`
         : lang === "ko"
         ? ` [전달 상품: ${itemNames.join(", ")}]`
         : ` 【递交商品: ${itemNames.join("、")}】`)
      : "";
    
    const nodMsg = lang === "en" ? "(clicks and nods)" : lang === "ko" ? "(미소로 끄덕임)" : "（微笑点头示意）";
    const displayMessage = `${responseText.trim() || nodMsg}${itemsLabel}`;
    setShopkeeperMessage(displayMessage);

    // Track chat history sent to AI
    const updatedHistory = [
      ...chatHistory,
      { sender: 'shopkeeper', text: displayMessage }
    ];

    try {
      let feedback;
      try {
        const res = await fetch("/api/game/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestId: activeGuest.guestId,
            shopkeeperInput: responseText,
            selectedItems: selectedItems,
            chatHistory: updatedHistory,
            currentSatisfaction: satisfaction,
            lang,
            targets: currentTargets
          })
        });
        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }
        feedback = await res.json();
      } catch (chatError) {
        console.warn("API /api/game/chat failed, running high-fidelity client scoring algorithm:", chatError);
        feedback = evaluateChatOffline(
          activeGuest.guestId,
          responseText,
          selectedItems,
          satisfaction,
          lang,
          currentTargets
        );
      }
      
      // Update customer text bubble
      setCustomerMessage(feedback.customerReply);
      setCustomerFeeling(feedback.feeling || (lang === "en" ? "💬 Chatting" : lang === "ko" ? "💬 대화 중" : "💬 互动中"));
      if (feedback.offlineBadge !== undefined) {
        setAiOfflineMode(!!feedback.offlineBadge);
      }

      // Score evaluation bounded between 0 and 100
      const delta = feedback.satisfactionChange ?? 5;
      setSatisfaction(prev => {
        const next = prev + delta;
        return Math.min(100, Math.max(0, next));
      });

      // Maintain chat history context
      setChatHistory([
        ...updatedHistory,
        { sender: 'customer', text: feedback.customerReply }
      ]);

      // Increase turn counter
      setDialogRoundCount(prev => prev + 1);

      // Wipe out player selections for next turn
      setResponseText("");
      setSelectedItems([]);

      // Automatically transition to the next customer on every single reply or checkout submission
      if (delta < 0) {
        showToast(formatToastText(t.toastSatisfactionDecreased, delta), 'error');
      } else if (delta >= 12) {
        showToast(formatToastText(t.toastSatisfactionIncreasedMajor, delta), 'success');
      } else {
        showToast(formatToastText(t.toastSatisfactionIncreasedNormal, delta), 'info');
      }

      // Auto load next customer if game is not over (satisfaction is not 100 or 0)
      const currentTotal = satisfaction + delta;
      const boundedNewSat = Math.min(100, Math.max(0, currentTotal));

      if (boundedNewSat > 0 && boundedNewSat < 100) {
        setTransitioningNext(true);
        setTimeout(() => {
          loadNewCustomer();
          setTransitioningNext(false);
        }, 3500);
      }
    } catch (error) {
      console.error(error);
      const errMsg = lang === "en" ? "AI response failed, please try again." : lang === "ko" ? "AI 응답 연결 실패, 잠시 후 다시 시도해 주세요." : "AI评价连接崩溃，请稍候再试";
      showToast(errMsg, "error");
    } finally {
      setEvaluateLoading(false);
    }
  };

  // Add item from lower shelf
  const toggleItemSelection = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(x => x !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  // Quick template insertion inside textarea
  const insertTemplate = (text: string) => {
    setResponseText(text);
  };

  // Game state calculators (dynamic drive from parsed sheet values)
  // 1. Background scene selection
  // "当满意度降到30以下时，场景变成3，当满意度到90以上时，场景变成2，初始场景为0"
  const getBGStateKey = () => {
    if (satisfaction < 30) return "3";
    if (satisfaction >= 90) return "2";
    return "0"; // initial scene is 0 (normal)
  };

  const getBGImageSrc = () => {
    // Explicit overrides based on satisfaction thresholds to perfectly guarantee the user requested scenes:
    // 1. Under 30: Frozen Store Exhibition / Crisis (冰封营业危机) (https://drive.google.com/file/d/13zt8hos-X6PriyUw_FwuVcbxzLvgL8t-/view?usp=sharing)
    // 2. 90 or above: Cozy & Bustling Late-Night Store (热闹温馨深夜商店) (https://drive.google.com/file/d/1qeGYv-mAR_xit9ZcdvUO1lyo8c2dYxXP/view?usp=sharing)
    // 3. 30 to 90: Ordinary Night Store (普通夜晚商店) (https://drive.google.com/file/d/12vjxOHGH1u1jYE-KgwwJbG8DTG5JwZlh/view?usp=sharing)
    if (satisfaction < 30) {
      return getDriveImageUrl("https://drive.google.com/file/d/13zt8hos-X6PriyUw_FwuVcbxzLvgL8t-/view?usp=sharing");
    }
    if (satisfaction >= 90) {
      return getDriveImageUrl("https://drive.google.com/file/d/1qeGYv-mAR_xit9ZcdvUO1lyo8c2dYxXP/view?usp=sharing");
    }
    // Normal / initial 30 to 90: Ordinary Night Store
    return getDriveImageUrl("https://drive.google.com/file/d/12vjxOHGH1u1jYE-KgwwJbG8DTG5JwZlh/view?usp=sharing") || "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1000";
  };

  // 2. Character expression selection
  // "当满意度为0~30时，切换为表情0，当满意度为31~70时保持原表情1，当满意度为71~90时，切换表情2，
  //  当满意度为91~100时切换表情3，当满意度到达100后显示游戏成功切换表情Clear"
  const getCharacterStateKey = () => {
    if (satisfaction === 100) return "clear";
    if (satisfaction >= 0 && satisfaction <= 30) return "0";
    if (satisfaction >= 31 && satisfaction <= 70) return "1";
    if (satisfaction >= 71 && satisfaction <= 90) return "2";
    if (satisfaction >= 91 && satisfaction <= 100) return "3";
    return "1";
  };

  const getShopkeeperImageSrc = () => {
    const stateKey = getCharacterStateKey();
    // Explicitly override the character sprite with the user specified success character image when the success state (satisfaction === 100) is reached.
    if (stateKey === "clear") {
      return getDriveImageUrl("https://drive.google.com/file/d/12abPlPGDJTRMtcMtVZhkFsK2VjL2h4fv/view?usp=sharing");
    }
    if (!gameConfig || !gameConfig.character) {
      // Local placeholder fallback
      return "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500";
    }

    const { base, states } = gameConfig.character;
    const match = states.find((s: any) => s.state === stateKey);
    
    // If link is empty, or explicitly labeled "None", use the Base image URL from the spreadsheet header!
    if (!match || match.link === "None" || !match.link) {
      return getDriveImageUrl(base);
    }
    
    return getDriveImageUrl(match.link);
  };

  // 3. Guest image selection
  const getGuestImageSrc = () => {
    if (loadingGuest || !activeGuest || !gameConfig || !gameConfig.guests) {
      return "";
    }
    // Match by ID
    const match = gameConfig.guests.find((g: any) => parseInt(g.state, 10) === activeGuest.guestId);
    if (match) {
      return getDriveImageUrl(match.link);
    }
    return "";
  };

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#FFEECC] text-[#442211] font-sans p-2 lg:p-4 select-none flex flex-col items-center justify-start lg:justify-center overflow-x-hidden">
      <div className="flex flex-col w-full max-w-6xl justify-between gap-3 lg:gap-4 lg:h-[calc(100vh-2.5rem)] lg:max-h-[960px] lg:min-h-[700px] overflow-hidden relative">
        
        {/* Dynamic Toast Alerts */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`fixed top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl font-black shadow-[6px_6px_0px_0px_rgba(102,68,34,1)] border-4 border-[#664422] flex items-center gap-2.5 text-xs sm:text-sm md:text-base max-w-[290px] xs:max-w-xs sm:max-w-sm md:max-w-md w-[88vw] h-auto leading-snug sm:leading-normal whitespace-pre-wrap break-words cursor-pointer select-none active:scale-[0.98] transition-transform ${
                toastType === 'success' 
                  ? 'bg-[#E8F5E9] text-[#2E7D32]' 
                  : toastType === 'error' 
                  ? 'bg-[#FFEBEE] text-[#C62828]' 
                  : 'bg-[#FFF8E1] text-[#7A5C00]'
              }`}
              onClick={() => setToastMessage(null)}
              title="Click to dismiss"
            >
              {toastType === 'success' ? (
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#2E7D32] shrink-0" />
              ) : toastType === 'error' ? (
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-[#C62828] shrink-0" />
              ) : (
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-[#7A5C00] shrink-0" />
              )}
              <span className="flex-grow">{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Game & Tutorial Interface Overlay */}
        <AnimatePresence>
          {!gameStarted && (
            <motion.div
              key="start-screen-overlay"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="absolute inset-0 z-50 bg-cover bg-center rounded-[32px] border-8 border-[#664422] shadow-[12px_12px_0px_0px_rgba(102,68,34,1)] overflow-hidden flex flex-col items-center justify-between p-4 sm:p-8 select-none"
              style={{ backgroundImage: `url(${getDriveImageUrl("https://drive.google.com/file/d/12vjxOHGH1u1jYE-KgwwJbG8DTG5JwZlh/view?usp=sharing")})` }}
            >
              {/* Soft dark tinted drop shade */}
              <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2.5px] z-0" />

              {/* Language Switcher bar */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 sm:gap-2">
                <div className="bg-[#FFD54F] border-4 border-[#664422] shadow-[3px_3px_0px_0px_rgba(102,68,34,1)] rounded-xl py-1 px-2.5 sm:px-3 text-[10px] sm:text-xs font-black flex items-center gap-1.5 text-[#442211]">
                  <Languages className="w-3.5 h-3.5" />
                  <button 
                    onClick={() => changeLanguage('zh')} 
                    className={`hover:text-[#FF7043] transition ${lang === 'zh' ? 'text-[#FF7043] underline decoration-2 underline-offset-2' : 'opacity-85'}`}
                  >
                    中文
                  </button>
                  <span className="text-[#664422]/50 font-bold">|</span>
                  <button 
                    onClick={() => changeLanguage('en')} 
                    className={`hover:text-[#FF7043] transition ${lang === 'en' ? 'text-[#FF7043] underline decoration-2 underline-offset-2' : 'opacity-85'}`}
                  >
                    EN
                  </button>
                  <span className="text-[#664422]/50 font-bold">|</span>
                  <button 
                    onClick={() => changeLanguage('ko')} 
                    className={`hover:text-[#FF7043] transition ${lang === 'ko' ? 'text-[#FF7043] underline decoration-2 underline-offset-2' : 'opacity-85'}`}
                  >
                    한글
                  </button>
                </div>
              </div>

              {/* Centered Content Card */}
              <div className="w-full max-w-[440px] xs:max-w-md sm:max-w-lg z-10 my-auto flex flex-col items-center justify-center text-center gap-5 sm:gap-6">
                <AnimatePresence mode="wait">
                  {!showTutorial ? (
                    /* --- VIEW A: START GAME COVER --- */
                    <motion.div
                      key="start-screen-face animate"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center gap-6 w-full"
                    >
                      {/* Brand Logo Banner Card */}
                      <div className="bg-[#FFD54F] border-8 border-[#664422] rounded-[32px] p-5 sm:p-8 shadow-[8px_8px_0px_0px_rgba(102,68,34,1)] text-[#442211] w-full flex flex-col items-center select-none relative">
                        <div className="bg-[#FF8A65] p-3 rounded-2xl border-4 border-[#664422] shadow-[2.5px_2.5px_0px_0px_rgba(102,68,34,1)] mb-4 animate-bounce shrink-0">
                          <Store className="w-8 h-8 text-white" />
                        </div>
                        
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#5C3F21] tracking-tighter drop-shadow-sm leading-none text-center">
                          {t.gameName}
                        </h1>
                        
                        <div className="h-1 w-2/3 bg-[#664422] my-4 rounded-full opacity-35" />
                        
                        <p className="text-xs sm:text-sm text-[#442211] font-extrabold tracking-tight px-1 leading-relaxed">
                          {t.gameSubtitle}
                        </p>

                        <span className="mt-4 text-[9px] font-mono font-black bg-[#664422] text-white border-2 border-[#664422] rounded-lg px-2.5 py-0.5">
                          Google Sheets Database Driver Active
                        </span>
                      </div>

                      {/* Launch Action Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowTutorial(true)}
                        className="cursor-pointer group relative bg-amber-400 hover:bg-amber-300 active:bg-amber-500 font-extrabold text-[#442211] text-sm sm:text-base md:text-lg py-3.5 px-8 sm:px-10 rounded-[22px] border-4 border-[#664422] shadow-[5px_5px_0px_0px_rgba(102,68,34,1)] hover:shadow-[2px_2px_0px_0px_rgba(102,68,34,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-150 flex items-center justify-center gap-2.5 z-20 animate-pulse"
                      >
                        <Sparkles className="w-4 h-4 fill-[#664422] text-[#664422] group-hover:rotate-12 transition-transform" />
                        <span>{t.startGameBtn}</span>
                      </motion.button>
                    </motion.div>
                  ) : (
                    /* --- VIEW B: TUTORIAL GUIDE BOOK --- */
                    <motion.div
                      key="tutorial-screen-face animate"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center gap-5 w-full"
                    >
                      {/* Decorative Rule Parchment Card */}
                      <div className="bg-[#FFF8E1] border-8 border-[#664422] rounded-[32px] p-5 sm:p-7 shadow-[8px_8px_0px_0px_rgba(102,68,34,1)] text-[#442211] w-full text-left overflow-y-auto max-h-[340px] xs:max-h-[380px] sm:max-h-[420px] custom-scrollbar">
                        
                        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-center text-[#442211] border-b-4 border-[#664422]/20 pb-3 mb-3.5">
                          {t.howToPlayTitle}
                        </h2>
                        
                        <p className="text-xs sm:text-sm font-black leading-relaxed mb-4 text-[#664422]">
                          {t.howToPlayIntro}
                        </p>

                        <div className="flex flex-col gap-3">
                          <div className="bg-[#F4ECE1] border-2 border-[#664422]/30 rounded-xl p-3 shadow-inner">
                            <div className="text-[11px] sm:text-xs font-black text-[#5C3F21] leading-relaxed">
                              {t.howToPlayRule1}
                            </div>
                          </div>

                          <div className="bg-[#F4ECE1] border-2 border-[#664422]/30 rounded-xl p-3 shadow-inner">
                            <div className="text-[11px] sm:text-xs font-black text-[#6B3A0E] leading-relaxed">
                              {t.howToPlayRule2}
                            </div>
                          </div>

                          <div className="bg-[#F4ECE1] border-2 border-[#664422]/30 rounded-xl p-3 shadow-inner">
                            <div className="text-[11px] sm:text-xs font-black text-[#C62828] leading-relaxed">
                              {t.howToPlayRule3}
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Confirm/Continue Action Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setGameStarted(true);
                          setShowTutorial(false);
                          // Activate BGM on first legitimate interactive layout enter to comply with Autoplay rules
                          bgmAudio.play().then(() => {
                            setBgmPlaying(true);
                          }).catch(e => console.log("BGM user interaction activated:", e));
                        }}
                        className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 font-extrabold text-white text-sm sm:text-base py-3 px-8 rounded-2xl border-4 border-[#664422] shadow-[5px_5px_0px_0px_rgba(102,68,34,1)] hover:shadow-[2px_2px_0px_0px_rgba(102,68,34,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-150 flex items-center justify-center gap-2"
                      >
                        <span>{t.continueBtn}</span>
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom attribution inside bounds */}
              <div className="z-10 text-[9px] font-mono font-bold text-[#FFD54F]/75 text-center select-none pointer-events-none mb-1">
                © 2026 AI Moe Convenience Store | Powered by Google Gemini & Sheets
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Header Panel */}
        <header className="w-full flex flex-col lg:flex-row justify-between items-center bg-[#FFD54F] border-8 border-[#664422] rounded-[32px] p-3.5 lg:p-4 mb-1 lg:mb-2 gap-3 shadow-[8px_8px_0px_0px_rgba(102,68,34,1)] text-[#442211] shrink-0" id="game-header">
          
          {/* Market Title */}
          <div className="flex items-center gap-3">
            <div className="bg-[#FF8A65] p-2 rounded-2xl border-4 border-[#664422] shadow-[2px_2px_0px_0px_rgba(102,68,34,1)]">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-[#442211] tracking-tight flex items-center gap-2 drop-shadow-sm leading-none">
                {t.gameName}
                <span className="text-[10px] font-mono font-black bg-[#664422] text-white border-2 border-[#664422] rounded-lg px-2 py-0.5">Vibrant Palette v1.0</span>
              </h1>
              <p className="text-[11px] text-[#664422]/90 font-bold mt-1">{t.gameSubtitle}</p>
            </div>
          </div>

          {/* Global Progress Heart Bar */}
          <div className="flex flex-col items-center flex-grow max-w-sm w-full bg-white px-4 py-2 rounded-[24px] border-4 border-[#664422] shadow-[4px_4px_0px_rgba(102,68,34,0.1)]">
            <div className="flex justify-between w-full text-xs font-black mb-1 items-center">
              <span className="text-rose-600 flex items-center gap-1">
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500 animate-pulse" />
                {t.satisfactionLabel}
              </span>
              <span className="text-lg font-black font-mono text-[#664422]">{satisfaction}%</span>
            </div>
            
            <div className="w-full bg-[#664422] h-5 rounded-full overflow-hidden border-4 border-[#664422] relative p-0.5">
              <motion.div 
                className={`h-full rounded-full transition-all duration-500 relative ${
                  satisfaction <= 30 ? "bg-[#FF5D5D]" : satisfaction >= 90 ? "bg-[#4CAF50]" : "bg-[#4DB6AC]"
                }`}
                style={{ width: `${satisfaction}%` }}
                layoutId="satisfaction-bar"
              >
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-white/25 rounded-r-full" />
              </motion.div>
              {/* Division thresholds lines */}
              <div className="absolute top-0 bottom-0 left-[30%] w-1 bg-[#664422] opacity-50" title={t.criticalThreshold} />
              <div className="absolute top-0 bottom-0 left-[90%] w-1 bg-[#664422] opacity-50" title={t.recommendedThreshold} />
            </div>

            <div className="flex justify-between w-full text-[9px] text-[#664422] mt-0.5 font-bold font-mono">
              <span>{t.criticalThreshold}</span>
              <span className="text-[#664422] font-black bg-[#FFEECC] px-2 py-0.5 rounded-lg border border-[#664422]/20">{t.normalThreshold}</span>
              <span>{t.recommendedThreshold}</span>
            </div>
          </div>

          {/* Sync Controls */}
          <div className="flex flex-wrap items-center gap-2 justify-center">
            {/* Language Selection Buttons */}
            <div className="flex items-center bg-[#FFF8E1] border-4 border-[#664422] rounded-2xl p-1 shadow-[4px_4px_0px_0px_rgba(102,68,34,1)] gap-1 shrink-0">
              <Languages className="w-4 h-4 text-[#664422] ml-1 shrink-0" />
              <button 
                onClick={() => changeLanguage('zh')}
                className={`px-2 py-0.5 text-xs font-black rounded-lg transition-all ${
                  lang === 'zh' ? 'bg-[#FF8A65] text-white' : 'hover:bg-[#FFE0B2] text-[#664422]'
                }`}
                title="中文 (Chinese)"
              >
                中
              </button>
              <button 
                onClick={() => changeLanguage('en')}
                className={`px-2 py-0.5 text-xs font-black rounded-lg transition-all ${
                  lang === 'en' ? 'bg-[#FF8A65] text-white' : 'hover:bg-[#FFE0B2] text-[#664422]'
                }`}
                title="English"
              >
                EN
              </button>
              <button 
                onClick={() => changeLanguage('ko')}
                className={`px-2 py-0.5 text-xs font-black rounded-lg transition-all ${
                  lang === 'ko' ? 'bg-[#FF8A65] text-white' : 'hover:bg-[#FFE0B2] text-[#664422]'
                }`}
                title="한국어 (Korean)"
              >
                한
              </button>
            </div>

            {/* Audio BGM Controller Button */}
            <button 
              onClick={toggleBgm}
              className="flex items-center gap-1.5 text-xs font-black bg-[#FFF8E1] hover:bg-[#FFE0B2] border-4 border-[#664422] text-[#664422] px-3.5 py-2 rounded-2xl transition duration-150 shadow-[4px_4px_0px_0px_rgba(102,68,34,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer max-w-xs shrink-0 font-sans"
              title={bgmPlaying ? (lang === "en" ? "Pause background music" : lang === "ko" ? "배경음악 일시정지" : "暂停背景音乐") : (lang === "en" ? "Play background music" : lang === "ko" ? "배경음악 켜기" : "开启背景音乐")}
            >
              {bgmPlaying ? (
                <Volume2 className={`w-4 h-4 shrink-0 animate-bounce ${satisfaction < 30 ? "text-rose-500 animate-pulse" : "text-emerald-600"}`} />
              ) : (
                <VolumeX className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span>
                {bgmPlaying 
                  ? (satisfaction >= 90 
                      ? t.bgmGold 
                      : satisfaction < 30 
                        ? t.bgmBankruptcy 
                        : t.bgmCozy)
                  : t.bgmMuted}
              </span>
            </button>

            {/* Public Spreadsheet trigger Link */}
            <a 
              href="https://docs.google.com/spreadsheets/d/1JG6Fc18WenhF_05hvHQiOjzh4DIbh5iv3zRIgkK3Lss/edit?usp=drive_link" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-black bg-[#4DB6AC] hover:bg-[#26A69A] border-4 border-[#664422] text-white px-3 py-2 rounded-2xl transition duration-150 shadow-[4px_4px_0px_0px_rgba(102,68,34,1)] active:translate-x-0.5 active:translate-y-0.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t.viewSheet}</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {/* Configuration Resync */}
            <button 
              disabled={loadingConfig}
              onClick={() => fetchConfigAndInit(false)}
              className="flex items-center gap-1 border-4 border-[#664422] bg-[#FF8A65] hover:bg-[#FF7043] text-white text-xs font-black px-3 py-2 rounded-2xl transition duration-150 shadow-[4px_4px_0px_0px_rgba(102,68,34,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingConfig ? "animate-spin" : ""}`} />
              <span>{t.syncItems}</span>
            </button>

            {/* Return to Start Screen (Home) */}
            <button 
              onClick={() => {
                setGameStarted(false);
                setShowTutorial(false);
              }}
              className="p-2 border-4 border-[#664422] bg-[#A1D6E2] hover:bg-[#80C2D6] text-[#442211] rounded-2xl transition shadow-[4px_4px_0px_0px_rgba(102,68,34,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center justify-center"
              title={lang === "en" ? "Return to Start Screen" : lang === "ko" ? "시작 화면으로 이동" : "返回开始界面"}
            >
              <Home className="w-4 h-4 font-black" />
            </button>

            {/* Reset All score trigger */}
            <button 
              onClick={resetGame}
              className="p-2 border-4 border-[#664422] bg-[#FFF8E1] hover:bg-[#FFE0B2] text-[#664422] rounded-2xl transition shadow-[4px_4px_0px_0px_rgba(102,68,34,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center justify-center"
              title={t.resetStore}
            >
              <RotateCcw className="w-4 h-4 font-black" />
            </button>
          </div>
        </header>

        {/* Main Interactive Screen Layer */}
        <main className="w-full flex-grow flex flex-col lg:flex-row items-stretch gap-4 lg:gap-5 lg:h-0 overflow-hidden">
          
          {/* Left Column: Comic Viewport Screen + Manual Switcher Panel */}
          <div className="w-full lg:w-[54%] xl:w-[56%] flex flex-col items-stretch justify-start gap-3 lg:gap-4 shrink-0 lg:shrink lg:h-full lg:overflow-hidden">
            
            {/* Render indicator for offline status */}
            {aiOfflineMode && (
              <div className="w-full bg-white border-4 border-[#664422] text-[#664422] rounded-[24px] p-3 text-xs font-bold flex items-center gap-2 shadow-[6px_6px_0px_rgba(102,68,34,0.1)]">
                <Info className="w-4 h-4 text-[#FF8A65] shrink-0" />
                <span>{t.offlineStatusBanner}</span>
              </div>
            )}

            {/* 16:9 Landscape Screen Wrapper */}
            <section 
              className="w-full aspect-[16/9] lg:aspect-auto lg:flex-grow rounded-[32px] overflow-hidden border-[12px] border-[#664422] shadow-[12px_12px_0px_0px_rgba(102,68,34,1)] bg-[#A1D6E2] relative flex flex-col justify-between shrink-0 lg:shrink lg:h-0"
              id="landscape-viewport"
            >
              {/* Scenic Dynamic Background */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={getBGImageSrc()} 
                  alt="Convenience Mart Background" 
                  className="w-full h-full object-cover select-none pointer-events-none filter brightness-[0.85] contrast-[1.05]"
                  referrerPolicy="no-referrer"
                />
                {/* Visual Color Overlay under different moods */}
                {satisfaction <= 30 && (
                  <div className="absolute inset-x-0 inset-y-0 bg-[#FF5D5D]/25 border-8 border-[#FF5D5D]/40 rounded-2xl animate-pulse pointer-events-none" />
                )}
                {satisfaction >= 90 && (
                  <div className="absolute inset-x-0 inset-y-0 bg-[#FFD54F]/10 pointer-events-none link-color" />
                )}
                {/* Soft vignette shadows */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#664422]/50 via-transparent to-[#664422]/25 pointer-events-none align-middle" />
              </div>

              {/* Ambient weather particles */}
              {satisfaction <= 30 && (
                <div className="absolute top-12 right-6 bg-red-600/95 text-[10.5px] font-mono border-2 border-white text-white font-extrabold py-1 px-3 rounded-full z-35 animate-pulse flex items-center gap-1 shadow-lg whitespace-nowrap">
                  <Flame className="w-3 h-3 animate-bounce" /> 
                  <span>{t.warningAlertMessage}</span>
                </div>
              )}

              {satisfaction < 30 && (
                <>
                  {/* Tense crisis effects: flashing warning screen border & rising danger symbols */}
                  <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                    <div className="absolute inset-0 border-8 border-red-500 animate-pulse rounded-2xl shadow-[inset_0_0_40px_rgba(239,68,68,0.75)] pointer-events-none" />
                    
                    {/* Floating crisis warning signals */}
                    {particlesType === 'warnings' && particles.map((p) => {
                      const items = ["🚨", "⚠️", "💔", "💥", "🔥"];
                      const symbol = items[p.id % items.length];
                      return (
                        <motion.div
                          key={p.id}
                          initial={{ y: "115%", opacity: 0, scale: p.scale, rotate: 0 }}
                          animate={{ 
                            y: "-15%", 
                            opacity: [0, 0.95, 1, 0.95, 0], 
                            scale: [p.scale * 0.7, p.scale, p.scale * 0.9],
                            rotate: [-15, 15, -15]
                          }}
                          transition={{
                            duration: p.duration,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: "easeInOut"
                          }}
                          className="absolute select-none text-xl md:text-2xl filter drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                          style={{ left: `${p.left}%` }}
                        >
                          {symbol}
                        </motion.div>
                      );
                    })}

                    {/* Pulsing crisis label bar */}
                    <motion.div
                      initial={{ scale: 0.94, opacity: 0.9 }}
                      animate={{ scale: [0.97, 1.05, 0.97], opacity: [0.9, 1, 0.9] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute bottom-[44%] left-1/2 -translate-x-1/2 bg-red-600 bg-opacity-95 text-white font-black text-xs md:text-sm py-2.5 px-6 rounded-full border-4 border-white shadow-[0_4px_15px_rgba(220,38,38,0.5)] flex items-center gap-2 whitespace-nowrap"
                    >
                      <Flame className="w-4 h-4 text-white animate-bounce shrink-0" />
                      <span className="tracking-wide text-white">{t.dangerAlertLabel}</span>
                    </motion.div>
                  </div>
                </>
              )}

              {satisfaction >= 90 && satisfaction < 100 && (
                <>
                  {/* Gold pulsing status banner */}
                  <div className="absolute top-12 right-6 bg-[#FFD54F] text-[10.5px] font-mono border-2 border-[#664422] text-slate-950 font-extrabold py-1 px-3.5 rounded-full z-35 animate-bounce flex items-center gap-1 shadow-lg whitespace-nowrap">
                    <Sparkles className="w-3 h-3 fill-[#664422]" />
                    <span>
                      {lang === "en" 
                        ? "Trending Cyber Landmark! Success is close at hand!" 
                        : lang === "ko" 
                        ? "소문난 인기 핫플레이스! 성공이 바로 코앞에 찾아왔습니다!" 
                        : "爆红网红地标！小店即将大获全胜！"}
                    </span>
                  </div>

                  {/* Pulsing Success Approaching Special Effects: Glorious screen border glow & floating star sparkles! */}
                  <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                    <div className="absolute inset-0 border-8 border-yellow-400 animate-pulse rounded-2xl shadow-[inset_0_0_50px_rgba(255,215,0,0.65)] pointer-events-none" />
                    
                    {/* Floating particle stars */}
                    {particles.map((p) => (
                      <motion.div
                        key={p.id}
                        initial={{ y: "115%", opacity: 0, scale: p.scale, rotate: 0 }}
                        animate={{ 
                          y: "-15%", 
                          opacity: [0, 0.9, 1, 0.9, 0], 
                          scale: [p.scale * 0.5, p.scale, p.scale * 0.8],
                          rotate: [0, 180, 360]
                        }}
                        transition={{
                          duration: p.duration,
                          repeat: Infinity,
                          delay: p.delay,
                          ease: "easeInOut"
                        }}
                        className="absolute text-yellow-300 font-bold select-none text-2xl filter drop-shadow-[0_0_6px_rgba(255,215,0,0.8)]"
                        style={{ left: `${p.left}%` }}
                      >
                        ★
                      </motion.div>
                    ))}

                    {/* Sparkling floating message bar in center area */}
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0.85 }}
                      animate={{ scale: [1, 1.06, 1], opacity: [0.95, 1, 0.95] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute bottom-[42%] left-1/2 -translate-x-1/2 bg-yellow-400 bg-opacity-95 text-[#664422] font-black text-xs md:text-sm py-2 px-5 rounded-full border-4 border-[#664422] shadow-[4px_4px_0px_rgba(102,68,34,1)] flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Sparkles className="w-4 h-4 fill-[#664422] animate-spin" />
                      <span>
                        {lang === "en" 
                          ? "Come on Manager! We are close to success! ✨🏪" 
                          : lang === "ko" 
                          ? "점장님 힘내세요! 성공이 눈앞에 있어요! ✨🏪" 
                          : "店长加油！我们快要成功啦！✨🏪"}
                      </span>
                    </motion.div>
                  </div>
                </>
              )}

              {/* Scene Top Banner */}
              <p className="z-10 text-[11px] font-extrabold bg-[#FFD54F] text-[#442211] border-b-4 border-[#664422] px-4 py-1 text-center select-none shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
                {t.sceneLabel} {getBGStateKey() === "0" ? t.sceneNormal : getBGStateKey() === "2" ? t.sceneNight : t.sceneCrisis}
              </p>

              {/* Character Stage Area (Aligned above the bottom desk counter) */}
              <div className="absolute inset-x-0 top-0 bottom-[38%] z-10 flex items-end justify-between px-[5%] select-none">
                
                {/* GUEST SPRITE (LEFT SIDE) */}
                <div className="w-[45%] h-full flex flex-col justify-end items-center relative">
                  <AnimatePresence mode="wait">
                    {!loadingGuest && activeGuest ? (
                      <motion.div 
                        key={activeGuest.guestId}
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -80, opacity: 0 }}
                        className="h-full max-h-full aspect-square flex items-end justify-center relative group -translate-x-6 sm:-translate-x-8 lg:-translate-x-10 translate-y-[45px]"
                      >
                        {/* Character Base Image */}
                        {getGuestImageSrc() ? (
                          <img 
                            src={getGuestImageSrc()} 
                            alt={activeGuest.guestName}
                            className="h-full w-auto object-contain filter drop-shadow-[0_8px_16px_rgba(102,68,34,0.5)] select-none pointer-events-none transform hover:scale-105 transition-all duration-300"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          // Backup beautiful generic illustration wrapper if link broken
                          <div className="h-full aspect-[3/4] bg-[#FF8A65] border-8 border-[#664422] rounded-[32px] flex flex-col items-center justify-center p-3 text-center shadow-lg relative">
                            <span className="text-4xl">🧑‍🚀</span>
                            <span className="font-extrabold text-[#FFF] mt-2 block drop-shadow-sm">{activeGuest.guestName || (lang === 'en' ? "Guest" : lang === 'ko' ? "손님" : "顾客")}</span>
                            <span className="text-[10px] text-white/95 leading-normal">
                              {lang === "en" ? "Illustrating..." : lang === "ko" ? "일러스트 준비 중..." : "贴贴准备中..."}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <div className="h-[70%] flex items-center justify-center">
                        <div className="relative flex items-center justify-center">
                          <div className="w-12 h-12 border-4 border-[#664422] border-t-transparent rounded-full animate-spin" />
                          <Store className="w-5 h-5 text-[#664422] absolute" />
                        </div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* SHOPKEEPER (PLAYER CHARACTER) (RIGHT SIDE) */}
                <div className="w-[45%] h-full flex flex-col justify-end items-center relative">
                  <AnimatePresence mode="wait">
                      <motion.div 
                        key={getCharacterStateKey()}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full max-h-full aspect-square flex items-end justify-center relative translate-x-6 sm:translate-x-8 lg:translate-x-10 translate-y-[45px]"
                      >
                      {/* Shopkeeper Base expression image */}
                      {getShopkeeperImageSrc() ? (
                        <img 
                          src={getShopkeeperImageSrc()} 
                          alt="Shopkeeper Expression"
                          className="h-full w-auto object-contain filter drop-shadow-[0_8px_16px_rgba(102,68,34,0.5)] select-none pointer-events-none"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        // Default cute avatar
                        <div className="h-full aspect-[3/4] bg-[#4DB6AC] border-8 border-[#664422] rounded-[40px] flex flex-col items-center justify-center text-center p-4 relative">
                          <span className="text-4xl">🤠</span>
                          <span className="font-black text-white mt-2 block">
                            {lang === "en" ? "Expression " + getCharacterStateKey() : lang === "ko" ? "표정 " + getCharacterStateKey() : "表情 " + getCharacterStateKey()}
                          </span>
                          <span className="text-[10px] text-teal-950/80 shrink-0">
                            {lang === "en" ? "Loading..." : lang === "ko" ? "로딩 중..." : "加载中..."}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

              </div>

              {/* Unified Dialogue Counter Bottom Area */}
              <div className="absolute bottom-0 inset-x-0 h-[38%] bg-gradient-to-b from-[#8E7066] to-[#6A4D43] border-t-8 border-[#563A31] pt-2 pb-1.5 px-3 sm:px-4 flex justify-between gap-3 sm:gap-4 z-20 shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] select-none">
                
                {/* CUSTOMER RESPONSE BOARD (LEFT) */}
                <div className="w-[49%] h-[92%] flex flex-col select-text">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={customerMessage}
                    className="w-full h-full bg-white text-[#442211] rounded-2xl p-2 border-4 border-[#664422] flex flex-col shadow-[4px_4px_0_rgba(102,68,34,0.15)] overflow-hidden"
                  >
                    {/* Speaker info bar */}
                    <div className="flex items-start justify-between gap-2 mb-1 border-b-2 border-[#664422]/20 pb-0.5 font-black shrink-0">
                      <span className="text-[#664422] text-[9px] sm:text-[10.5px] leading-tight flex items-start gap-1 min-w-0">
                        <span className="shrink-0">{lang === "en" ? "👤 Guest:" : lang === "ko" ? "👤 손님:" : "👤 顾客:"}</span> <span className="text-rose-600 font-extrabold break-words">{activeGuest?.guestName || (lang === 'en' ? "Guest" : lang === 'ko' ? "손님" : "未命名")}</span>
                      </span>
                      <span className="bg-[#FF8A65] border border-[#664422] text-white px-1.5 py-0.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase shrink max-w-[50%] text-center break-words whitespace-normal leading-normal font-sans">
                        {customerFeeling}
                      </span>
                    </div>

                    {/* Speech content */}
                    <p className="text-[#442211] break-all leading-snug sm:leading-relaxed font-black text-[9.5px] sm:text-[11px] flex-grow overflow-y-auto pr-1">
                      {transitioningNext ? (
                        <span className="text-[#2E7D32] animate-pulse flex flex-col justify-center items-start gap-1 py-1 text-[9px] sm:text-[10px]">
                          <span className="flex items-center gap-1.5 text-rose-600">
                            {lang === "en" ? "🚪 Transaction cleared, sending off the previous guest..." : lang === "ko" ? "🚪 계산 완료, 이전 손님이 배웅을 받고 있습니다..." : "🚪 交易结清，正在送走上一位顾客..."}
                          </span>
                          <span className="text-[#558B2F]">
                            {lang === "en" ? "🔔 Tintin! Next mystic guest is pushing the door and walking in... (~3s)" : lang === "ko" ? "🔔 딩동! 다음 신비한 손님이 문을 열고 들어오는 중입니다... (약 3초)" : "🔔 叮咚！下一位神秘顾客正在推门快步走入... (约3s)"}
                          </span>
                        </span>
                      ) : (
                        customerMessage
                      )}
                    </p>
                  </motion.div>
                </div>

                {/* SHOPKEEPER REPLY BOARD (RIGHT) */}
                <div className="w-[49%] h-[92%] flex flex-col select-text">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={shopkeeperMessage}
                    className="w-full h-full bg-[#E0F2F1] text-[#442211] rounded-2xl p-2 border-4 border-[#664422] flex flex-col shadow-[4px_4px_0_rgba(102,68,34,0.15)] overflow-hidden"
                  >
                    {/* Speaker info bar */}
                    <div className="flex items-start justify-between gap-2 mb-1 border-b-2 border-[#664422]/20 pb-0.5 font-black shrink-0">
                      <span className="text-[#664422] text-[9px] sm:text-[10.5px] leading-tight flex items-start gap-1 min-w-0">
                        <span className="shrink-0">{lang === "en" ? "🏪 Me (Manager):" : lang === "ko" ? "🏪 나 (점장):" : "🏪 我 (店长):"}</span>
                      </span>
                      <span className="bg-[#4DB6AC] border border-[#664422] text-white px-1.5 py-0.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase shrink max-w-[50%] text-center break-words whitespace-normal leading-normal font-sans">
                        {t.statusOnline}
                      </span>
                    </div>

                    {/* Speech content */}
                    <p className="text-[#1A3038] font-black break-all leading-snug sm:leading-relaxed text-[9.5px] sm:text-[11px] flex-grow overflow-y-auto pr-1">
                      {shopkeeperMessage}
                    </p>
                  </motion.div>
                </div>

              </div>

              {/* GAME DYNAMICS OVERLAYS (SUCCESS & RETRY STATES) */}
              
              {/* 1. SUCCESS OVERLAY (SATISFACTION === 100) */}
              {satisfaction === 100 && (
                <div className="absolute inset-0 bg-[#664422]/85 backdrop-blur-md z-40 flex flex-col items-center justify-center p-4 overflow-y-auto">
                  <motion.div 
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-[290px] xs:max-w-xs sm:max-w-sm w-[92%] my-auto bg-white rounded-[24px] sm:rounded-[32px] border-4 sm:border-6 border-[#4CAF50] p-4 sm:p-5 text-center shadow-2xl relative text-[#442211] flex flex-col justify-between overflow-visible shrink-0"
                  >
                    {/* Title Badge nested inside the card flow to prevent clipping */}
                    <div className="mx-auto bg-[#FFD54F] text-[#442211] font-black px-4 sm:px-5 py-1 sm:py-1.5 rounded-full border-[3px] sm:border-4 border-[#664422] shadow-[3px_3px_0px_0px_rgba(102,68,34,1)] text-[11px] sm:text-xs md:text-sm animate-bounce whitespace-nowrap z-50 mb-3">
                      {t.successTitle}
                    </div>
                    
                    {/* Character clear image */}
                    <div className="h-16 sm:h-22 md:h-26 flex items-center justify-center my-1 sm:my-2 shrink-0">
                      {getShopkeeperImageSrc() ? (
                        <img 
                          src={getShopkeeperImageSrc()} 
                          alt="Game Success" 
                          className="h-full w-auto object-contain filter drop-shadow-[0_4px_8px_rgba(102,68,34,0.3)] animate-pulse"
                        />
                      ) : (
                        <span className="text-4xl sm:text-5xl">🏆</span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base md:text-lg font-black text-[#442211] mt-1 shrink-0">{t.successSubtitle}</h3>
                    <p className="text-[10px] sm:text-xs text-[#664422] mt-1 mb-2 font-bold leading-snug sm:leading-relaxed overflow-y-auto max-h-[80px]">
                      {t.successDesc}
                    </p>

                    <div className="flex gap-4 mt-1 shrink-0">
                      <button 
                        onClick={() => {
                          resetGame();
                        }}
                        className="flex-grow bg-[#4CAF50] hover:bg-[#388E3C] text-white font-black text-[10.5px] sm:text-xs md:text-sm py-2 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl transition duration-150 border-2 sm:border-4 border-[#664422] shadow-[3px_3px_0px_0px_rgba(102,68,34,1)] cursor-pointer active:translate-y-0.5"
                      >
                        {t.successNextBtn}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* 2. FAILURE OVERLAY (SATISFACTION === 0) */}
              {satisfaction === 0 && (
                <div className="absolute inset-0 bg-[#FF5D5D]/90 backdrop-blur-md z-40 flex flex-col items-center justify-center p-4 overflow-y-auto">
                  <motion.div 
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-[290px] xs:max-w-xs sm:max-w-sm w-[92%] my-auto bg-white rounded-[24px] sm:rounded-[32px] border-4 sm:border-6 border-[#FF5D5D] p-4 sm:p-5 text-center shadow-2xl relative text-[#442211] flex flex-col justify-between overflow-visible shrink-0"
                  >
                    {/* Title Badge nested inside the card flow to prevent clipping */}
                    <div className="mx-auto bg-[#FF5D5D] text-white font-black px-4 sm:px-5 py-1 sm:py-1.5 rounded-full border-[3px] sm:border-4 border-[#664422] shadow-[3px_3px_0px_0px_rgba(102,68,34,1)] text-[11px] sm:text-xs md:text-sm flex items-center justify-center gap-1.5 animate-pulse whitespace-nowrap z-50 mb-3">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.failedTitle}</span>
                    </div>
                    
                    {/* Defeated expression */}
                    <div className="h-16 sm:h-22 md:h-26 flex items-center justify-center my-1 sm:my-2 shrink-0">
                      {getShopkeeperImageSrc() ? (
                        <img 
                          src={getShopkeeperImageSrc()} 
                          alt="Game Over Defeated" 
                          className="h-full w-auto object-contain filter grayscale border-red-500/10"
                        />
                      ) : (
                        <span className="text-4xl sm:text-5xl">💀</span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base md:text-lg font-black text-red-500 mt-1 shrink-0">{t.failedSubtitle}</h3>
                    <p className="text-[10px] sm:text-xs text-[#664422] mt-1 mb-2 font-bold leading-snug sm:leading-relaxed overflow-y-auto max-h-[80px]">
                      {t.failedDesc}
                    </p>

                    <div className="flex gap-4 mt-1 shrink-0">
                      <button 
                        onClick={() => {
                          resetGame();
                        }}
                        className="flex-grow bg-[#FF7043] hover:bg-[#D84315] text-white font-black text-[10.5px] sm:text-xs md:text-sm py-2 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl transition duration-150 border-2 sm:border-4 border-[#664422] shadow-[3px_3px_0px_0px_rgba(102,68,34,1)] cursor-pointer active:translate-y-0.5"
                      >
                        {t.failedRetryBtn}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

            </section>

            {/* Dynamic transition controller inside active layout */}
            <section className="w-full bg-[#FFF8E1] border-4 border-[#664422] rounded-2xl px-4 py-2 text-xs text-[#442211] shadow-[4px_4px_0px_0px_rgba(102,68,34,1)] flex flex-col sm:flex-row gap-2 justify-between items-center shrink-0">
              <div className="flex items-center gap-1.5 font-black text-slate-800">
                <span className="text-[#664422]">{t.currentGuestLabel}</span> 
                <strong className="text-rose-600 font-black bg-white px-2 py-0.5 rounded-lg border-2 border-[#664422]/20">
                  {activeGuest?.guestName || (lang === "en" ? "Loading..." : lang === "ko" ? "로딩 중..." : "加载中")}
                </strong>
                <span className="text-[#664422]/70 font-semibold text-[10px] sm:text-xs">
                  {lang === "en" ? `(${dialogRoundCount} rds)` : lang === "ko" ? `(${dialogRoundCount}회)` : `(${dialogRoundCount} 回合)`}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-1.5 justify-center">
                <button 
                  disabled={loadingGuest || transitioningNext}
                  onClick={() => loadNewCustomer(0)}
                  className="bg-white hover:bg-[#FFE0B2] font-black border-2 border-[#664422] px-2 py-1 rounded-xl text-[#664422] text-[10px] transition cursor-pointer active:translate-y-0.5 disabled:opacity-50"
                >
                  {t.switchLin}
                </button>
                <button 
                  disabled={loadingGuest || transitioningNext}
                  onClick={() => loadNewCustomer(1)}
                  className="bg-white hover:bg-[#FFE0B2] font-black border-2 border-[#664422] px-2 py-1 rounded-xl text-[#664422] text-[10px] transition cursor-pointer active:translate-y-0.5 disabled:opacity-50"
                >
                  {t.switchTaozi}
                </button>
                <button 
                  disabled={loadingGuest || transitioningNext}
                  onClick={() => loadNewCustomer(2)}
                  className="bg-white hover:bg-[#FFE0B2] font-black border-2 border-[#664422] px-2 py-1 rounded-xl text-[#664422] text-[10px] transition cursor-pointer active:translate-y-0.5 disabled:opacity-50"
                >
                  {t.switchAhao}
                </button>
                <button 
                  disabled={loadingGuest || transitioningNext}
                  onClick={() => loadNewCustomer(3)}
                  className="bg-white hover:bg-[#FFE0B2] font-black border-2 border-[#664422] px-2 py-1 rounded-xl text-[#664422] text-[10px] transition cursor-pointer active:translate-y-0.5 disabled:opacity-50"
                >
                  {t.switchLaozhang}
                </button>
                <button 
                  disabled={loadingGuest || transitioningNext}
                  onClick={() => loadNewCustomer()}
                  className="bg-[#4DB6AC] hover:bg-[#26A69A] text-white border-2 border-[#664422] font-black text-[10px] px-2.5 py-1 rounded-xl transition duration-150 cursor-pointer active:translate-y-0.5 disabled:opacity-50 font-sans"
                >
                  {t.randomGuest}
                </button>
              </div>
            </section>
          </div>

          {/* Right Column: Interaction Console Panel (Shelves + Inputs) */}
          <div className="w-full lg:w-[46%] xl:w-[44%] flex flex-col items-stretch justify-start lg:h-full lg:overflow-hidden" id="desktop-console">
            
            {/* BOTTOM WORK INTERACTION SHELF PANEL */}
            <section 
              className="w-full lg:flex-grow bg-[#FFF8E1] border-[6px] xl:border-8 border-[#664422] rounded-[24px] xl:rounded-[32px] p-3 xl:p-4 shadow-[8px_8px_0px_0px_rgba(102,68,34,1)] xl:shadow-[12px_12px_0px_0px_rgba(102,68,34,1)] text-[#442211] flex flex-col justify-between gap-2.5 lg:h-0 overflow-y-auto lg:overflow-y-hidden"
              id="interaction-panel"
            >
              
              {/* Row 1: Item Shelf display */}
              <div className="mb-1 xl:mb-1.5 shrink-0">
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-[11px] xl:text-xs font-black text-[#664422] flex items-center gap-1.5 uppercase tracking-wide">
                    <span>{t.itemShelfHeader}</span>
                  </h2>
                  {selectedItems.length > 0 && (
                    <button 
                      onClick={clearSelection}
                      className="text-[9px] xl:text-[10px] font-black text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-500 rounded-lg px-2 py-0.5 transition flex items-center gap-1 cursor-pointer active:scale-95 font-sans"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t.clearTray}</span>
                    </button>
                  )}
                </div>

                {/* Shelf Grid items */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-1.5">
                  {(() => {
                    const itemsList = rotatedItemIds.length > 0
                      ? (rotatedItemIds
                          .map(id => LOCALIZED_ITEMS[lang].find(item => item.id === id))
                          .filter(Boolean) as typeof LOCALIZED_ITEMS[LanguageType])
                      : LOCALIZED_ITEMS[lang];
                    return itemsList;
                  })().map((item) => {
                    const isSelected = selectedItems.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItemSelection(item.id)}
                        className={`text-left rounded-xl p-1.5 border-[3px] transition duration-150 cursor-pointer relative flex flex-col justify-between h-[75px] lg:h-[80px] xl:h-[88px] ${
                          isSelected 
                            ? "bg-[#FFD54F] border-[#D84315] text-[#442211] shadow-[2px_2px_0px_rgba(216,67,21,1)] scale-[1.01] -translate-y-0.5 font-bold" 
                            : "bg-white hover:bg-[#FFE0B2] border-[#664422] text-[#442211] shadow-[2.5px_2.5px_0px_rgba(102,68,34,1)] active:translate-y-0.5"
                        }`}
                      >
                        <div className="flex items-start gap-1.5 mb-0.5">
                          <span className="text-lg drop-shadow-sm shrink-0 leading-none">{item.emoji}</span>
                          <div className="min-w-0 flex-grow">
                            <span className="text-[10px] xl:text-xs font-black block leading-tight text-[#442211] whitespace-normal break-words">{item.name}</span>
                            <span className="text-[8px] xl:text-[9px] font-mono font-black bg-[#FFEECC] border border-[#664422] px-1 rounded text-[#442211] mt-0.5 inline-block leading-tight">{item.cost}</span>
                          </div>
                        </div>
                        <p className="text-[9px] xl:text-[10px] text-[#664422]/80 leading-tight block truncate select-none" title={item.desc}>
                          {item.desc}
                        </p>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D84315] border border-white animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Dialogue response template row + typing zone */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-2.5 flex-grow lg:h-0">
                
                {/* Quick response template selection */}
                <div className="xl:col-span-1 bg-white p-2 xl:p-2.5 rounded-2xl border-4 border-[#664422] shadow-[3px_3px_0px_rgba(102,68,34,0.1)] flex flex-col justify-between overflow-hidden lg:h-full">
                  <h3 className="text-[10px] xl:text-xs font-black text-[#664422] mb-1 uppercase tracking-wide shrink-0">{t.quickRepliesHeader}</h3>
                  <div className="flex flex-row xl:flex-col gap-1 overflow-x-auto xl:overflow-x-hidden xl:overflow-y-auto pb-1 pb-0 flex-grow lg:h-0">
                    {quickReplies.map((reply, idx) => (
                      <button
                        key={idx}
                        onClick={() => insertTemplate(reply)}
                        className="w-auto xl:w-full text-left font-black text-[9px] xl:text-[10px] bg-[#FFF8E1] hover:bg-[#FFE0B2] border bg-opacity-95 border-[#664422] p-1 xl:p-1.5 rounded-xl text-[#664422] transition duration-100 truncate active:scale-[0.99] cursor-pointer whitespace-nowrap xl:whitespace-normal shrink-0"
                        title={reply}
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Input response terminal */}
                <div className="xl:col-span-2 flex flex-col justify-between bg-white p-2.5 xl:p-3 rounded-2xl border-4 border-[#664422] shadow-[3px_3px_0px_rgba(102,68,34,0.1)]">
                  
                  {/* Counter status area */}
                  <div className="flex justify-between items-center mb-1 shrink-0">
                    <h4 className="text-[10px] xl:text-xs font-black text-[#664422] tracking-wide">{t.customRepliesHeader}</h4>
                    <div className="flex flex-wrap items-center gap-1">
                      {selectedItems.length === 0 ? (
                        <span className="text-[9px] xl:text-[10px] text-[#664422]/60 font-black italic">{t.noItemsPacked}</span>
                      ) : (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[9px] xl:text-[10px] text-rose-600 font-extrabold shrink-0 mr-1">{t.packedLabel}</span>
                          {selectedItems.map((item, idx) => {
                            const activeItems = LOCALIZED_ITEMS[lang];
                            const found = activeItems.find(x => x.id === item);
                            const labelText = found ? `${found.emoji} *` : item;
                            return (
                              <span key={idx} className="bg-[#FF8A65] border border-[#664422] text-white font-black text-[8px] xl:text-[9px] px-1 py-0.5 rounded flex items-center shrink-0 leading-none">
                                {labelText}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Input text box */}
                  <div className="flex-grow flex gap-2">
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      disabled={loadingGuest || evaluateLoading || transitioningNext}
                      placeholder={t.customPlaceholder}
                      className="flex-grow bg-[#FFF8E1] border-4 border-[#664422] rounded-xl p-2 xl:p-2.5 text-[9px] xl:text-[10px] text-[#442211] placeholder-[#664422]/55 focus:outline-none focus:bg-[#FFF] focus:ring-2 focus:ring-[#FFD54F] resize-none h-20 xl:h-[105px] font-bold transition disabled:opacity-65"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleServe();
                        }
                      }}
                    />
                    
                    {/* Submit button bar */}
                    <button
                      disabled={loadingGuest || evaluateLoading || transitioningNext}
                      onClick={handleServe}
                      className="w-16 xl:w-20 bg-[#FF7043] hover:bg-[#FF8A65] hover:scale-102 active:scale-95 text-white font-black rounded-2xl border-4 border-[#664422] flex flex-col items-center justify-center gap-1 shadow-[3px_3px_0px_rgba(102,68,34,1)] hover:shadow-[1.5px_1.5px_0px_rgba(102,68,34,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition duration-150 cursor-pointer disabled:opacity-50 shrink-0 uppercase"
                    >
                      {evaluateLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-white" />
                          <span className="text-[8px] xl:text-[9px] font-black uppercase shrink-0">{t.serveBtn}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Visual guidance indicator */}
                  <div className="flex justify-between items-center mt-1 text-[8px] xl:text-[9px] text-[#664422]/70 font-bold shrink-0">
                    <span>{t.enterGuidance}</span>
                    <span>{t.hintGuidance}</span>
                  </div>
                  
                </div>

              </div>

            </section>
            
          </div>

        </main>

        {/* Decorative Footer */}
        <footer className="mt-1 lg:mt-2 text-center text-[#664422] text-[10px] lg:text-xs py-1 select-none font-bold shrink-0">
          <p>{t.footerLine1} <span className="font-mono opacity-85">| {t.footerLine2}</span></p>
        </footer>
      </div>
    </div>
  );
}
