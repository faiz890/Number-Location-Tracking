import React, { useState } from "react";
import { 
  MapPin, 
  Navigation, 
  ExternalLink, 
  Loader2, 
  Building2, 
  Clock, 
  AlertCircle,
  Compass
} from "lucide-react";
import axios from "axios";

interface MapsSource {
  title: string;
  uri: string;
}

interface Props {
  provider?: string;
  currentNumber?: string;
}

export const MapsGroundingCard: React.FC<Props> = ({ provider, currentNumber }) => {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [sources, setSources] = useState<MapsSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const fetchUserGeolocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation tidak didukung pada browser ini.");
      return;
    }
    setGettingLocation(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocationName(`Koordinat: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setGettingLocation(false);
      },
      (err) => {
        console.warn("Geolocation denied or error:", err);
        setError("Izin lokasi tidak diberikan. Pencarian akan menggunakan lokasi default kota.");
        setGettingLocation(false);
      }
    );
  };

  const handleSearchMaps = async (customQuery?: string) => {
    setLoading(true);
    setError(null);

    const query =
      customQuery ||
      `Cari kantor layanan resmi / gerai ${provider || "operator telekomunikasi"} (seperti GraPARI Telkomsel, Galeri Indosat, XL Center) ${
        locationName ? `di dekat ${locationName}` : "terdekat di Indonesia"
      } untuk penanganan kartu sim, penggantian kartu, atau aduan nomor.`;

    try {
      const res = await axios.post("/api/maps-grounding", {
        query,
        provider,
        location: coords,
      });

      setContent(res.data.content);
      setSources(res.data.sources || []);
    } catch (err: any) {
      console.error("Maps Grounding Error:", err);
      const raw = err.response?.data?.error || err.message || "";
      let msg = "Gagal mengambil data Google Maps";
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
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Google Maps Provider Grounding
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-mono border border-red-500/20">
                gemini-3.5-flash
              </span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Temukan GraPARI, Galeri, XL Center, atau service center resmi operator terdekat
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchUserGeolocation}
            disabled={gettingLocation}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl text-xs font-mono transition-all cursor-pointer"
            title="Gunakan lokasi GPS saat ini"
          >
            {gettingLocation ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
            ) : (
              <Compass className="w-3.5 h-3.5 text-red-400" />
            )}
            <span>{coords ? "GPS Terdeteksi" : "Gunakan GPS"}</span>
          </button>
        </div>
      </div>

      {/* Quick Search Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleSearchMaps(`Cari GraPARI Telkomsel terdekat`)}
          className="text-xs font-mono bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-xl border border-white/5 transition-all"
        >
          📍 GraPARI Telkomsel
        </button>
        <button
          onClick={() => handleSearchMaps(`Cari Galeri Indosat IM3 terdekat`)}
          className="text-xs font-mono bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-xl border border-white/5 transition-all"
        >
          📍 Galeri Indosat IM3
        </button>
        <button
          onClick={() => handleSearchMaps(`Cari XL Center / AXIS terdekat`)}
          className="text-xs font-mono bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-xl border border-white/5 transition-all"
        >
          📍 XL Center / Axis
        </button>
        <button
          onClick={() => handleSearchMaps(`Cari 3Store (Tri) atau Smartfren Gallery terdekat`)}
          className="text-xs font-mono bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-xl border border-white/5 transition-all"
        >
          📍 3Store & Smartfren
        </button>
        <button
          onClick={() => handleSearchMaps()}
          disabled={loading}
          className="ml-auto px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
          Cari Gerai Terdekat
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Maps Grounding Result */}
      {content && (
        <div className="p-4 bg-[#161616] rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase tracking-wider">
            <Building2 className="w-4 h-4" /> Informasi Gerai Resmi di Google Maps
          </div>
          <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-sans space-y-2">
            {content}
          </div>

          {/* Extracted Google Maps Links (Mandatory per SKILL.md guidelines) */}
          {sources.length > 0 && (
            <div className="pt-4 border-t border-white/5 space-y-2">
              <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-400" /> Tautan Lokasi Resmi di Google Maps ({sources.length}):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/40 rounded-xl text-xs flex items-center justify-between gap-2 transition-all group"
                  >
                    <div className="truncate">
                      <div className="text-gray-200 group-hover:text-red-300 font-bold truncate text-[11px]">
                        {src.title}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono truncate">Buka titik koordinat / navigasi</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-red-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!content && !loading && (
        <div className="text-center py-6 text-xs text-gray-500 font-mono italic">
          Gunakan tombol di atas untuk menemukan kantor layanan resmi penyedia kartu SIM secara akurat dengan Google Maps.
        </div>
      )}
    </div>
  );
};
