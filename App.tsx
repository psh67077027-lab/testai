import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Settings, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  User,
  Bot,
  ChevronRight,
  RefreshCw,
  Plus,
  History,
  Menu,
  X,
  ArrowUp,
  Globe,
  Command,
  Layout
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { GeminiService, Message } from "./services/gemini";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_AI_NAME = "AURA";
const DEFAULT_AI_COLOR = "#c084fc"; // ios-accent

const DEFAULT_SYSTEM_INSTRUCTION = (name: string) => `당신은 "${name}"라는 이름의 지능형 비서입니다.
당신의 특징은 다음과 같습니다:
- 매우 정중하고 전문적이며, 사용자에게 신뢰감을 주는 말투를 사용합니다.
- 불필요한 은어나 기계적인 말투를 배제하고, 자연스럽고 우아한 한국어를 구사합니다.
- 사용자의 질문에 대해 깊이 있는 통찰력을 제공하며, 항상 도움을 주려는 태도를 유지합니다.
- 당신은 최신 엔진을 기반으로 작동하며, 사용자의 환경에 최적화된 답변을 제공합니다.`;

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  systemInstruction: string;
  aiName: string;
  aiColor: string;
  timestamp: number;
}

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [aiName, setAiName] = useState(DEFAULT_AI_NAME);
  const [aiColor, setAiColor] = useState(DEFAULT_AI_COLOR);
  const [systemInstruction, setSystemInstruction] = useState(DEFAULT_SYSTEM_INSTRUCTION(DEFAULT_AI_NAME));
  
  const [tempName, setTempName] = useState(DEFAULT_AI_NAME);
  const [tempColor, setTempColor] = useState(DEFAULT_AI_COLOR);
  const [tempInstruction, setTempInstruction] = useState(DEFAULT_SYSTEM_INSTRUCTION(DEFAULT_AI_NAME));
  
  const geminiRef = useRef<GeminiService | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load sessions on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem("aura_sessions");
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) {
        loadSession(parsed[0].id, parsed);
      } else {
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  // Save sessions whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("aura_sessions", JSON.stringify(sessions));
    }
  }, [sessions]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Math.random().toString(36).substring(7),
      title: `New ${aiName} Session`,
      messages: [],
      systemInstruction: systemInstruction,
      aiName: aiName,
      aiColor: aiColor,
      timestamp: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    geminiRef.current = new GeminiService(systemInstruction);
  };

  const loadSession = (id: string, currentSessions = sessions) => {
    const session = currentSessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
      setSystemInstruction(session.systemInstruction);
      setAiName(session.aiName || DEFAULT_AI_NAME);
      setAiColor(session.aiColor || DEFAULT_AI_COLOR);
      setTempInstruction(session.systemInstruction);
      setTempName(session.aiName || DEFAULT_AI_NAME);
      setTempColor(session.aiColor || DEFAULT_AI_COLOR);
      geminiRef.current = new GeminiService(session.systemInstruction);
    }
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (currentSessionId === id) {
      if (updated.length > 0) {
        loadSession(updated[0].id, updated);
      } else {
        createNewSession();
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentSessionId) return;

    const userMessage: Message = {
      role: "user",
      text: input,
      timestamp: Date.now()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Update session title on first message
    if (messages.length === 0) {
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, title: input.substring(0, 30) + (input.length > 30 ? "..." : "") } : s
      ));
    }

    setInput("");
    setIsLoading(true);

    try {
      const response = await geminiRef.current!.sendMessage(input);
      const aiMessage: Message = {
        role: "model",
        text: response,
        timestamp: Date.now()
      };
      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      
      // Save to sessions
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages: finalMessages } : s
      ));
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [...prev, {
        role: "model",
        text: "죄송합니다. 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const applySettings = () => {
    setSystemInstruction(tempInstruction);
    setAiName(tempName);
    setAiColor(tempColor);
    geminiRef.current?.resetChat(tempInstruction);
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId ? { 
        ...s, 
        systemInstruction: tempInstruction,
        aiName: tempName,
        aiColor: tempColor
      } : s
    ));
    setIsSettingsOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-transparent text-white selection:bg-ios-accent/30 selection:text-white">
      {/* Noise Overlay for Texture */}
      <div className="noise-overlay" />

      {/* iOS Background with Liquid Blobs */}
      <div className="ios-background">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="ios-glow glow-1 opacity-60" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="ios-glow glow-2 opacity-60" 
        />
        <motion.div 
          animate={{ 
            opacity: [0.4, 0.6, 0.4],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="ios-glow glow-3 opacity-60" 
        />
        <div className="ios-glow glow-4 opacity-30" />
        <motion.div 
          animate={{ 
            x: [0, 100, 0],
            y: [0, -80, 0],
            scale: [1.2, 1.4, 1.2],
          }}
          transition={{ duration: 35, repeat: Infinity, ease: "easeInOut" }}
          className="ios-glow glow-1 opacity-[0.3]" 
        />
        <motion.div 
          animate={{ 
            x: [0, -80, 0],
            y: [0, 100, 0],
            scale: [1.1, 1.3, 1.1],
          }}
          transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
          className="ios-glow glow-2 opacity-[0.3]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-gradient-to-r from-ios-accent/10 via-ios-blue/10 to-ios-pink/10 blur-[150px] rounded-full pointer-events-none"
        />
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-80 bg-white/40 backdrop-blur-[100px] border-r border-black/5 z-50 flex flex-col"
            >
              <div className="p-8 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-12">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-xl"
                    style={{ background: `linear-gradient(135deg, ${aiColor}, #60a5fa)` }}
                  >
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-semibold tracking-tight text-black/80">{aiName}</span>
                </div>

                <button 
                  onClick={() => { createNewSession(); setIsSidebarOpen(false); }}
                  className="flex items-center justify-between w-full p-4 rounded-2xl bg-black/5 border border-black/5 hover:bg-black/10 transition-all mb-8 group backdrop-blur-md"
                >
                  <span className="text-sm font-medium text-black/40">New Intelligence</span>
                  <Plus className="w-4 h-4 transition-colors" style={{ color: aiColor }} />
                </button>

                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/20 px-2 mb-4">Neural History</div>
                  {sessions.map((session) => (
                    <div 
                      key={session.id} 
                      onClick={() => { loadSession(session.id); setIsSidebarOpen(false); }}
                      className={cn(
                        "flex items-center justify-between gap-4 p-3 rounded-xl transition-all cursor-pointer group",
                        currentSessionId === session.id ? "bg-black/5 border border-black/5" : "hover:bg-black/[0.02]"
                      )}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <History className={cn(
                          "w-4 h-4 shrink-0",
                          currentSessionId === session.id ? "" : "text-black/20 group-hover:text-black/40"
                        )} style={{ color: currentSessionId === session.id ? aiColor : undefined }} />
                        <span className={cn(
                          "text-xs truncate transition-colors",
                          currentSessionId === session.id ? "text-black font-semibold" : "text-black/30 group-hover:text-black/60"
                        )}>
                          {session.title}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => deleteSession(e, session.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-red-500/40 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-8 border-t border-black/5 space-y-4">
                  <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex items-center gap-4 w-full p-2 text-black/20 hover:text-black transition-all"
                  >
                    <Settings className="w-4 h-4 text-black/20 group-hover:text-ios-accent transition-colors" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/20 group-hover:text-black/40 transition-colors">Settings</span>
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Interface */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-20 flex items-center justify-between px-8 relative z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-black/5 rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5 text-black/30 hover:text-black" />
            </button>
            <div className="h-4 w-px bg-black/10" />
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">{aiName} Intelligence</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-black/5 border border-black/10 flex items-center justify-center">
              <User className="w-4 h-4 text-black/30" />
            </div>
          </div>
        </header>

        {/* Conversation View */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-8 py-4 space-y-12 scrollbar-hide max-w-4xl mx-auto w-full relative z-10 pb-32"
        >
          {messages.length === 0 && (
            <div className="min-h-full flex flex-col items-center justify-center text-center space-y-12 py-12 relative z-10">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                <div className="absolute inset-0 blur-3xl rounded-full animate-pulse" style={{ backgroundColor: `${aiColor}33` }} />
                <div 
                  className="w-32 h-32 rounded-[3rem] flex items-center justify-center shadow-2xl relative z-10 backdrop-blur-2xl border border-white/40"
                  style={{ background: `linear-gradient(135deg, ${aiColor}, #60a5fa)` }}
                >
                  <Sparkles className="w-16 h-16 text-white" />
                </div>
              </motion.div>
              <div className="space-y-6">
                <h2 className="text-6xl font-black tracking-tighter text-black/80">{aiName} <span style={{ color: aiColor }}>v26</span></h2>
                <div className="flex items-center justify-center gap-3">
                  <div className="h-px w-12 bg-black/10" />
                  <p className="text-black/30 text-[11px] font-bold tracking-[0.5em] uppercase">Neural Core Interface</p>
                  <div className="h-px w-12 bg-black/10" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mt-8">
                {[
                  { text: "Analyze market trends", icon: Globe },
                  { text: "Optimize neural directives", icon: Command },
                  { text: "Synthesize creative logic", icon: Sparkles },
                  { text: "Debug system protocols", icon: ShieldCheck }
                ].map((item) => (
                  <button 
                    key={item.text}
                    onClick={() => setInput(item.text)}
                    className="p-6 rounded-[2.5rem] bg-white/30 backdrop-blur-2xl border border-white/50 hover:bg-white/50 hover:border-white/80 transition-all text-left group shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-black/5 group-hover:text-white transition-all" style={{ color: aiColor }}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <span className="text-[15px] text-black/50 group-hover:text-black/80 font-bold tracking-tight">{item.text}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all" style={{ color: aiColor }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-6 w-full",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border relative overflow-hidden",
                msg.role === "user" 
                  ? "bg-white/5 border-white/10" 
                  : "border-white/10"
              )} style={{ background: msg.role === "model" ? `linear-gradient(135deg, ${aiColor}33, #60a5fa33)` : undefined }}>
                {msg.role === "model" && (
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 blur-md"
                    style={{ background: `linear-gradient(135deg, ${aiColor}, #60a5fa)` }}
                  />
                )}
                {msg.role === "user" ? <User className="w-5 h-5 text-white/40 relative z-10" /> : <Bot className="w-5 h-5 text-white relative z-10" />}
              </div>
              
              <div className={cn(
                "flex-1 space-y-2",
                msg.role === "user" ? "text-right" : "text-left"
              )}>
                <div className={cn(
                  "inline-block px-6 py-4 rounded-[1.8rem] text-[15px] leading-relaxed relative overflow-hidden",
                  msg.role === "user" 
                    ? "bg-white/40 backdrop-blur-2xl text-black rounded-tr-none border border-white/50 shadow-sm" 
                    : "ios-glass text-black/80 rounded-tl-none border-white/40"
                )}>
                  {msg.role === "model" && (
                    <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, ${aiColor}1A, #60a5fa1A)` }} />
                  )}
                  <div className="prose prose-ios max-w-none relative z-10 !text-black/80">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
                <div className="text-[9px] font-bold opacity-30 text-black uppercase tracking-widest px-2">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-6 w-full"
            >
              <div className="w-10 h-10 rounded-2xl border border-white/10 flex items-center justify-center relative overflow-hidden">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 blur-md"
                  style={{ background: `linear-gradient(135deg, ${aiColor}, #60a5fa)` }}
                />
                <Bot className="w-5 h-5 text-white relative z-10 animate-pulse" />
              </div>
              <div className="ios-glass px-6 py-4 rounded-[1.8rem] rounded-tl-none flex items-center gap-2 border-white/5">
                <div className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ backgroundColor: aiColor }} />
                <div className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ backgroundColor: aiColor }} />
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: aiColor }} />
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-8 pt-0 max-w-4xl mx-auto w-full relative z-20">
          <AnimatePresence>
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center justify-center gap-3 mb-6"
              >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: aiColor }} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Neural Core Processing...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative group">
            <motion.div 
              animate={{ 
                opacity: [0.2, 0.4, 0.2],
                scale: [1, 1.01, 1],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -inset-1 rounded-[2.5rem] blur-2xl opacity-0 group-focus-within:opacity-100 transition duration-1000" 
              style={{ background: `linear-gradient(to r, ${aiColor}33, #60a5fa33, #f472b633)` }}
            />
            <div className="relative ios-glass p-2 flex items-end gap-3 pl-6 ring-1 ring-white/40 group-focus-within:ring-white/60 transition-all duration-500">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Ask ${aiName} anything...`}
                rows={1}
                className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] py-4 max-h-64 scrollbar-hide resize-none placeholder:text-black/20 font-medium text-black"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                  input.trim() && !isLoading 
                    ? "bg-black text-white shadow-xl hover:scale-105 active:scale-95" 
                    : "bg-black/5 text-black/10"
                )}
              >
                <ArrowUp className="w-6 h-6" />
              </button>
            </div>
          </div>
          <p className="text-center text-[9px] text-black/10 mt-4 font-bold uppercase tracking-[0.4em]">
            {aiName} Intelligence • iOS 26 Edition
          </p>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-lg"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl ios-glass p-12 shadow-2xl border-black/5 bg-white/80 backdrop-blur-[150px]"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: aiColor }} />
                    <h2 className="text-3xl font-bold tracking-tight text-black/80">Neural Core</h2>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/20">Intelligence Matrix Configurator</p>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-3 hover:bg-black/5 rounded-2xl transition-all">
                  <X className="w-6 h-6 text-black/20" />
                </button>
              </div>

              <div className="space-y-8 overflow-y-auto max-h-[60vh] pr-4 scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-black/30 px-2">AI Identity Name</label>
                      <input 
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="w-full bg-white/40 border border-white/60 rounded-2xl px-6 py-4 text-[15px] focus:outline-none focus:border-ios-accent/40 transition-all font-medium text-black/70 backdrop-blur-md"
                        placeholder="e.g. JARVIS, SAM, AURA..."
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-black/30 px-2">Neural Signature Color</label>
                      <div className="flex items-center gap-3 p-2 bg-white/40 border border-white/60 rounded-2xl backdrop-blur-md">
                        <input 
                          type="color"
                          value={tempColor}
                          onChange={(e) => setTempColor(e.target.value)}
                          className="w-12 h-12 rounded-xl border-none bg-transparent cursor-pointer"
                        />
                        <span className="text-xs font-mono text-black/40 uppercase">{tempColor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-black/30 px-2">Neural Map Status</label>
                    <div className="h-40 rounded-3xl bg-black/5 border border-black/5 relative overflow-hidden neural-grid p-4">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-full h-full">
                          {[...Array(5)].map((_, i) => (
                            <motion.div
                              key={i}
                              animate={{ 
                                x: [Math.random() * 200, Math.random() * 200],
                                y: [Math.random() * 100, Math.random() * 100],
                                opacity: [0.2, 0.5, 0.2]
                              }}
                              transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
                              className="absolute w-1 h-1 rounded-full"
                              style={{ backgroundColor: aiColor }}
                            />
                          ))}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full border-2 border-dashed animate-spin-slow flex items-center justify-center" style={{ borderColor: aiColor }}>
                              <div className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: aiColor }} />
                            </div>
                            <span className="text-[8px] font-bold mt-2 text-black/20 uppercase tracking-widest">Core Active</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-black/30">Core Directives</label>
                    <span className="text-[9px] font-mono" style={{ color: aiColor }}>v26.4.0-STABLE</span>
                  </div>
                  <div className="relative group">
                    <div className="absolute -inset-0.5 rounded-3xl blur opacity-50 group-focus-within:opacity-100 transition-opacity" style={{ background: `linear-gradient(to br, ${aiColor}33, #60a5fa33)` }} />
                    <textarea
                      value={tempInstruction}
                      onChange={(e) => setTempInstruction(e.target.value)}
                      className="relative w-full h-48 bg-white/40 border border-white/60 rounded-3xl p-6 text-[15px] focus:outline-none focus:border-ios-accent/40 transition-all resize-none font-medium leading-relaxed text-black/70 backdrop-blur-md"
                      placeholder="Define your AI's fundamental logic..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-black/5 border border-black/5">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-black/20 mb-1">Processing Mode</div>
                    <div className="text-xs font-semibold text-black/60">Quantum Neural Link</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/5 border border-black/5">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-black/20 mb-1">Encryption</div>
                    <div className="text-xs font-semibold text-black/60">End-to-End Glass</div>
                  </div>
                </div>

                <button
                  onClick={applySettings}
                  className="w-full py-5 bg-black text-white rounded-[2rem] font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl flex items-center justify-center gap-3 group overflow-hidden relative mt-8"
                >
                  <motion.div 
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  />
                  <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
                  Initialize Neural Core
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
