import { useEffect, useState, useRef } from "react";
import { GlossaryManager } from "./components/GlossaryManager";
import type { GlossaryEntry } from "./components/GlossaryManager";
import { PhoneticAlphabetPanel } from "./components/PhoneticAlphabetPanel";
import { useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./components/LoginPage";
import { EditableUserName } from "./components/EditableUserName";
import { useInterpreterEngine } from "./hooks/useInterpreterEngine";
import logoHorizontal from "./assets/logo-horizontal.svg";
import packageJson from "../package.json";
import "./App.css";

export const STT_LANGUAGES = [
  { code: "es", name: "Spanish" },
  { code: "en", name: "English" },
];

export const TARGET_LANGUAGES = [
  { code: "English", name: "English" },
  { code: "Spanish", name: "Spanish" },
];

const LANGUAGE_MAPPING: Record<string, string> = {
  es: "Spanish",
  en: "English",
};

const DEFAULT_STT_MAP: Record<string, string> = {
  Spanish: "es",
  English: "en",
};

function App() {
  const { user, loading, signOut, session } = useAuth();
  // We'll map the UI's swap logic to sourceLang and targetLang
  const [sourceLang, setSourceLang] = useState("en-US");
  const [targetLang, setTargetLang] = useState("Spanish");
  
  const isEnSource = sourceLang.startsWith("en");

  // Custom Glossary
  const [glossary, setGlossary] = useState<GlossaryEntry[]>(() => {
    const saved = localStorage.getItem("interpreter_glossary_v2");
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((item: any) => {
        if (item.english && item.spanishVariants) return item;
        let eng = "";
        let spa = "";
        if (item.sourceLang?.includes("en")) {
          eng = item.sourceTerm || "";
          spa = item.targetTerm || "";
        } else {
          eng = item.targetTerm || "";
          spa = item.sourceTerm || "";
        }
        const variants = spa
          .split("/")
          .map((s: string) => s.trim().replace(/\n/g, ""))
          .filter(Boolean);
        return {
          id: item.id || Date.now().toString() + Math.random(),
          english: eng.trim(),
          spanishVariants: variants,
        };
      });
    } catch {
      return [];
    }
  });

  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isPhoneticOpen, setIsPhoneticOpen] = useState(false);
  const [timerSec, setTimerSec] = useState(0);
  const timerInt = useRef<NodeJS.Timeout | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  // Reset signal for EditableUserName — incremented on STOP
  const [userNameResetSignal, setUserNameResetSignal] = useState(0);

  const sourceLangName =
    STT_LANGUAGES.find((l) => l.code === sourceLang.split("-")[0])?.name ||
    "English";

  // Use the new Node.js/Electron Engine hook
  const {
    status,
    messages,
    interimText,
    errorLog,
    startEngine,
    pauseEngine,
    resumeEngine,
    stopEngine,
    clearMessages,
    updateMessageCorrection,
    downloadProgress,
    updateAvailable,
    updateReady,
  } = useInterpreterEngine({
    sourceLang,
    sourceLangName,
    targetLang,
    glossary,
    session,
  });

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  useEffect(() => {
    localStorage.setItem("interpreter_glossary_v2", JSON.stringify(glossary));
  }, [glossary]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  // Timer logic
  useEffect(() => {
    if (status === "running") {
      timerInt.current = setInterval(() => {
        setTimerSec((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerInt.current) clearInterval(timerInt.current);
    }
    return () => {
      if (timerInt.current) clearInterval(timerInt.current);
    };
  }, [status]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef<boolean>(true);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 80;
    isNearBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  useEffect(() => {
    if (isNearBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, interimText]);

  // Live Correction Handlers
  const handleDoubleClick = (id: string, currentText: string) => {
    setEditingMessageId(id);
    setEditingText(currentText);
  };

  const handleEditKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    id: string,
  ) => {
    if (e.key === "Enter") {
      saveCorrection(id);
    } else if (e.key === "Escape") {
      setEditingMessageId(null);
    }
  };

  const saveCorrection = (id: string) => {
    if (!editingText.trim() || !id) return;
    updateMessageCorrection(id, editingText);
    setEditingMessageId(null);
  };

  const handleSwapLanguages = () => {
    const currentBase = sourceLang.split("-")[0];
    const currentTargetName = targetLang;

    const newTargetName = LANGUAGE_MAPPING[currentBase] || "English";
    const newSourceLang = DEFAULT_STT_MAP[currentTargetName] || "en-US";

    setSourceLang(newSourceLang);
    setTargetLang(newTargetName);
    toast(newTargetName === "English" ? "ES → EN activo" : "EN → ES activo");
  };

  const handleStart = () => {
    setTimerSec(0);
    startEngine();
  };

  const handleStop = () => {
    stopEngine();
    clearMessages();
    setTimerSec(0);
    setUserNameResetSignal((s) => s + 1);
    toast("Session ended");
  };

  const handlePauseToggle = () => {
    if (status === "running") pauseEngine();
    else if (status === "paused") resumeEngine();
  };

  const toast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToastMsg(""), 2400);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const formatTimer = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const getStatusDotClass = () => {
    if (status === "running") return "sdot recording";
    if (status === "paused") return "sdot paused";
    if (status === "starting") return "sdot translating";
    return "sdot ready";
  };

  const getStatusText = () => {
    if (status === "running") return "Listening";
    if (status === "paused") return "Paused";
    if (status === "starting") return "Connecting";
    return "Ready";
  };

  const isRecording = status === "running" || status === "paused" || status === "starting";

  return (
    <div className="app font-[Inter,system-ui,sans-serif]">
      {/* Hidden username bar for logic retention */}
      <div style={{ display: 'none' }}>
         <EditableUserName resetSignal={userNameResetSignal} />
      </div>

      {/* Auto-update banners */}
      {updateAvailable && !updateReady && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-[1000] animate-bounce">
          Downloading update... {downloadProgress}%
        </div>
      )}
      {updateReady && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg text-sm flex items-center gap-3 shadow-lg z-[1000] border border-white/20">
          <div className="flex flex-col">
             <span className="font-bold">Update ready</span>
             <span className="opacity-80 text-[11px]">Restart to apply changes</span>
          </div>
          <button
            onClick={() => window.electronAPI.installUpdate()}
            className="bg-white text-green-700 px-3 py-1.5 rounded-md font-bold text-xs hover:bg-zinc-100 transition-colors"
          >
            Restart Now
          </button>
        </div>
      )}

      {/* HEADER */}
      <header>
        <div className="hdr-left" style={{ WebkitAppRegion: "drag" } as any}>
          <img src={logoHorizontal} alt="Silvio" className="h-6 object-contain ml-2" />

          <div className={`hdr-rec ${isRecording ? "on" : ""}`} style={{ WebkitAppRegion: "no-drag" } as any}>
            <div className={`hdr-wave ${status === "running" ? "on" : ""}`}>
              <div className="wbar"></div><div className="wbar"></div><div className="wbar"></div>
              <div className="wbar"></div><div className="wbar"></div>
            </div>
            <button className="rbtn stop" onClick={handleStop}>
              <svg viewBox="0 0 13 13" fill="none"><rect x="2" y="2" width="9" height="9" rx="1.5" fill="currentColor"/></svg>
              Stop
            </button>
            <button className="rbtn" onClick={handlePauseToggle}>
              {status === "paused" ? (
                <>
                  <svg viewBox="0 0 13 13" fill="none">
                    <polygon points="2.5,2 10.5,6.5 2.5,11" fill="currentColor"/>
                  </svg>
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 13 13" fill="none">
                    <rect x="2" y="2" width="3.5" height="9" rx="1.2" fill="currentColor"/>
                    <rect x="7.5" y="2" width="3.5" height="9" rx="1.2" fill="currentColor"/>
                  </svg>
                  <span>Pause</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="hdr-mid"></div>

        <div className="hdr-right" style={{ WebkitAppRegion: "no-drag" } as any}>
          {/* Language pair + swap */}
          <div className="lang-tog">
            <span className={`lcode ${isEnSource ? "en" : "es"}`}>{isEnSource ? "EN" : "ES"}</span>
            <button className="swap-btn" onClick={handleSwapLanguages} title="Swap languages">
              <svg viewBox="0 0 13 13" fill="none">
                <path d="M1 4h9M7 1.5l2.5 2.5L7 6.5M12 9H3M6 6.5l-2.5 2.5L6 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className={`lcode ${!isEnSource ? "en" : "es"}`}>{!isEnSource ? "EN" : "ES"}</span>
          </div>

          {/* Status */}
          <div className="status-chip">
            <div className={getStatusDotClass()}></div>
            <span>{getStatusText()}</span>
          </div>

          <div className="hdiv"></div>

          {/* Glossary */}
          <button className="hibtn" onClick={() => setIsGlossaryOpen(true)} title="Glosario">
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M3 2h8a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M5 5.5h6M5 8h6M5 10.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M12 4l2-1v11l-2-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Aeronautical alphabet */}
          <button className="hibtn" onClick={() => setIsPhoneticOpen(true)} title="Alfabeto Aeronáutico">
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M3 12.5L6.5 3.5l3.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.2 9.5h4.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M11 5.5c0 0 .8-1 1.5-1s1.5.55 1.5 1.4c0 1.8-3 2.9-3 2.9h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <button className="hibtn" onClick={signOut} title="Sign Out" style={{ color: "#ef4444" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </header>

      {/* CENTER STAGE */}
      <div className={`cstage ${isRecording ? "gone" : ""}`}>
        <button className="start-btn" onClick={handleStart}>
          <svg viewBox="0 0 24 24" fill="none"><polygon points="6,4 20,12 6,20" fill="white"/></svg>
          Start
        </button>
        <p className="idle-hint">Press Start to begin real-time interpretation</p>
      </div>

      {/* TRANSCRIPT */}
      <div className={`transcript ${isRecording ? "on" : ""}`}>
        <div className="txhdr">
          <div className="txlabel">Live Transcript</div>
          <div className="txtools">
            <div className="timer-badge">{formatTimer(timerSec)}</div>
          </div>
        </div>

        <div className="messages" id="msgs" ref={scrollContainerRef} onScroll={handleScroll}>
          {messages.length === 0 && !interimText && (
            <div className="empty">
              <svg viewBox="0 0 32 32" fill="none"><path d="M6 8a2 2 0 012-2h16a2 2 0 012 2v14a2 2 0 01-2 2H9l-5 4V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M11 12h10M11 16h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <p>Press <strong>Start</strong> to begin real-time interpretation.</p>
            </div>
          )}

          {messages.map((msg, index) => {
            const isSpanishSource = msg.source_lang ? msg.source_lang === "es" : !isEnSource;
            const sideCls = isSpanishSource ? "side-left" : "side-right";
            const langTheme = isSpanishSource ? "es-theme" : "en-theme";
            
            const timeLabel = new Date(msg.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            return (
              <div key={msg.id || index} className={`msg-row ${sideCls}`}>
                <div className={`msg-card ${langTheme}`}>
                  {/* Original Text (Small, Secondary) */}
                  <div className="msg-original">
                    {editingMessageId === msg.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, msg.id!)}
                        onBlur={() => saveCorrection(msg.id!)}
                        className="msg-edit-input"
                      />
                    ) : (
                      <div 
                        className="msg-text-orig" 
                        onDoubleClick={() => handleDoubleClick(msg.id!, msg.original || "")}
                        title="Double click to edit"
                      >
                        {msg.original}
                        {msg.is_corrected && <span className="msg-edited-tag">✏️</span>}
                      </div>
                    )}
                  </div>

                  {/* Translation (Large, Primary) */}
                  <div className="msg-translation">
                    <div className="msg-text-trans">
                      {msg.translated ? msg.translated : "..."}
                    </div>
                    <div className="msg-footer">
                      <span className="msg-time">{timeLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {interimText && (() => {
            const isSpanishSource = !isEnSource;
            const sideCls = isSpanishSource ? "side-left" : "side-right";
            const langTheme = isSpanishSource ? "es-theme" : "en-theme";

            return (
              <div className={`msg-row ${sideCls} interim`}>
                <div className={`msg-card ${langTheme}`}>
                   <div className="msg-original">
                     <div className="msg-text-orig italic opacity-60">{interimText}</div>
                   </div>
                   <div className="msg-translation">
                     <div className="msg-loading-dots">
                       <span></span><span></span><span></span>
                     </div>
                   </div>
                </div>
              </div>
            );
          })()}
          
          {errorLog && (
            <div className="error-banner">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {errorLog}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="fmeta"></div>
        <div className="fver text-muted">v{packageJson.version}</div>
      </footer>

      {/* MODALS */}
      {isGlossaryOpen && (
        <GlossaryManager
          glossary={glossary}
          setGlossary={setGlossary}
          onClose={() => setIsGlossaryOpen(false)}
        />
      )}
      {isPhoneticOpen && (
        <PhoneticAlphabetPanel onClose={() => setIsPhoneticOpen(false)} />
      )}

      {/* TOAST */}
      <div className={`toast ${toastMsg ? "on" : ""}`}>{toastMsg}</div>
    </div>
  );
}

export default App;
