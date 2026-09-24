import React, { useState, useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  MapPin,
  Radio,
  Crosshair,
  ExternalLink,
  Navigation,
  Eye,
  X,
  Compass,
  Copy,
  Check,
  Building2,
  Signal,
  RotateCcw,
  AlertTriangle,
  Info,
  Smartphone,
  Share2,
  Map as MapIcon,
  LocateFixed,
  Send,
  HelpCircle,
  ShieldCheck,
  ArrowRight
} from "lucide-react";

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

interface GoogleMapsTrackerProps {
  number: string;
  provider: string;
  country: string;
  location?: HlrLocation;
}

// Map Circle Component for Cell Tower Radius & Device Accuracy
function CoverageCircle({
  center,
  radius,
  color = "#22c55e",
}: {
  center: { lat: number; lng: number };
  radius: number;
  color?: string;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === "undefined" || !google.maps) return;

    const circle = new google.maps.Circle({
      strokeColor: color,
      strokeOpacity: 0.7,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: 0.12,
      map,
      center,
      radius,
    });

    return () => {
      circle.setMap(null);
    };
  }, [map, center.lat, center.lng, radius, color]);

  return null;
}

// Map Pan/Zoom Controller
function MapController({
  center,
  zoom,
}: {
  center: { lat: number; lng: number };
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(center);
    map.setZoom(zoom);
  }, [map, center, zoom]);

  return null;
}

// Haversine distance calculator between 2 points in km
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const GoogleMapsTracker: React.FC<GoogleMapsTrackerProps> = ({
  number,
  provider,
  country,
  location,
}) => {
  const [apiKey, setApiKey] = useState<string>(
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyD5Erzoy2ABb64Rmo9EyFwg-KKjcc_D_R8"
  );
  const [copied, setCopied] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<"target" | "device" | number | null>("target");
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "hybrid" | "terrain">("roadmap");
  const [isStreetViewOpen, setIsStreetViewOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [trackerMode, setTrackerMode] = useState<"map" | "precision-guide">("map");

  // Live Device Geolocation state
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isLocatingDevice, setIsLocatingDevice] = useState(false);
  const [deviceLocationError, setDeviceLocationError] = useState<string | null>(null);

  const streetViewContainerRef = useRef<HTMLDivElement>(null);

  // Fallback coordinates for HLR target
  const lat = location?.lat || -6.2088;
  const lng = location?.lng || 106.8456;
  const targetPos = { lat, lng };

  // Fetch API key if not yet in state
  useEffect(() => {
    if (!apiKey) {
      fetch("/api/config/maps")
        .then((r) => r.json())
        .then((data) => {
          if (data.apiKey) setApiKey(data.apiKey);
        })
        .catch((e) => console.error("Could not fetch maps key:", e));
    }
  }, [apiKey]);

  // Street View instantiation
  useEffect(() => {
    if (!isStreetViewOpen || !streetViewContainerRef.current) return;
    if (typeof google === "undefined" || !google.maps) return;

    try {
      const panoramaOptions: any = {
        position: targetPos,
        pov: { heading: 165, pitch: 0 },
        zoom: 1,
        addressControl: true,
        enableCloseButton: false,
        internalUsageAttributionIds: ["gmp_mcp_codeassist_v1_aistudio"],
      };
      const panorama = new google.maps.StreetViewPanorama(
        streetViewContainerRef.current,
        panoramaOptions
      );
      return () => {
        panorama.setVisible(false);
      };
    } catch (err) {
      console.error("Street View init error:", err);
    }
  }, [isStreetViewOpen, lat, lng]);

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setScanStep(1);
    const steps = [
      () => setScanStep(2),
      () => setScanStep(3),
      () => {
        setScanStep(4);
        setIsScanning(false);
      },
    ];
    setTimeout(steps[0], 700);
    setTimeout(steps[1], 1500);
    setTimeout(steps[2], 2400);
  };

  // Request actual Device GPS (with user consent) to compare with HLR
  const handleRequestDeviceGPS = () => {
    if (!navigator.geolocation) {
      setDeviceLocationError("Browser Anda tidak mendukung layanan Geolocation GPS.");
      return;
    }
    setIsLocatingDevice(true);
    setDeviceLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeviceCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setIsLocatingDevice(false);
        setSelectedMarker("device");
      },
      (err) => {
        setIsLocatingDevice(false);
        if (err.code === err.PERMISSION_DENIED) {
          setDeviceLocationError("Izin lokasi GPS ditolak oleh browser. Mohon izinkan akses lokasi pada browser Anda.");
        } else {
          setDeviceLocationError("Tidak dapat menentukan posisi GPS perangkat Anda: " + err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Format clean WhatsApp number
  const cleanPhone = number.replace(/[^0-9]/g, "");
  const waTarget = cleanPhone.startsWith("0") ? `62${cleanPhone.slice(1)}` : cleanPhone;
  const waRequestUrl = `https://wa.me/${waTarget}?text=${encodeURIComponent(
    `Halo, mohon kirimkan Lokasi Terkini (Live Location) Anda melalui WhatsApp untuk keperluan verifikasi lokasi yang akurat.`
  )}`;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const googleDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const distanceKm = deviceCoords
    ? calculateDistance(deviceCoords.lat, deviceCoords.lng, lat, lng)
    : null;

  return (
    <div className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden cyber-border shadow-2xl relative">
      {/* Header Bar */}
      <div className="p-5 md:p-6 bg-gradient-to-r from-[#141414] via-[#181818] to-[#141414] border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Peta Alokasi HLR & BTS Operator
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                REGISTRASI HLR OPERATOR
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                BUKAN GPS REAL-TIME ORANG
              </span>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5 font-mono">
              <span>{number}</span>
              <span className="text-gray-600">•</span>
              <span className="text-amber-400">{provider}</span>
              <span className="text-gray-600">•</span>
              <span>Wilayah {location?.city || "Indonesia"}</span>
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-black/50 p-1 rounded-xl border border-white/10 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTrackerMode("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                trackerMode === "map"
                  ? "bg-green-500/20 text-green-300 border border-green-500/40"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Peta HLR & BTS</span>
            </button>
            <button
              type="button"
              onClick={() => setTrackerMode("precision-guide")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                trackerMode === "precision-guide"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <LocateFixed className="w-3.5 h-3.5" />
              <span>Solusi GPS Presisi Orang</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Truth & Validity Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/30 border-b border-amber-500/30 px-5 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-amber-300 flex items-center gap-2">
              <span>Transparansi Teknis Pelacakan Nomor Telepon</span>
              <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30 font-normal">
                Penting Diketahui
              </span>
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Koordinat di peta ini menampilkan <strong>titik tengah wilayah alokasi HLR (Home Location Register)</strong> kartu SIM dari operator {provider}. 
              Peta <strong>BUKAN</strong> posisi GPS fisik orang saat ini secara real-time. Jika pengguna nomor sedang berada di kota lain, pelacakan nomor telepon publik tetap menunjuk ke area asal kartu diterbitkan.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setTrackerMode("precision-guide")}
          className="shrink-0 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <span>Cara Lacak GPS Asli</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Triangulation Simulation Status Banner (if scanning) */}
      {isScanning && (
        <div className="bg-green-950/40 border-b border-green-500/30 px-6 py-2.5 flex items-center justify-between text-xs font-mono text-green-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
            <span>
              {scanStep === 1 && "MENGHUBUNGI GATEWAY HLR OPERATOR & MENARA BTS..."}
              {scanStep === 2 && `MENGANALISA RADIUS JANGKAUAN TOWER: ${location?.btsName || "BTS-PRIMARY"}...`}
              {scanStep === 3 && `MENETAPKAN ESTIMASI PUSAT REGISTRASI: ${lat}, ${lng}...`}
            </span>
          </div>
          <span className="text-[10px] text-green-400/70">HLR OSINT PROTOCOL</span>
        </div>
      )}

      {/* Street View Modal */}
      {isStreetViewOpen && (
        <div className="relative w-full h-80 bg-black border-b border-white/10">
          <div ref={streetViewContainerRef} className="w-full h-full" />
          <div className="absolute top-3 left-3 z-10 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-xs font-mono text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-blue-400" />
            <span>Street View 360° • Area Alokasi ({location?.city})</span>
          </div>
          <button
            type="button"
            onClick={() => setIsStreetViewOpen(false)}
            className="absolute top-3 right-3 z-10 p-1.5 bg-black/80 hover:bg-black text-white rounded-lg border border-white/20 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SUB-VIEW 1: Interactive Google Map */}
      {trackerMode === "map" && (
        <div className="relative w-full h-[450px] md:h-[520px] bg-[#0c0c0c]">
          {apiKey ? (
            <APIProvider apiKey={apiKey}>
              <Map
                id="faiz-v5-tracker-map"
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                defaultCenter={targetPos}
                defaultZoom={12}
                gestureHandling="greedy"
                disableDefaultUI={false}
                mapTypeId={mapType}
                className="w-full h-full"
              >
                {/* Smooth recenter controller */}
                <MapController
                  center={selectedMarker === "device" && deviceCoords ? deviceCoords : targetPos}
                  zoom={selectedMarker === "device" ? 15 : 12}
                />

                {/* HLR Cell Tower Coverage Circle */}
                <CoverageCircle
                  center={targetPos}
                  radius={location?.accuracyRadiusMeters || 8000}
                  color="#f59e0b" // Amber color to indicate estimated HLR zone
                />

                {/* If device GPS enabled, draw Device Accuracy Circle */}
                {deviceCoords && (
                  <CoverageCircle
                    center={{ lat: deviceCoords.lat, lng: deviceCoords.lng }}
                    radius={deviceCoords.accuracy || 30}
                    color="#3b82f6" // Blue color for real GPS device
                  />
                )}

                {/* Target Pin Marker (HLR Area Center) */}
                <AdvancedMarker
                  position={targetPos}
                  onClick={() => setSelectedMarker("target")}
                  title={`Target: ${number} (Pusat HLR)`}
                >
                  <div className="relative flex items-center justify-center cursor-pointer group">
                    <div className="absolute w-12 h-12 rounded-full bg-amber-500/20 animate-ping" />
                    <div className="absolute w-8 h-8 rounded-full bg-amber-500/40 animate-pulse" />
                    <div className="relative z-10 w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 p-0.5 shadow-xl border-2 border-white flex items-center justify-center text-black">
                      <Radio className="w-4 h-4 text-black stroke-[2.5]" />
                    </div>
                    <div className="absolute -top-7 whitespace-nowrap bg-black/90 border border-amber-500/50 text-amber-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">
                      PUSAT HLR: {location?.city || "TARGET"}
                    </div>
                  </div>
                </AdvancedMarker>

                {/* Device Live GPS Marker (if enabled by user) */}
                {deviceCoords && (
                  <AdvancedMarker
                    position={{ lat: deviceCoords.lat, lng: deviceCoords.lng }}
                    onClick={() => setSelectedMarker("device")}
                    title="Posisi GPS Perangkat Anda Saat Ini"
                  >
                    <div className="relative flex items-center justify-center cursor-pointer group">
                      <div className="absolute w-10 h-10 rounded-full bg-blue-500/30 animate-ping" />
                      <div className="relative z-10 w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white shadow-xl">
                        <LocateFixed className="w-4 h-4 text-white" />
                      </div>
                      <div className="absolute -top-7 whitespace-nowrap bg-blue-950/90 border border-blue-400 text-blue-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">
                        GPS PERANGKAT ANDA
                      </div>
                    </div>
                  </AdvancedMarker>
                )}

                {/* Official Service Centers Markers */}
                {location?.nearbyServiceCenters?.map((sc, idx) => (
                  <AdvancedMarker
                    key={idx}
                    position={{ lat: sc.lat, lng: sc.lng }}
                    onClick={() => setSelectedMarker(idx)}
                    title={sc.name}
                  >
                    <div className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg border border-white cursor-pointer transition-transform hover:scale-110 flex items-center justify-center">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                  </AdvancedMarker>
                ))}

                {/* Target InfoWindow */}
                {selectedMarker === "target" && (
                  <InfoWindow
                    position={targetPos}
                    onCloseClick={() => setSelectedMarker(null)}
                    maxWidth={330}
                  >
                    <div className="p-2 text-gray-900 space-y-2">
                      <div className="flex items-center justify-between border-b pb-1.5 border-gray-200">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-amber-700">
                          <Radio className="w-3.5 h-3.5" />
                          <span>Alokasi Registrasi HLR</span>
                        </div>
                        <span className="text-[10px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                          Radius ~{((location?.accuracyRadiusMeters || 8000) / 1000).toFixed(1)} km
                        </span>
                      </div>

                      <div>
                        <div className="text-sm font-extrabold text-gray-900">{number}</div>
                        <div className="text-xs text-gray-600">{provider} • {country}</div>
                      </div>

                      <div className="bg-amber-50/80 p-2 rounded text-[11px] font-mono space-y-1 border border-amber-200">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Wilayah HLR:</span>
                          <span className="font-bold text-gray-900">{location?.region || "Indonesia"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Kota Alokasi:</span>
                          <span className="font-bold text-gray-900">{location?.city || "Kota Pusat"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Koordinat HLR:</span>
                          <span className="font-bold text-gray-900">{lat}, {lng}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">BTS Tower Node:</span>
                          <span className="font-bold text-blue-700">{location?.btsName || "BTS-5021"}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-gray-500 italic">
                        * Titik ini adalah pusat wilayah jaringan prefix nomor, bukan posisi fisik GPS langsung.
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <a
                          href={googleDirectionsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg text-center transition-colors flex items-center justify-center gap-1"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Rute Google Maps</span>
                        </a>
                      </div>
                    </div>
                  </InfoWindow>
                )}

                {/* Device InfoWindow */}
                {selectedMarker === "device" && deviceCoords && (
                  <InfoWindow
                    position={{ lat: deviceCoords.lat, lng: deviceCoords.lng }}
                    onCloseClick={() => setSelectedMarker(null)}
                    maxWidth={300}
                  >
                    <div className="p-2 text-gray-900 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-blue-700 border-b pb-1 border-gray-200">
                        <LocateFixed className="w-3.5 h-3.5" />
                        <span>GPS Perangkat Anda (Real-Time)</span>
                      </div>
                      <div className="text-xs text-gray-700 font-mono space-y-1">
                        <div>Lat/Lng: <strong>{deviceCoords.lat.toFixed(6)}, {deviceCoords.lng.toFixed(6)}</strong></div>
                        <div>Akurasi Hardware: <strong>±{Math.round(deviceCoords.accuracy)} meter</strong></div>
                        {distanceKm !== null && (
                          <div className="text-purple-700 font-bold pt-1">
                            Jarak ke Titik HLR: ~{distanceKm} km
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 italic">
                        Ini adalah contoh posisi GPS fisik real-time yang dihasilkan oleh hardware perangkat dengan persetujuan Anda.
                      </div>
                    </div>
                  </InfoWindow>
                )}

                {/* Service Center InfoWindow */}
                {typeof selectedMarker === "number" && location?.nearbyServiceCenters?.[selectedMarker] && (
                  <InfoWindow
                    position={{
                      lat: location.nearbyServiceCenters[selectedMarker].lat,
                      lng: location.nearbyServiceCenters[selectedMarker].lng,
                    }}
                    onCloseClick={() => setSelectedMarker(null)}
                    maxWidth={300}
                  >
                    <div className="p-2 text-gray-900 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-blue-700">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Gerai Resmi Terdekat</span>
                      </div>
                      <div className="text-sm font-bold">{location.nearbyServiceCenters[selectedMarker].name}</div>
                      <div className="text-xs text-gray-600">{location.nearbyServiceCenters[selectedMarker].address}</div>
                      <div className="text-xs font-mono text-gray-700">Telp: {location.nearbyServiceCenters[selectedMarker].phone}</div>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-3">
              <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />
              <p className="text-sm font-mono">Memuat Google Maps Platform SDK...</p>
            </div>
          )}

          {/* Floating Map Controls Top-Left */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            {/* Map Layer Switcher */}
            <div className="bg-[#141414]/90 backdrop-blur-md border border-white/10 rounded-xl p-1 flex items-center gap-1 shadow-xl">
              {(["roadmap", "satellite", "hybrid", "terrain"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMapType(type)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase transition-all cursor-pointer ${
                    mapType === type
                      ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Quick Map Info Box */}
            <div className="bg-[#141414]/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl max-w-[260px] text-xs font-mono space-y-1.5 hidden sm:block">
              <div className="flex items-center justify-between text-gray-400">
                <span className="flex items-center gap-1">
                  <Radio className="w-3 h-3 text-amber-400" /> Radius Jaringan:
                </span>
                <span className="text-amber-400 font-bold">
                  ~{((location?.accuracyRadiusMeters || 8000) / 1000).toFixed(1)} km
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <span>Node BTS:</span>
                <span className="text-white font-bold">{location?.btsName || "BTS-HLR"}</span>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <span>Status Data:</span>
                <span className="text-yellow-400 font-bold">Prefix HLR</span>
              </div>
            </div>
          </div>

          {/* Bottom Right Quick Recenter Buttons */}
          <div className="absolute bottom-4 right-4 z-10 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRequestDeviceGPS}
              disabled={isLocatingDevice}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/90 hover:bg-blue-600 backdrop-blur-md text-white font-bold rounded-xl text-xs font-mono shadow-xl transition-all cursor-pointer disabled:opacity-50"
              title="Aktifkan GPS Perangkat untuk membandingkan posisi fisik dengan HLR"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${isLocatingDevice ? "animate-spin" : ""}`} />
              <span>{isLocatingDevice ? "Membaca GPS..." : "Uji GPS Saya"}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMarker("target")}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#141414]/90 hover:bg-[#1f1f1f] backdrop-blur-md border border-white/15 hover:border-amber-500/40 text-white rounded-xl text-xs font-mono shadow-xl transition-all cursor-pointer"
              title="Pusatkan ke titik HLR"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Pusatkan HLR</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Precision GPS Guide & Live Sharing Tools */}
      {trackerMode === "precision-guide" && (
        <div className="p-6 md:p-8 space-y-6 bg-[#0e0e0e]">
          <div className="max-w-3xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-blue-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Standar Forensik & Legalitas Pelacakan GPS</span>
            </div>
            <h4 className="text-xl font-bold text-white">
              Mengapa Nomor Telepon Tidak Bisa Melacak GPS Orang Secara Langsung?
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              Di seluruh dunia (termasuk Indonesia di bawah UU Telekomunikasi & UU No. 27/2022 tentang Perlindungan Data Pribadi),
              operator telekomunikasi seperti Telkomsel, Indosat, dan XL <strong>tidak membuka data koordinat GPS pelanggan ke publik</strong>.
              Hanya kepolisian/Bareskrim dengan izin pengadilan atau surat tugas resmi (*law enforcement lawful interception*) yang dapat meminta triangulasi BTS real-time dari operator.
            </p>
          </div>

          {/* 3 Legitimate Ways to Track Person's Real GPS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Method 1: WhatsApp Live Location */}
            <div className="p-5 bg-[#141414] border border-green-500/30 rounded-2xl space-y-3 relative overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <h5 className="text-sm font-bold text-white">
                1. WhatsApp Live Location
              </h5>
              <p className="text-xs text-gray-400 leading-relaxed">
                Minta orang tersebut membagikan lokasi langsung (15 menit, 1 jam, atau 8 jam). Tingkat akurasi mencapai <strong>±5 meter</strong> menggunakan GPS chip ponsel mereka.
              </p>
              <a
                href={waRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 bg-green-600 hover:bg-green-500 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Minta Live Location via WA</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Method 2: Google Maps Location Sharing */}
            <div className="p-5 bg-[#141414] border border-blue-500/30 rounded-2xl space-y-3 relative overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <h5 className="text-sm font-bold text-white">
                2. Berbagi Lokasi Google Maps
              </h5>
              <p className="text-xs text-gray-400 leading-relaxed">
                Fitur resmi Google Maps untuk melacak keluarga atau rekan kerja secara real-time dan berkesinambungan dengan persetujuan kedua pihak.
              </p>
              <a
                href="https://support.google.com/maps/answer/7326816?hl=id"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Buka Panduan Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Method 3: Find My Device (Untuk HP Sendiri/Keluarga) */}
            <div className="p-5 bg-[#141414] border border-purple-500/30 rounded-2xl space-y-3 relative overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h5 className="text-sm font-bold text-white">
                3. Google Find My / Apple Lacak
              </h5>
              <p className="text-xs text-gray-400 leading-relaxed">
                Jika nomor target terpasang pada HP Anda yang hilang atau HP anak/keluarga dalam satu akun Google Family, gunakan portal resmi pelacakan perangkat.
              </p>
              <a
                href="https://www.google.com/android/find"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Buka Google Find My Device</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Interactive GPS Proof Section */}
          <div className="p-5 bg-[#141414] border border-white/10 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h5 className="text-sm font-bold text-white flex items-center gap-2">
                <LocateFixed className="w-4 h-4 text-blue-400" />
                <span>Buktikan Sendiri Perbedaan GPS Hardware vs Data HLR Nomor</span>
              </h5>
              <p className="text-xs text-gray-400 mt-1">
                Klik tombol di samping untuk mengaktifkan sensor GPS pada browser Anda. Sistem akan memplot titik biru (posisi Anda sesungguhnya) dan membandingkannya dengan titik kuning (data registrasi HLR nomor {number}).
              </p>
              {deviceCoords && (
                <div className="text-xs font-mono text-green-400 mt-2">
                  ✓ GPS Terkunci: {deviceCoords.lat.toFixed(5)}, {deviceCoords.lng.toFixed(5)} (Akurasi: ±{Math.round(deviceCoords.accuracy)}m) • Jarak ke HLR Target: ~{distanceKm} km
                </div>
              )}
              {deviceLocationError && (
                <div className="text-xs font-mono text-red-400 mt-2">
                  ✗ {deviceLocationError}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  handleRequestDeviceGPS();
                  setTrackerMode("map");
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <LocateFixed className="w-4 h-4" />
                <span>Tampilkan di Peta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info & Telemetry Grid */}
      <div className="p-5 md:p-6 bg-[#141414] border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div className="space-y-1">
          <span className="text-gray-500 text-[10px] uppercase">Jenis Data Lokasi</span>
          <p className="text-amber-400 font-bold truncate">Alokasi HLR Prefix</p>
          <span className="text-gray-400 text-[10px]">{location?.city}, {location?.province}</span>
        </div>

        <div className="space-y-1">
          <span className="text-gray-500 text-[10px] uppercase">Koordinat Pusat HLR</span>
          <div className="flex items-center gap-1.5">
            <p className="text-white font-bold truncate">
              {lat}, {lng}
            </p>
            <button
              type="button"
              onClick={handleCopyCoords}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Salin Koordinat"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <span className="text-gray-400 text-[10px]">WGS84 Geodetik Datum</span>
        </div>

        <div className="space-y-1">
          <span className="text-gray-500 text-[10px] uppercase">BTS Node & LAC</span>
          <p className="text-white font-bold">{location?.lac || "LAC-5021"} • {location?.cellId || "CI-34821"}</p>
          <span className="text-gray-400 text-[10px]">Radius ~{((location?.accuracyRadiusMeters || 8000) / 1000).toFixed(1)} km</span>
        </div>

        <div className="space-y-1">
          <span className="text-gray-500 text-[10px] uppercase">Validitas Real-Time</span>
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setTrackerMode("precision-guide")}
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Info Akurasi GPS</span>
            </button>
          </div>
          <span className="text-[10px] text-gray-500">Kepatuhan UU PDP & Kominfo</span>
        </div>
      </div>
    </div>
  );
};
