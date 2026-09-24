# Number Location Tracking & OSINT - Faiz V5

Aplikasi intelijen OSINT canggih untuk verifikasi dan pelacakan alokasi nomor telepon seluler Indonesia (Telkomsel, Indosat Ooredoo Hutchison, XL Axiata, Smartfren), pemetaan alokasi HLR, radius menara BTS, integrasi Google Maps Platform, serta analisis ancaman phishing/fraud berbasis Google Gemini AI.

---

## 🚀 Fitur Utama
1. **Identifikasi Operator & HLR Otomatis**: Mendeteksi prefix operator telekomunikasi Indonesia sesuai standar Ditjen SDPPI Kominfo & ITU-T E.164.
2. **Peta Alokasi HLR & BTS (Google Maps Platform)**: Visualisasi radius alokasi registrasi HLR kartu SIM, estimasi menara BTS, Street View 360°, dan arah rute navigasi.
3. **Solusi Pelacakan GPS Presisi Orang**: Panduan dan integrasi resmi WhatsApp Live Location, Google Maps Location Sharing, dan Find My Device.
4. **AI Cyber Threat Assessment (Gemini 3.8 / 3.5)**: Analisis tingkat risiko nomor telepon (Low / Medium / High), red flags, dan rekomendasi perlindungan.
5. **Google Search & Maps Grounding**: Pindai rekam jejak digital nomor di Google Search dan cari gerai layanan resmi (GraPARI, Galeri Indosat, XL Center).
6. **Ekspor Laporan Forensik PDF**: Cetak berkas hasil investigasi ke dalam format PDF standar dokumen investigasi siber.
7. **Simpan ke Google Sheets**: Integrasi ekspor data investigasi langsung ke Google Spreadsheet pengguna.

---

## 🛠️ Cara Menjalankan Secara Lokal (Local Development)

### 1. Prasyarat
- **Node.js**: Versi 18 ke atas (disarankan v20+)
- **NPM** atau **Bun** / **Yarn**

### 2. Instalasi Dependensi
Buka terminal di dalam folder proyek hasil ekstrak, lalu jalankan:
```bash
npm install
```

### 3. Konfigurasi Environment Variable
Salin berkas `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi API Key (opsional untuk fitur AI & Maps khusus):
```env
GEMINI_API_KEY=your_gemini_api_key_here
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 4. Menjalankan Aplikasi
Jalankan server aplikasi (Express + Vite frontend):
```bash
npm run dev
```
Buka browser di alamat:
```
http://localhost:3000
```

---

## 📦 Build untuk Production
Untuk membuat bundle produksi:
```bash
npm run build
npm start
```

---

## ⚖️ Kepatuhan & Privasi (Legal Disclaimer)
Aplikasi ini ditujukan untuk analisis OSINT (Open-Source Intelligence), pencegahan kejahatan penipuan online, dan edukasi keamanan siber sesuai regulasi UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP) dan UU Telekomunikasi Republik Indonesia.
