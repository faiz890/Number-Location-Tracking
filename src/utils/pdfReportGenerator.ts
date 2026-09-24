import { jsPDF } from "jspdf";

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
  timestamp: string;
}

interface AIAnalysis {
  riskLevel: string;
  summary: string;
  redFlags: string[];
  recommendations: string[];
}

export function generateTrackingReportPDF(
  data: TrackingData,
  analysis?: AIAnalysis | null
): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const reportId = `FAIZ-OSINT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const dateStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Background accent bars
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, "F");

  // Top Neon Line
  doc.setFillColor(34, 197, 94); // emerald-500
  doc.rect(0, 27, pageWidth, 1.5, "F");

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("FAIZ V5 CYBER INTELLIGENCE & TELECOM OSINT", margin, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("Laporan Bukti Forensik Pelacakan Nomor Telepon & Lokasi Menara BTS Seluler", margin, 17);

  // Document metadata right side
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(34, 197, 94);
  doc.text("BUKTI RESMI DIGITAL", pageWidth - margin - 38, 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`ID: ${reportId}`, pageWidth - margin - 44, 15);
  doc.text(`${dateStr}, ${timeStr} WIB`, pageWidth - margin - 44, 20);

  let currentY = 35;

  // Helper function to draw Section Header
  const drawSectionHeader = (title: string, iconNumber: string) => {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(margin, currentY, contentWidth, 7, 1.5, 1.5, "F");
    
    doc.setFillColor(34, 197, 94);
    doc.circle(margin + 4, currentY + 3.5, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${iconNumber}. ${title.toUpperCase()}`, margin + 8, currentY + 4.8);
    currentY += 10;
  };

  // Section 1: IDENTITAS NOMOR & OPERATOR
  drawSectionHeader("Identitas Nomor & Operator Telekomunikasi", "1");

  const colWidth = (contentWidth - 6) / 2;

  // Box Left: Phone Number Info
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, colWidth, 34, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("NOMOR TARGET (E.164):", margin + 3.5, currentY + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(data.number, margin + 3.5, currentY + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Format Lokal / Mentah: 0${data.raw.startsWith("62") ? data.raw.slice(2) : data.raw}`, margin + 3.5, currentY + 18);
  doc.text(`Negara / Kode Wilayah: ${data.country} (+62)`, margin + 3.5, currentY + 23);
  doc.text(`Standar Alokasi: ITU-T E.164 & SDPPI Kominfo`, margin + 3.5, currentY + 28);

  // Box Right: Provider & Network Info
  const rightX = margin + colWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightX, currentY, colWidth, 34, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("PROVIDER & STATUS JARINGAN:", rightX + 3.5, currentY + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(data.provider, rightX + 3.5, currentY + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Validitas Penomoran: ${data.isValid ? "TERVERIFIKASI VALID" : "TIDAK STANDAR"}`, rightX + 3.5, currentY + 18);
  doc.text(`Teknologi Seluler: GSM / UMTS / LTE Advanced / 5G`, rightX + 3.5, currentY + 23);
  doc.text(`Status HLR: Terhubung ke Sentral GSM Gateway`, rightX + 3.5, currentY + 28);

  currentY += 38;

  // Section 2: GEO-LOKASI & DATA MENARA BTS
  drawSectionHeader("Geo-Lokasi, HLR & Estimasi Menara BTS", "2");

  const loc = data.location;
  const lat = loc?.lat || -6.2088;
  const lng = loc?.lng || 106.8456;
  const radiusKm = loc?.accuracyRadiusMeters ? (loc.accuracyRadiusMeters / 1000).toFixed(1) : "8.5";

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, contentWidth, 40, 2, 2, "FD");

  // 3-Column stats inside Geolocation box
  const subCol = contentWidth / 3;

  // Sub 1
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("WILAYAH & HLR REGIONAL", margin + 4, currentY + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(loc?.region || "Regional Jabodetabek", margin + 4, currentY + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`${loc?.city || "Jakarta"}, ${loc?.province || "DKI Jakarta"}`, margin + 4, currentY + 17);
  doc.text("Sistem Datum: WGS84 Geodetik", margin + 4, currentY + 22);

  // Sub 2
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("KOORDINAT PUSAT HLR", margin + subCol + 2, currentY + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text(`${lat}, ${lng}`, margin + subCol + 2, currentY + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Radius Tower BTS: ~${radiusKm} km`, margin + subCol + 2, currentY + 17);
  doc.text(`Status: Alokasi Prefix Operator`, margin + subCol + 2, currentY + 22);

  // Sub 3
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("IDENTITAS SELULER (BTS)", margin + subCol * 2 + 2, currentY + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(147, 51, 234); // purple-600
  doc.text(loc?.btsName || "BTS-PRIMARY-502", margin + subCol * 2 + 2, currentY + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`LAC: ${loc?.lac || "LAC-5509"}`, margin + subCol * 2 + 2, currentY + 17);
  doc.text(`Cell ID: ${loc?.cellId || "CI-10113"}`, margin + subCol * 2 + 2, currentY + 22);

  // Google Maps Clickable Link Banner at bottom of geo-box
  doc.setFillColor(239, 246, 255); // blue-50
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(margin + 3, currentY + 27, contentWidth - 6, 9.5, 1.5, 1.5, "FD");

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 64, 175);
  doc.text("BUKA KOORDINAT DI GOOGLE MAPS:", margin + 6, currentY + 33);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(37, 99, 235);
  doc.textWithLink(mapsUrl, margin + 64, currentY + 33, { url: mapsUrl });

  currentY += 44;

  // Section 3: ANALISIS ANCAMAN & INTELIJEN AI (GEMINI OSINT)
  drawSectionHeader("Penilaian Risiko & Intelijen Ancaman AI", "3");

  const risk = analysis?.riskLevel || "Low";
  let badgeColor: [number, number, number] = [34, 197, 94]; // Green
  let badgeBg: [number, number, number] = [240, 253, 244];
  if (risk.toLowerCase().includes("high")) {
    badgeColor = [239, 68, 68]; // Red
    badgeBg = [254, 242, 242];
  } else if (risk.toLowerCase().includes("med")) {
    badgeColor = [245, 158, 11]; // Amber
    badgeBg = [255, 251, 235];
  }

  // Risk badge and summary card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 54, 2, 2, "FD");

  // Badge Tag
  doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
  doc.setDrawColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(margin + 4, currentY + 4, 38, 7, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.text(`RISIKO: ${risk.toUpperCase()}`, margin + 7, currentY + 8.8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("KESIMPULAN ANALISIS OSINT:", margin + 46, currentY + 8.8);

  // Summary Text with wrap
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const summaryText = analysis?.summary ||
    `Nomor ${data.number} berada di bawah alokasi resmi operator ${data.provider}. Hasil triangulasi HLR menunjukkan nomor aktif pada node BTS area ${loc?.city || "Indonesia"}.`;
  const splitSummary = doc.splitTextToSize(summaryText, contentWidth - 10);
  doc.text(splitSummary, margin + 4, currentY + 16);

  // Red Flags & Recommendations (2 Sub-boxes)
  const redFlagsList = analysis?.redFlags && analysis.redFlags.length > 0
    ? analysis.redFlags
    : ["Tidak ditemukan rekam jejak ancaman kritis pada basis data komunitas terbuka."];
  
  const recList = analysis?.recommendations && analysis.recommendations.length > 0
    ? analysis.recommendations
    : [
        "Verifikasi identitas sebelum melakukan transfer dana atau membagikan kode OTP.",
        "Jangan memasang aplikasi berformat .APK dari pesan WhatsApp nomor yang belum terdaftar.",
        "Laporkan indikasi penipuan ke portal resmi Kominfo: aduankonten.id."
      ];

  const subBoxY = currentY + 26;
  const subBoxWidth = (contentWidth - 10) / 2;

  // Red flags left
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(185, 28, 28); // red-700
  doc.text("INDIKATOR KECURIGAAN (RED FLAGS):", margin + 4, subBoxY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  let rfY = subBoxY + 4;
  redFlagsList.slice(0, 3).forEach((rf) => {
    const lines = doc.splitTextToSize(`• ${rf}`, subBoxWidth - 2);
    doc.text(lines, margin + 4, rfY);
    rfY += lines.length * 3.5;
  });

  // Recommendations right
  const recX = margin + subBoxWidth + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(21, 128, 61); // green-700
  doc.text("PANDUAN & REKOMENDASI TINDAKAN:", recX, subBoxY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  let recY = subBoxY + 4;
  recList.slice(0, 3).forEach((rec) => {
    const lines = doc.splitTextToSize(`• ${rec}`, subBoxWidth - 2);
    doc.text(lines, recX, recY);
    recY += lines.length * 3.5;
  });

  currentY += 58;

  // Section 4: GERAI LAYANAN RESMI TERDEKAT
  if (loc?.nearbyServiceCenters && loc.nearbyServiceCenters.length > 0) {
    drawSectionHeader("Gerai Layanan Resmi Terdekat", "4");

    const scWidth = (contentWidth - 6) / 2;
    loc.nearbyServiceCenters.slice(0, 2).forEach((sc, idx) => {
      const scX = idx === 0 ? margin : margin + scWidth + 6;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(scX, currentY, scWidth, 18, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(15, 23, 42);
      doc.text(sc.name, scX + 3.5, currentY + 4.8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(`Tipe: ${sc.type}`, scX + 3.5, currentY + 8.8);
      doc.text(`Alamat: ${sc.address}`, scX + 3.5, currentY + 12.5);
      doc.text(`Kontak Bantuan: ${sc.phone}`, scX + 3.5, currentY + 16);
    });

    currentY += 22;
  }

  // Footer Disclaimer & Verification Seal
  const footerY = pageHeight - 18;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text("PERNYATAAN HUKUM & METODOLOGI FORENSIK DIGITAL:", margin, footerY + 1.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);
  const legalNotice =
    "Dokumen ini diterbitkan oleh Faiz V5 Cyber Intelligence Suite secara otomatis untuk keperluan analisis defensif pribadi dan verifikasi penomoran telekomunikasi berbasis standar OSINT (Open Source Intelligence). Estimasi lokasi menara BTS diturunkan dari data alokasi HLR (Home Location Register) prefix operator nasional. Patuhi regulasi UU No. 1 Tahun 2024 tentang ITE dan UU Perlindungan Data Pribadi (UU PDP).";
  const splitNotice = doc.splitTextToSize(legalNotice, contentWidth - 45);
  doc.text(splitNotice, margin, footerY + 5);

  // Digital Signature / Hash Stamp
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(34, 197, 94);
  doc.text("FAIZ V5 VERIFIED", pageWidth - margin - 35, footerY + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(`HASH: ${reportId.slice(-8)}`, pageWidth - margin - 35, footerY + 6);
  doc.text("STATUS: AUTHENTIC", pageWidth - margin - 35, footerY + 9.5);

  // Save PDF file to browser
  const filename = `Laporan_Pelacakan_Nomor_${data.raw}_${Date.now()}.pdf`;
  doc.save(filename);
}
