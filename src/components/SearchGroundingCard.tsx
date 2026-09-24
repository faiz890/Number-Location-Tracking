import React, { useState } from "react";
import { 
  Globe, 
  Search, 
  ExternalLink, 
  Loader2, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles,
  RefreshCw,
  FileText
} from "lucide-react";
import axios from "axios";

interface Source {
  title: string;
  uri: string;
}

interface Props {
  currentNumber?: string;
  provider?: string;
  country?: string;
}

export const SearchGroundingCard: React.FC<Props> = ({ currentNumber, provider, country }) => {
  const [query, setQuery] = useState(currentNumber || "");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Auto sync query if currentNumber changes
  React.useEffect(() => {
    if (currentNumber) {
      setQuery(currentNumber);
    }
  }, [currentNumber]);

  const handleSearchGrounding = async (targetQuery?: string) => {
    const q = (targetQuery || query).trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const res = await axios.post("/api/search-grounding", {
        query: q,
        phoneContext: {
          number: currentNumber,
          provider,
          country,
        },
      });

      setReport(res.data.report);
      setSources(res.data.sources || []);
      setSearchQueries(res.data.searchQueries || []);
    } catch (err: any) {
      console.error("Search Grounding Error:", err);
      const raw = err.response?.data?.error || err.message || "";
      let msg = "Gagal melakukan pencarian intelijen web";
      if (raw.includes("API_KEY_INVALID") || raw.includes("API key not valid")) {
        msg = "Kunci API Gemini belum disetel atau tidak valid. Silakan periksa di Settings > Secrets panel.";
      } else if (raw.includes("RESOURCE_EXHAUSTED") || raw.includes("429")) {
        msg = "Batas kuota model tercapai. Silakan coba kembali sesaat lagi.";
      } else if (raw) {
        msg = raw;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111] border border-white/5 rounded-3xl p-6 cyber-border space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Google Search Grounding
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20">
                gemini-3.5-flash
              </span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Verifikasi rekam jejak digital nomor & laporan penipuan live dari Google Search
            </p>
          </div>
        </div>

        {report && (
          <button
            onClick={() => handleSearchGrounding()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-mono transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Segarkan
          </button>
        )}
      </div>

      {/* Query Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Masukkan nomor telepon atau kueri OSINT..."
            className="w-full bg-[#181818] border border-white/10 rounded-xl py-2 pl-10 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all font-mono"
          />
        </div>
        <button
          onClick={() => handleSearchGrounding()}
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Cari Web Live
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Queries executed by Gemini tool */}
      {searchQueries.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-gray-400">
          <span className="text-gray-500">Google queries:</span>
          {searchQueries.map((sq, idx) => (
            <span
              key={idx}
              className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-gray-300 text-[10px]"
            >
              "{sq}"
            </span>
          ))}
        </div>
      )}

      {/* Intelligence Report Result */}
      {report && (
        <div className="p-4 bg-[#161616] rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 uppercase tracking-wider">
            <FileText className="w-4 h-4" /> Laporan Analisis Web Terkini
          </div>
          <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-sans space-y-2">
            {report}
          </div>

          {/* Sources List (Mandatory grounding citation) */}
          {sources.length > 0 && (
            <div className="pt-4 border-t border-white/5 space-y-2">
              <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Sumber Referensi Google Search ({sources.length}):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/40 rounded-xl text-xs flex items-center justify-between gap-2 transition-all group"
                  >
                    <span className="text-gray-300 group-hover:text-blue-300 truncate font-mono text-[11px]">
                      {src.title}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!report && !loading && (
        <div className="text-center py-6 text-xs text-gray-500 font-mono italic">
          Klik tombol "Cari Web Live" untuk memindai rekam jejak nomor target pada index pencarian Google terbaru.
        </div>
      )}
    </div>
  );
};
