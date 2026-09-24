import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  MapPin, 
  Shield, 
  Activity, 
  ExternalLink, 
  History, 
  AlertTriangle, 
  CheckCircle,
  Hash,
  Terminal,
  Cpu,
  Globe,
  Loader2,
  FileSpreadsheet,
  Save,
  CheckCircle2,
  Bot,
  Sparkles,
  Navigation,
  Compass,
  Map as MapIcon,
  Radio,
  FileDown,
  FileText,
  Check
} from "lucide-react";
import axios from "axios";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { User } from "firebase/auth";
import { initAuth, googleSignIn, logout as googleLogout } from "./services/googleAuth";
import { GoogleSheetsModal } from "./components/GoogleSheetsModal";
import { GoogleSignInButton } from "./components/GoogleSignInButton";
import { GeminiChatbot } from "./components/GeminiChatbot";
import { SearchGroundingCard } from "./components/SearchGroundingCard";
import { MapsGroundingCard } from "./components/MapsGroundingCard";
import { GoogleMapsTracker } from "./components/GoogleMapsTracker";
import { generateTrackingReportPDF } from "./utils/pdfReportGenerator";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ServiceCenter {
  name: string;
  type: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
}

interface HlrLocation {
  region: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  accuracyRadiusMeters: number;
  lac: string;
  cellId: string;
  signalStrength: string;
  networkType: string;
  btsName: string;
  nearbyServiceCenters?: ServiceCenter[];
}

interface TrackingData {
  number: string;
  raw: string;
  isValid: boolean;
  provider: string;
  country: string;
  location?: HlrLocation;
  links: {
    google: string;
    facebook: string;
    truecaller: string;
    getcontact: string;
  };
  timestamp: string;
}

interface AIAnalysis {
  riskLevel: string;
  summary: string;
  redFlags: string[];
  recommendations: string[];
}

export default function App() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingData | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TrackingData[]>([]);

  // Google Auth & Sheets states
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Gemini Chatbot & Grounding states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "overview" | "search-grounding" | "maps-grounding">("map");

  // PDF Export states
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccessToast, setPdfSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      const res = await googleSignIn();
      setGoogleUser(res.user);
      setAccessToken(res.accessToken);
    } catch (err: any) {
      console.error("Google sign in error", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    await googleLogout();
    setGoogleUser(null);
    setAccessToken(null);
  };

  const executeTrack = async (targetNumber: string) => {
    if (!targetNumber) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setAnalysis(null);

    try {
      const response = await axios.post("/api/track", { number: targetNumber });
      const data = response.data.data;
      setResult(data);
      setHistory((prev) => [data, ...prev.filter((p) => p.raw !== data.raw).slice(0, 4)]);
      handleAnalyze(data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeTrack(phoneNumber);
  };

  const handleAnalyze = async (data: TrackingData) => {
    setAnalyzing(true);
    try {
      const response = await axios.post("/api/analyze", { data });
      setAnalysis(response.data);
    } catch (err) {
      console.error("AI Analysis failed", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadPdf = (targetData: TrackingData = result!) => {
    if (!targetData) return;
    setIsExportingPdf(true);
    try {
      generateTrackingReportPDF(targetData, analysis);
      setPdfSuccessToast(`Laporan PDF untuk nomor ${targetData.number} berhasil dibuat & diunduh!`);
      setTimeout(() => {
        setPdfSuccessToast(null);
      }, 4500);
    } catch (err) {
      console.error("Gagal mengunduh laporan PDF:", err);
      alert("Terjadi kesalahan saat membuat file PDF. Silakan coba lagi.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-green-500/30">
      <div className="scanline" />
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />

      <main className="container mx-auto px-4 py-8 relative z-10 max-w-5xl">
        {/* Toast Notification for PDF Generation */}
        <AnimatePresence>
          {pdfSuccessToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 bg-[#0d1520] border border-red-500/40 rounded-2xl shadow-2xl shadow-red-950/40 text-white max-w-md"
            >
              <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/40">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-red-300">Dokumen PDF Tersimpan</div>
                <div className="text-gray-300 text-[11px] leading-tight mt-0.5">{pdfSuccessToast}</div>
              </div>
              <button
                type="button"
                onClick={() => setPdfSuccessToast(null)}
                className="text-gray-400 hover:text-white ml-2 text-xs cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Operational Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] font-mono text-gray-400 uppercase tracking-widest">
              Telecom Node Active • Realtime GSM
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsChatOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-[#141414] hover:bg-[#1f1f1f] text-gray-200 border border-white/10 hover:border-green-500/40 rounded-xl text-xs font-medium transition-all shadow-sm group cursor-pointer"
            >
              <Bot className="w-4 h-4 text-green-400 group-hover:scale-110 transition-transform" />
              <span>AI Copilot</span>
              <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/30 font-mono">
                Gemini
              </span>
            </button>

            <a
              href="/api/download-zip"
              download="numberlocationtracking-faiz-v5.zip"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600/25 to-green-600/15 hover:from-emerald-600/35 hover:to-green-600/25 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all shadow-sm group cursor-pointer"
              title="Unduh seluruh source code proyek ini dalam format file .ZIP"
            >
              <FileDown className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Unduh .ZIP</span>
            </a>

            <button
              onClick={() => setIsSheetsModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-[#141414] hover:bg-[#1f1f1f] text-gray-200 border border-white/10 hover:border-green-500/40 rounded-xl text-xs font-medium transition-all shadow-sm group cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform" />
              <span>Google Sheets Database</span>
              {googleUser ? (
                <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/30">
                  <CheckCircle2 className="w-3 h-3 text-green-400" /> Terhubung
                </span>
              ) : (
                <span className="text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
                  Hubungkan
                </span>
              )}
            </button>
            {googleUser && (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/10 rounded-xl text-xs">
                {googleUser.photoURL ? (
                  <img src={googleUser.photoURL} alt="Avatar" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-[10px] font-bold">
                    {googleUser.displayName?.charAt(0) || "U"}
                  </div>
                )}
                <span className="text-gray-300 font-mono text-[11px] max-w-[120px] truncate">
                  {googleUser.displayName?.split(" ")[0] || "User"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Header */}
        <header className="flex flex-col items-center mb-12 text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-4"
          >
            <div className="bg-green-500/10 p-3 rounded-xl border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
              <Shield className="w-10 h-10 text-green-500" />
            </div>
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl md:text-5xl font-bold tracking-tighter text-white mb-2"
          >
            FAIZ <span className="text-green-500">V5</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 font-mono text-xs uppercase tracking-[0.2em]"
          >
            Advanced OSINT Tracking Interface
          </motion.p>
        </header>

        {/* Search Section */}
        <section className="mb-12">
          <form onSubmit={handleSearch} className="max-w-xl mx-auto">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-500 group-focus-within:text-green-500 transition-colors" />
              </div>
              <input 
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter Indonesian number (e.g. 0812...)"
                className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-all cyber-border"
              />
              <button 
                type="submit"
                disabled={loading}
                className="absolute right-2 top-2 bottom-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black font-bold px-6 rounded-xl transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "TRACK"}
              </button>
            </div>
            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm mt-3 text-center"
              >
                {error}
              </motion.p>
            )}
          </form>
        </section>

        {/* Results Dashboard */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Primary Data */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#111] border border-white/5 rounded-3xl p-8 cyber-border">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                      <h2 className="text-sm font-mono text-gray-500 uppercase tracking-widest mb-1">Target Identified</h2>
                      <div className="text-3xl font-mono font-bold text-white tracking-tight">{result.number}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 px-3.5 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-bold text-green-500 uppercase">Valid</span>
                      </div>
                      <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full">
                        <Globe className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-bold text-blue-400 uppercase">{result.country}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(result)}
                        disabled={isExportingPdf}
                        className="flex items-center gap-2 px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        title="Unduh Laporan Bukti Forensik PDF"
                      >
                        <FileDown className={`w-3.5 h-3.5 text-red-400 ${isExportingPdf ? "animate-bounce" : ""}`} />
                        <span>{isExportingPdf ? "Membuat PDF..." : "Unduh PDF"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="bg-white/5 p-2 rounded-lg"><Cpu className="w-5 h-5 text-gray-400" /></div>
                        <div>
                          <div className="text-xs font-mono text-gray-500 uppercase mb-1">Provider</div>
                          <div className="text-white font-medium">{result.provider}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="bg-white/5 p-2 rounded-lg"><Hash className="w-5 h-5 text-gray-400" /></div>
                        <div>
                          <div className="text-xs font-mono text-gray-500 uppercase mb-1">Raw Format</div>
                          <div className="text-white font-medium">{result.raw}</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="bg-white/5 p-2 rounded-lg"><MapPin className="w-5 h-5 text-gray-400" /></div>
                        <div>
                          <div className="text-xs font-mono text-gray-500 uppercase mb-1">Region Registry</div>
                          <div className="text-white font-medium">South-East Asia (Indo-Net)</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="bg-white/5 p-2 rounded-lg"><Terminal className="w-5 h-5 text-gray-400" /></div>
                        <div>
                          <div className="text-xs font-mono text-gray-500 uppercase mb-1">Timestamp</div>
                          <div className="text-white font-mono text-xs">{result.timestamp}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs text-gray-500 font-mono flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Sinkronisasi Cloud OSINT: Aktif</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleDownloadPdf(result)}
                        disabled={isExportingPdf}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600/90 to-rose-600/90 hover:from-red-500 hover:to-rose-500 text-white border border-red-500/40 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                        title="Ekspor Bukti Forensik ke Format Dokumen PDF"
                      >
                        <FileText className="w-4 h-4 text-red-100" />
                        <span>{isExportingPdf ? "Menyusun Dokumen..." : "Unduh Laporan PDF"}</span>
                      </button>
                      <button
                        onClick={() => setIsChatOpen(true)}
                        className="flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Bot className="w-4 h-4 text-green-400" />
                        Tanya Copilot
                      </button>
                      <button
                        onClick={() => setIsSheetsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-green-400" />
                        Simpan ke Sheets
                      </button>
                    </div>
                  </div>
                </div>

                {/* Intelligence Feature Tabs */}
                <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#141414] border border-white/10 rounded-2xl select-none">
                  <button
                    type="button"
                    onClick={() => setActiveTab("map")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "map"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <MapIcon className="w-4 h-4 text-amber-400" />
                    <span>Peta Alokasi HLR & BTS</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                      HLR OSINT
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "overview"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span>AI Threat Assessment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("search-grounding")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "search-grounding"
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Globe className="w-4 h-4 text-blue-400" />
                    <span>Google Search Grounding</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">
                      Live
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("maps-grounding")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "maps-grounding"
                        ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-red-400" />
                    <span>Google Maps Gerai</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-mono">
                      GPS
                    </span>
                  </button>
                </div>

                {/* Tab 0: Real-Time Interactive Google Maps Tracker */}
                {activeTab === "map" && (
                  <GoogleMapsTracker
                    number={result.number}
                    provider={result.provider}
                    country={result.country}
                    location={result.location}
                  />
                )}

                {/* Tab 1: AI Threat Assessment */}
                {activeTab === "overview" && (
                  <div className="bg-[#111] border border-white/5 rounded-3xl p-8 cyber-border">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-bold">AI Threat Intelligence</h3>
                      </div>
                      <button
                        onClick={() => setIsChatOpen(true)}
                        className="text-xs font-mono text-green-400 hover:underline flex items-center gap-1.5"
                      >
                        <Bot className="w-3.5 h-3.5" /> Buka Diskusi Chat
                      </button>
                    </div>

                    {analyzing ? (
                      <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                        <p className="text-xs font-mono text-purple-400 animate-pulse">ANALYZING SIGNAL METADATA...</p>
                      </div>
                    ) : analysis ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-400">Risk Assessment</div>
                          <div className={cn(
                            "px-3 py-1 rounded-md text-xs font-bold uppercase",
                            analysis.riskLevel === "Low" ? "bg-green-500/20 text-green-500" :
                            analysis.riskLevel === "Medium" ? "bg-yellow-500/20 text-yellow-500" :
                            "bg-red-500/20 text-red-500"
                          )}>
                            {analysis.riskLevel} Risk
                          </div>
                        </div>
                        <p className="text-gray-300 leading-relaxed italic border-l-2 border-purple-500/30 pl-4">
                          "{analysis.summary}"
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs font-mono text-red-400 uppercase mb-3 flex items-center gap-2">
                              <AlertTriangle className="w-3 h-3" /> Red Flags
                            </h4>
                            <ul className="space-y-2">
                              {analysis.redFlags.map((flag, i) => (
                                <li key={i} className="text-xs text-gray-400">• {flag}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-xs font-mono text-green-400 uppercase mb-3 flex items-center gap-2">
                              <Shield className="w-3 h-3" /> Recommended
                            </h4>
                            <ul className="space-y-2">
                              {analysis.recommendations.map((rec, i) => (
                                <li key={i} className="text-xs text-gray-400">• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-gray-500 text-sm">
                        AI analysis not available for this record.
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Google Search Grounding */}
                {activeTab === "search-grounding" && (
                  <SearchGroundingCard
                    currentNumber={result.number}
                    provider={result.provider}
                    country={result.country}
                  />
                )}

                {/* Tab 3: Google Maps Grounding */}
                {activeTab === "maps-grounding" && (
                  <MapsGroundingCard
                    provider={result.provider}
                    currentNumber={result.number}
                  />
                )}
              </div>

              {/* Sidebar / OSINT Links */}
              <div className="space-y-6">
                {/* Gemini Chatbot Assistant Card */}
                <div className="bg-[#111] border border-white/5 rounded-3xl p-6 cyber-border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-mono text-gray-400 uppercase flex items-center gap-2">
                      <Bot className="w-4 h-4 text-green-400" /> AI Cyber Copilot
                    </h3>
                    <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                      Multi-Turn
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                    Konsultasikan nomor, identifikasi modus phishing / APK, dan pelajari regulasi dengan asisten Gemini.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsChatOpen(true)}
                    className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/10 hover:border-green-500/30"
                  >
                    <Bot className="w-4 h-4 text-green-400" />
                    Buka Chatbot Copilot
                  </button>
                </div>
                {/* Google Sheets Sync Card */}
                <div className="bg-[#111] border border-white/5 rounded-3xl p-6 cyber-border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-mono text-gray-400 uppercase flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-green-500" /> Google Sheets
                    </h3>
                    {googleUser && (
                      <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                        Online
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                    Simpan rekaman target, ringkasan resiko, dan ekspor database ke Google Drive & Sheets secara realtime.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSheetsModalOpen(true)}
                    className="w-full py-2.5 px-4 bg-green-500 hover:bg-green-600 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Buka Database Sheets
                  </button>
                </div>

                <div className="bg-[#111] border border-white/5 rounded-3xl p-6 cyber-border">
                  <h3 className="text-sm font-mono text-gray-400 uppercase mb-6 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" /> Quick OSINT Links
                  </h3>
                  <div className="space-y-3">
                    <a 
                      href={result.links.getcontact} target="_blank" rel="noreferrer"
                      className="w-full flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group"
                    >
                      <span className="text-sm font-medium">Getcontact Search</span>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-400" />
                    </a>
                    <a 
                      href={result.links.truecaller} target="_blank" rel="noreferrer"
                      className="w-full flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group"
                    >
                      <span className="text-sm font-medium">Truecaller Lookup</span>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-400" />
                    </a>
                    <a 
                      href={result.links.google} target="_blank" rel="noreferrer"
                      className="w-full flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group"
                    >
                      <span className="text-sm font-medium">Google Dorks Search</span>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-400" />
                    </a>
                    <a 
                      href={result.links.facebook} target="_blank" rel="noreferrer"
                      className="w-full flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group"
                    >
                      <span className="text-sm font-medium">Facebook Search</span>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-400" />
                    </a>
                  </div>
                </div>

                {/* Search History */}
                {history.length > 0 && (
                  <div className="bg-[#111] border border-white/5 rounded-3xl p-6 cyber-border">
                  <h3 className="text-sm font-mono text-gray-400 uppercase mb-6 flex items-center gap-2">
                    <History className="w-4 h-4" /> Session Log
                  </h3>
                  <div className="space-y-4">
                    {history.map((h, i) => (
                      <div 
                        key={i} 
                        onClick={() => {
                          setResult(h);
                          handleAnalyze(h);
                        }}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-transparent hover:border-green-500/20 cursor-pointer transition-all group/item"
                      >
                        <div>
                          <div className="text-xs text-white font-mono">{h.number}</div>
                          <div className="text-[10px] text-gray-500 uppercase">{h.provider}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPdf(h);
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors opacity-75 group-hover/item:opacity-100 cursor-pointer"
                            title="Unduh Laporan PDF"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>
                          <div className="text-[10px] text-gray-600 font-mono">
                            {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State / Standby Mode */}
        {!result && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 space-y-8"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <Terminal className="w-12 h-12 text-green-500/40" />
              <p className="text-xs font-mono uppercase tracking-widest text-green-400">
                Sistem Faiz V5 Siap • Mode Siaga GSM & AI Intelijen
              </p>
              <p className="text-gray-400 text-xs max-w-md italic">
                Masukkan nomor ponsel di atas untuk pelacakan komprehensif, atau gunakan modul intelijen AI terintegrasi di bawah ini:
              </p>
            </div>

            {/* Standby Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                onClick={() => {
                  setPhoneNumber("081234567890");
                  executeTrack("081234567890");
                  setActiveTab("map");
                }}
                className="p-5 bg-[#111] hover:bg-[#161616] border border-green-500/20 hover:border-green-500/50 rounded-2xl transition-all cursor-pointer group space-y-2.5 shadow-lg shadow-green-950/20"
              >
                <div className="w-9 h-9 rounded-xl bg-green-500/15 text-green-400 flex items-center justify-center border border-green-500/30 group-hover:scale-105 transition-transform">
                  <MapIcon className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                    Peta HLR & BTS Operator
                  </h4>
                  <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                    HLR OSINT
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Lihat wilayah asal alokasi HLR operator, radius menara BTS, Street View 360°, dan panduan pelacakan GPS presisi.
                </p>
                <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1 font-bold pt-1">
                  Buka Peta Alokasi &rarr;
                </span>
              </div>

              <div 
                onClick={() => setIsChatOpen(true)}
                className="p-5 bg-[#111] hover:bg-[#161616] border border-white/5 hover:border-green-500/30 rounded-2xl transition-all cursor-pointer group space-y-2.5"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <Bot className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Gemini Chatbot Copilot
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Percakapan multi-turn dengan Gemini Flash, Pro, atau Lite untuk analisis kasus penipuan & OSINT.
                </p>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold pt-1">
                  Buka Chatbot &rarr;
                </span>
              </div>

              <div 
                onClick={() => {
                  setPhoneNumber("081234567890");
                  executeTrack("081234567890");
                  setActiveTab("search-grounding");
                }}
                className="p-5 bg-[#111] hover:bg-[#161616] border border-white/5 hover:border-blue-500/30 rounded-2xl transition-all cursor-pointer group space-y-2.5"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
                  <Globe className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                  Google Search Grounding
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Pindai rekam jejak web real-time melalui Google Search untuk mendeteksi laporan korban & indikasi scam.
                </p>
                <span className="text-[10px] font-mono text-blue-400 flex items-center gap-1 font-bold pt-1">
                  Coba Search Grounding &rarr;
                </span>
              </div>

              <div 
                onClick={() => {
                  setPhoneNumber("081234567890");
                  executeTrack("081234567890");
                  setActiveTab("maps-grounding");
                }}
                className="p-5 bg-[#111] hover:bg-[#161616] border border-white/5 hover:border-red-500/30 rounded-2xl transition-all cursor-pointer group space-y-2.5"
              >
                <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20 group-hover:scale-105 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                  Google Maps Gerai Locator
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Temukan lokasi fisik GraPARI, Galeri Indosat, atau XL Center terdekat menggunakan Google Maps Grounding.
                </p>
                <span className="text-[10px] font-mono text-red-400 flex items-center gap-1 font-bold pt-1">
                  Coba Maps Grounding &rarr;
                </span>
              </div>
            </div>

            {/* Offline PDF Export Banner */}
            <div className="p-4 bg-gradient-to-r from-red-950/30 via-slate-900/60 to-red-950/20 border border-red-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Ekspor Bukti Forensik PDF Offline</span>
                    <span className="text-[9px] font-mono bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded border border-red-500/30">
                      TERSEDIA
                    </span>
                  </h4>
                  <p className="text-xs text-gray-400">
                    Unduh berkas laporan investigasi, koordinat BTS HLR, penilaian risiko AI, dan metadata nomor dalam dokumen PDF resmi untuk bukti offline.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPhoneNumber("081234567890");
                  executeTrack("081234567890");
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs whitespace-nowrap transition-all shadow-md cursor-pointer flex items-center gap-2 shrink-0"
              >
                <FileDown className="w-4 h-4" />
                <span>Uji Ekspor PDF</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Floating Action Button for Gemini Chatbot */}
        {!isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-bold rounded-2xl shadow-[0_10px_25px_rgba(34,197,94,0.35)] transition-all transform hover:scale-105 cursor-pointer border border-green-400/40"
            title="Buka Faiz Cyber Copilot Chat"
          >
            <Bot className="w-5 h-5 text-black" />
            <span className="text-xs font-mono uppercase tracking-wider font-extrabold">AI Copilot</span>
            <span className="w-2 h-2 rounded-full bg-black/60 animate-ping" />
          </button>
        )}

        {/* Gemini Chatbot Drawer */}
        <GeminiChatbot
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          currentTrackedNumber={result ? { ...result, analysis } : null}
        />

        {/* Google Sheets Modal */}
        <GoogleSheetsModal
          isOpen={isSheetsModalOpen}
          onClose={() => setIsSheetsModalOpen(false)}
          user={googleUser}
          accessToken={accessToken}
          onLogin={handleGoogleLogin}
          onLogout={handleGoogleLogout}
          currentRecord={result ? { ...result, analysis } : null}
          historyRecords={history}
          onSelectNumberToTrack={(num) => executeTrack(num)}
        />
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 text-center relative z-10">
        <div className="h-px bg-white/5 max-w-sm mx-auto mb-6" />
        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
          &copy; 2026 Faiz V5 OSINT Technologies • Signal Encryption Active
        </p>
      </footer>
    </div>
  );
}
