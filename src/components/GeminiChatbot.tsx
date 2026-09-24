import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  Send, 
  User, 
  Loader2, 
  Trash2, 
  Sparkles, 
  Zap, 
  BrainCircuit, 
  ShieldAlert, 
  Minimize2, 
  Maximize2,
  ChevronDown
} from "lucide-react";
import axios from "axios";

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  modelUsed?: string;
}

interface Props {
  currentTrackedNumber?: {
    number: string;
    provider: string;
    isValid: boolean;
    country: string;
    analysis?: any;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export const GeminiChatbot: React.FC<Props> = ({ currentTrackedNumber, isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      content:
        "Halo! Saya **Faiz V5 Cyber Copilot**, asisten intelijen telekomunikasi & OSINT. Saya dapat membantu menganalisis modus penipuan, identifikasi pola prefix, pelaporan ke otoritas (Kominfo/BRTI), atau audit keamanan digital. Ada nomor atau kasus yang ingin dianalisis?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"gemini-3.8-flash" | "gemini-3.1-flash-lite" | "gemini-3.1-pro-preview">(
    "gemini-3.8-flash"
  );
  const [isMinimized, setIsMinimized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputValue).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue("");
    setLoading(true);

    try {
      // Build conversation history for multi-turn chat
      const chatHistory = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await axios.post("/api/chat", {
        messages: chatHistory,
        model: selectedModel,
        systemInstruction:
          "You are Faiz V5 Cyber Intelligence & OSINT Assistant, an elite Indonesian telecommunications analyst and cybersecurity investigator. " +
          "Provide tactical, structured, and legally compliant advice on phone tracking, scam awareness (SMS blast, OTP phishing, APK fraud, pinjol ilegal), " +
          "and telecom prefix analytics. Maintain an authoritative yet accessible tone with clear bullet points.",
      });

      const modelReply = res.data.reply || "Maaf, respon tidak dapat diproses saat ini.";

      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: "model",
          content: modelReply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          modelUsed: selectedModel,
        },
      ]);
    } catch (err: any) {
      console.error("Chat error:", err);
      const rawError = err.response?.data?.error || err.message || "";
      let friendlyError = rawError;
      if (rawError.includes("API_KEY_INVALID") || rawError.includes("API key not valid")) {
        friendlyError = "Kunci API Gemini belum disetel atau tidak valid. Silakan periksa kunci API Anda di Settings > Secrets panel.";
      } else if (rawError.includes("RESOURCE_EXHAUSTED") || rawError.includes("429")) {
        friendlyError = "Batas kuota model telah tercapai. Silakan coba sesaat lagi atau beralih ke model gemini-3.1-flash-lite.";
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "model",
          content: `⚠️ ${friendlyError}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "model",
        content: "Riwayat percakapan telah dibersihkan. Silakan tanyakan hal baru seputar OSINT atau telekomunikasi.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 shadow-2xl ${
        isMinimized
          ? "bottom-6 right-6 w-72 rounded-2xl bg-[#141414] border border-green-500/30 overflow-hidden"
          : "bottom-4 right-4 sm:bottom-6 sm:right-6 w-[94vw] sm:w-[480px] h-[640px] max-h-[85vh] rounded-3xl bg-[#0f0f0f] border border-white/10 flex flex-col overflow-hidden cyber-border"
      }`}
    >
      {/* Chatbot Header */}
      <div className="bg-[#181818] border-b border-white/10 px-5 py-3.5 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/30">
              <Bot className="w-4 h-4" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-[#181818]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              Faiz Cyber Copilot
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-green-500/10 text-green-400 border border-green-500/20 font-mono">
                AI
              </span>
            </h3>
            <p className="text-[10px] text-gray-400 font-mono">Multi-turn OSINT Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title={isMinimized ? "Perbesar" : "Kecilkan"}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title="Tutup chat"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Model Switcher Bar */}
          <div className="px-4 py-2 bg-[#121212] border-b border-white/5 flex items-center justify-between text-[11px] font-mono">
            <span className="text-gray-500 uppercase text-[9px] tracking-wider">Engine:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedModel("gemini-3.1-flash-lite")}
                className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  selectedModel === "gemini-3.1-flash-lite"
                    ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold"
                    : "text-gray-400 hover:text-white bg-white/5"
                }`}
                title="Ultra Fast Triage (gemini-3.1-flash-lite)"
              >
                <Zap className="w-3 h-3 text-yellow-400" /> Lite
              </button>
              <button
                type="button"
                onClick={() => setSelectedModel("gemini-3.8-flash")}
                className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  selectedModel === "gemini-3.8-flash"
                    ? "bg-green-500/20 text-green-300 border border-green-500/40 font-bold"
                    : "text-gray-400 hover:text-white bg-white/5"
                }`}
                title="General Tasks (gemini-3.8-flash)"
              >
                <Sparkles className="w-3 h-3 text-green-400" /> Flash 3.8
              </button>
              <button
                type="button"
                onClick={() => setSelectedModel("gemini-3.1-pro-preview")}
                className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  selectedModel === "gemini-3.1-pro-preview"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold"
                    : "text-gray-400 hover:text-white bg-white/5"
                }`}
                title="Deep Forensic Analysis (gemini-3.1-pro-preview)"
              >
                <BrainCircuit className="w-3 h-3 text-purple-400" /> Pro
              </button>
            </div>
          </div>

          {/* Current Target Injected Context Badge */}
          {currentTrackedNumber && (
            <div className="px-4 py-2 bg-green-500/5 border-b border-green-500/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate text-[11px] text-gray-300">
                <ShieldAlert className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <span className="truncate">
                  Target Aktif: <strong className="text-white font-mono">{currentTrackedNumber.number}</strong> (
                  {currentTrackedNumber.provider})
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleSendMessage(
                    `Lakukan analisis ancaman menyeluruh terhadap target aktif: Nomor ${currentTrackedNumber.number}, Provider ${currentTrackedNumber.provider}. Apakah ada pola mencurigakan atau indikasi nomor virtual/VoIP?`
                  )
                }
                className="text-[10px] font-mono text-green-400 hover:underline shrink-0 pl-2 font-bold cursor-pointer"
              >
                + Analisis Target Ini
              </button>
            </div>
          )}

          {/* Scrollable Message Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "model" && (
                  <div className="w-7 h-7 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center shrink-0 border border-green-500/30 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl p-3.5 leading-relaxed space-y-1 ${
                    msg.role === "user"
                      ? "bg-green-500 text-black font-medium rounded-tr-none shadow-md"
                      : "bg-[#161616] text-gray-200 border border-white/5 rounded-tl-none font-normal"
                  }`}
                >
                  <div className="whitespace-pre-wrap select-text">{msg.content}</div>
                  <div
                    className={`text-[9px] font-mono flex items-center justify-end gap-1.5 pt-1 ${
                      msg.role === "user" ? "text-black/60" : "text-gray-500"
                    }`}
                  >
                    {msg.modelUsed && <span>[{msg.modelUsed}]</span>}
                    <span>{msg.timestamp}</span>
                  </div>
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/10 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-7 h-7 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center shrink-0 border border-green-500/30">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="bg-[#161616] text-gray-400 border border-white/5 rounded-2xl rounded-tl-none p-3 text-xs font-mono flex items-center gap-2">
                  <span>Faiz Copilot sedang menganalisis</span>
                  <span className="flex space-x-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 border-t border-white/5 bg-[#121212] overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-2">
            <button
              onClick={() => handleSendMessage("Cek ciri-ciri modus penipuan kurir paket file APK")}
              className="text-[10px] font-mono bg-white/5 hover:bg-white/10 text-gray-300 px-2.5 py-1 rounded-full border border-white/5 shrink-0 transition-colors"
            >
              📦 Modus APK Kurir
            </button>
            <button
              onClick={() => handleSendMessage("Bagaimana cara lapor nomor penipuan ke BRTI / Aduankonten Kominfo?")}
              className="text-[10px] font-mono bg-white/5 hover:bg-white/10 text-gray-300 px-2.5 py-1 rounded-full border border-white/5 shrink-0 transition-colors"
            >
              🏛️ Lapor ke Kominfo/BRTI
            </button>
            <button
              onClick={() => handleSendMessage("Cara blokir SMS spam & panggilan promosi operator?")}
              className="text-[10px] font-mono bg-white/5 hover:bg-white/10 text-gray-300 px-2.5 py-1 rounded-full border border-white/5 shrink-0 transition-colors"
            >
              🛡️ Blokir Spam Operator
            </button>
            <button
              onClick={clearChat}
              className="text-[10px] font-mono text-red-400 hover:text-red-300 px-2 py-1 rounded-full hover:bg-red-500/10 shrink-0 ml-auto transition-colors flex items-center gap-1"
              title="Bersihkan chat"
            >
              <Trash2 className="w-3 h-3" /> Bersihkan
            </button>
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#161616] border-t border-white/10 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Tanyakan analisis nomor, modus scam, UU ITE..."
              disabled={loading}
              className="flex-1 bg-[#0c0c0c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-all font-sans"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="p-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-30 text-black font-bold rounded-xl transition-all shrink-0 cursor-pointer shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </div>
  );
};
