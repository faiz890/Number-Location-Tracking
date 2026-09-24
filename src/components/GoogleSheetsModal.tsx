import React, { useState, useEffect } from "react";
import { 
  X, 
  Table, 
  Plus, 
  ExternalLink, 
  Check, 
  Loader2, 
  AlertCircle, 
  FileSpreadsheet, 
  RefreshCw, 
  Save, 
  LogOut, 
  Database,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { User } from "firebase/auth";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { 
  listSpreadsheets, 
  createSpreadsheet, 
  appendInvestigationRow, 
  readSpreadsheetData, 
  SpreadsheetItem, 
  SheetRowData,
  HEADERS 
} from "../services/googleSheets";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  accessToken: string | null;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  currentRecord: {
    number: string;
    raw: string;
    isValid: boolean;
    provider: string;
    country: string;
    links: {
      google: string;
      facebook: string;
      truecaller: string;
      getcontact: string;
    };
    timestamp: string;
    analysis?: {
      riskLevel: string;
      summary: string;
      redFlags: string[];
      recommendations: string[];
    } | null;
  } | null;
  historyRecords: any[];
  onSelectNumberToTrack?: (num: string) => void;
}

export const GoogleSheetsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  accessToken,
  onLogin,
  onLogout,
  currentRecord,
  historyRecords,
  onSelectNumberToTrack,
}) => {
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetItem[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string>("");
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [readingData, setReadingData] = useState(false);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>(HEADERS);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Destructive / Mutating Operation Confirmation State (MANDATORY per skill guidelines)
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"save" | "view" | "import">("save");

  // Fetch user spreadsheets when modal opens and accessToken is present
  useEffect(() => {
    if (isOpen && accessToken) {
      loadSpreadsheets();
    }
  }, [isOpen, accessToken]);

  const loadSpreadsheets = async () => {
    if (!accessToken) return;
    setLoadingSheets(true);
    setStatusMessage(null);
    try {
      const items = await listSpreadsheets(accessToken);
      setSpreadsheets(items);
      if (items.length > 0 && !selectedSheetId) {
        setSelectedSheetId(items[0].id);
        setSelectedSheetName(items[0].name);
        fetchPreviewData(items[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: err.message || "Gagal mengambil daftar spreadsheet dari Google Drive" });
    } finally {
      setLoadingSheets(false);
    }
  };

  const fetchPreviewData = async (sheetId: string) => {
    if (!accessToken || !sheetId) return;
    setReadingData(true);
    try {
      const data = await readSpreadsheetData(accessToken, sheetId);
      setPreviewHeaders(data.headers);
      setPreviewRows(data.rows);
    } catch (err: any) {
      console.error("Failed to load preview rows", err);
    } finally {
      setReadingData(false);
    }
  };

  const handleSelectSheet = (sheetId: string, sheetName: string) => {
    setSelectedSheetId(sheetId);
    setSelectedSheetName(sheetName);
    fetchPreviewData(sheetId);
  };

  // Create new spreadsheet with explicit confirmation
  const triggerCreateSpreadsheet = () => {
    setConfirmationDialog({
      isOpen: true,
      title: "Buat Google Spreadsheet Baru?",
      description: "Aplikasi akan membuat spreadsheet baru bernama 'Faiz V5 - Lacak Nomor Database' di Google Drive akun Anda dengan format kolom pelacakan OSINT.",
      actionLabel: "Buat Spreadsheet",
      onConfirm: async () => {
        if (!accessToken) return;
        setCreatingSheet(true);
        setStatusMessage(null);
        try {
          const newSheet = await createSpreadsheet(accessToken, "Faiz V5 - Lacak Nomor Database");
          setSelectedSheetId(newSheet.id);
          setSelectedSheetName(newSheet.title);
          await loadSpreadsheets();
          fetchPreviewData(newSheet.id);
          setStatusMessage({ type: "success", text: `Spreadsheet "${newSheet.title}" berhasil dibuat!` });
        } catch (err: any) {
          setStatusMessage({ type: "error", text: err.message || "Gagal membuat spreadsheet" });
        } finally {
          setCreatingSheet(false);
        }
      },
    });
  };

  // Convert a record to SheetRowData format
  const formatRecordToRow = (record: any): SheetRowData => {
    return {
      timestamp: record.timestamp || new Date().toISOString(),
      number: record.number || "-",
      raw: record.raw || "-",
      provider: record.provider || "-",
      valid: record.isValid ? "VALID" : "INVALID",
      country: record.country || "Indonesia",
      riskLevel: record.analysis?.riskLevel || "N/A",
      summary: record.analysis?.summary || "-",
      redFlags: record.analysis?.redFlags?.join("; ") || "-",
      links: `Google: ${record.links?.google || ""}; Getcontact: ${record.links?.getcontact || ""}`,
    };
  };

  // Save current record with user confirmation dialog
  const triggerSaveCurrentRecord = () => {
    if (!currentRecord) return;
    if (!selectedSheetId) {
      setStatusMessage({ type: "error", text: "Pilih atau buat spreadsheet terlebih dahulu." });
      return;
    }

    setConfirmationDialog({
      isOpen: true,
      title: "Simpan Target ke Google Sheets?",
      description: `Target nomor ${currentRecord.number} (${currentRecord.provider}) akan ditambahkan sebagai baris baru ke spreadsheet "${selectedSheetName}".`,
      actionLabel: "Konfirmasi Simpan",
      onConfirm: async () => {
        if (!accessToken) return;
        setSavingData(true);
        setStatusMessage(null);
        try {
          const rowData = formatRecordToRow(currentRecord);
          await appendInvestigationRow(accessToken, selectedSheetId, rowData);
          await fetchPreviewData(selectedSheetId);
          setStatusMessage({ type: "success", text: `Data nomor ${currentRecord.number} berhasil disimpan ke Google Sheets!` });
        } catch (err: any) {
          setStatusMessage({ type: "error", text: err.message || "Gagal menyimpan data ke spreadsheet" });
        } finally {
          setSavingData(false);
        }
      },
    });
  };

  // Save all history records with user confirmation dialog
  const triggerSaveAllHistory = () => {
    if (!historyRecords || historyRecords.length === 0) return;
    if (!selectedSheetId) {
      setStatusMessage({ type: "error", text: "Pilih atau buat spreadsheet terlebih dahulu." });
      return;
    }

    setConfirmationDialog({
      isOpen: true,
      title: `Simpan Semua Riwayat (${historyRecords.length} Target)?`,
      description: `Sebanyak ${historyRecords.length} riwayat nomor dari sesi ini akan ditambahkan ke spreadsheet "${selectedSheetName}".`,
      actionLabel: `Simpan ${historyRecords.length} Nomor`,
      onConfirm: async () => {
        if (!accessToken) return;
        setSavingData(true);
        setStatusMessage(null);
        try {
          for (const item of historyRecords) {
            const rowData = formatRecordToRow(item);
            await appendInvestigationRow(accessToken, selectedSheetId, rowData);
          }
          await fetchPreviewData(selectedSheetId);
          setStatusMessage({ type: "success", text: `Berhasil menyimpan ${historyRecords.length} rekaman ke Google Sheets!` });
        } catch (err: any) {
          setStatusMessage({ type: "error", text: err.message || "Gagal menyimpan riwayat ke spreadsheet" });
        } finally {
          setSavingData(false);
        }
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden cyber-border">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#161616]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20">
              <FileSpreadsheet className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Google Sheets Integration
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-mono">
                  OSINT Sync
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Hubungkan Google Drive & Google Sheets untuk menyimpan serta menganalisis hasil pelacakan nomor
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Section Header / Banner */}
        <div className="px-6 py-3 bg-[#0c0c0c] border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "User"} className="w-8 h-8 rounded-full border border-green-500/40" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold text-xs">
                  {user.displayName?.charAt(0) || "U"}
                </div>
              )}
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  {user.displayName || "Google User"}
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                </div>
                <div className="text-[11px] text-gray-400 font-mono">{user.email}</div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400">
              Masuk dengan akun Google untuk mengaktifkan sinkronisasi database Google Sheets.
            </div>
          )}

          <div className="flex items-center gap-3">
            {user ? (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Keluar
              </button>
            ) : (
              <GoogleSignInButton onClick={onLogin} />
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {statusMessage && (
            <div
              className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
                statusMessage.type === "success"
                  ? "bg-green-500/10 border-green-500/30 text-green-300"
                  : "bg-red-500/10 border-red-500/30 text-red-300"
              }`}
            >
              {statusMessage.type === "success" ? (
                <Check className="w-4 h-4 text-green-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {!user ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <Database className="w-12 h-12 text-gray-500" />
              </div>
              <h3 className="text-base font-bold text-white">Login Diperlukan</h3>
              <p className="text-xs text-gray-400 max-w-sm">
                Hubungkan akun Google Anda untuk membuat spreadsheet pelacakan, menyimpan log nomor target, dan melihat rekaman secara realtime.
              </p>
              <GoogleSignInButton onClick={onLogin} />
            </div>
          ) : (
            <>
              {/* Spreadsheet Selector & Creator */}
              <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-2">
                      Pilih Spreadsheet Target di Google Drive
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedSheetId}
                        onChange={(e) => {
                          const id = e.target.value;
                          const found = spreadsheets.find((s) => s.id === id);
                          if (found) handleSelectSheet(id, found.name);
                        }}
                        disabled={loadingSheets || spreadsheets.length === 0}
                        className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-500 flex-1"
                      >
                        {spreadsheets.length === 0 ? (
                          <option value="">(Belum ada spreadsheet ditemukan)</option>
                        ) : (
                          spreadsheets.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        onClick={loadSpreadsheets}
                        disabled={loadingSheets}
                        title="Segarkan daftar"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      >
                        <RefreshCw className={`w-4 h-4 ${loadingSheets ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={triggerCreateSpreadsheet}
                      disabled={creatingSheet}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                    >
                      {creatingSheet ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Buat Database Baru
                    </button>
                  </div>
                </div>

                {selectedSheetId && (
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-gray-400">
                    <span className="truncate">
                      Sheet Aktif: <strong className="text-gray-200">{selectedSheetName}</strong>
                    </span>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${selectedSheetId}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-green-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                    >
                      Buka di Google Sheets <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Sub-tabs */}
              <div className="flex border-b border-white/10 space-x-6 text-xs font-mono">
                <button
                  onClick={() => setActiveTab("save")}
                  className={`pb-3 font-semibold transition-colors flex items-center gap-2 border-b-2 ${
                    activeTab === "save"
                      ? "border-green-500 text-green-400"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Save className="w-4 h-4" /> Simpan Data
                </button>
                <button
                  onClick={() => {
                    setActiveTab("view");
                    if (selectedSheetId) fetchPreviewData(selectedSheetId);
                  }}
                  className={`pb-3 font-semibold transition-colors flex items-center gap-2 border-b-2 ${
                    activeTab === "view"
                      ? "border-green-500 text-green-400"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Table className="w-4 h-4" /> Lihat Isi Sheet ({previewRows.length} Baris)
                </button>
                <button
                  onClick={() => setActiveTab("import")}
                  className={`pb-3 font-semibold transition-colors flex items-center gap-2 border-b-2 ${
                    activeTab === "import"
                      ? "border-green-500 text-green-400"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <ArrowRight className="w-4 h-4" /> Import ke Pencarian
                </button>
              </div>

              {/* Tab 1: Save Target */}
              {activeTab === "save" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Current Active Number */}
                    <div className="p-4 bg-[#141414] rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">
                          Target Terbuka Saat Ini
                        </div>
                        {currentRecord ? (
                          <div>
                            <div className="text-lg font-mono font-bold text-white">{currentRecord.number}</div>
                            <div className="text-xs text-gray-400">{currentRecord.provider} • {currentRecord.country}</div>
                            {currentRecord.analysis && (
                              <div className="mt-2 text-[11px] text-purple-400 bg-purple-500/10 px-2 py-1 rounded inline-block">
                                Risk: {currentRecord.analysis.riskLevel}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 italic py-2">
                            Belum ada nomor yang dicari. Lakukan pencarian nomor terlebih dahulu.
                          </div>
                        )}
                      </div>
                      <button
                        onClick={triggerSaveCurrentRecord}
                        disabled={!currentRecord || savingData || !selectedSheetId}
                        className="w-full py-2.5 px-4 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        {savingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Simpan Nomor Ini ke Sheet
                      </button>
                    </div>

                    {/* Batch History Session */}
                    <div className="p-4 bg-[#141414] rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">
                          Riwayat Sesi Aplikasi
                        </div>
                        <div className="text-lg font-mono font-bold text-white">
                          {historyRecords.length} Target Tersedia
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Simpan seluruh riwayat pelacakan nomor dalam sesi ini sekaligus ke dalam Google Sheet.
                        </p>
                      </div>
                      <button
                        onClick={triggerSaveAllHistory}
                        disabled={historyRecords.length === 0 || savingData || !selectedSheetId}
                        className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/10"
                      >
                        {savingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                        Ekspor Semua ({historyRecords.length}) Riwayat
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: View Sheet Rows */}
              {activeTab === "view" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Pratinjau data tersimpan pada spreadsheet:</span>
                    <button
                      onClick={() => selectedSheetId && fetchPreviewData(selectedSheetId)}
                      disabled={readingData}
                      className="text-gray-400 hover:text-white flex items-center gap-1 font-mono text-[11px]"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${readingData ? "animate-spin" : ""}`} /> Refresh Data
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-72 border border-white/10 rounded-2xl bg-[#0d0d0d]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#181818] text-gray-400 font-mono uppercase text-[10px] sticky top-0 border-b border-white/10">
                        <tr>
                          {previewHeaders.map((h, i) => (
                            <th key={i} className="p-3 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {readingData ? (
                          <tr>
                            <td colSpan={previewHeaders.length} className="text-center py-8 text-gray-500 font-mono">
                              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-green-500" />
                              Memuat data dari Google Sheets...
                            </td>
                          </tr>
                        ) : previewRows.length === 0 ? (
                          <tr>
                            <td colSpan={previewHeaders.length} className="text-center py-8 text-gray-500 font-mono">
                              Belum ada baris rekaman di spreadsheet ini.
                            </td>
                          </tr>
                        ) : (
                          previewRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors font-mono">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-3 whitespace-nowrap max-w-[200px] truncate text-gray-300">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Import numbers from sheet into tracker */}
              {activeTab === "import" && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400">
                    Pilih nomor yang tersimpan di spreadsheet untuk dimuat langsung ke pelacak Faiz V5:
                  </p>
                  <div className="max-h-60 overflow-y-auto space-y-2 border border-white/10 rounded-2xl p-3 bg-[#0d0d0d]">
                    {previewRows.length === 0 ? (
                      <div className="text-xs text-gray-500 text-center py-6">
                        Tidak ada data nomor pada spreadsheet saat ini.
                      </div>
                    ) : (
                      previewRows.map((row, idx) => {
                        const phoneNum = row[1] || row[2] || "";
                        const provider = row[3] || "Unknown";
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-green-500/30 transition-all"
                          >
                            <div>
                              <div className="text-xs font-mono font-bold text-white">{phoneNum}</div>
                              <div className="text-[11px] text-gray-400">{provider} • {row[0] || ""}</div>
                            </div>
                            <button
                              onClick={() => {
                                if (onSelectNumberToTrack && phoneNum) {
                                  onSelectNumberToTrack(phoneNum);
                                  onClose();
                                }
                              }}
                              className="px-3 py-1 bg-green-500/20 hover:bg-green-500 text-green-300 hover:text-black font-bold text-xs rounded-lg transition-all"
                            >
                              Lacak Nomor Ini
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#161616] flex items-center justify-between">
          <div className="text-[11px] text-gray-500 font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-green-500" /> Token disimpan secara in-memory (aman)
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Destructive / Mutating operations (MANDATORY per skill) */}
      {confirmationDialog && confirmationDialog.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#1a1a1a] border border-white/20 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-500/20 text-green-400">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">{confirmationDialog.title}</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {confirmationDialog.description}
            </p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setConfirmationDialog(null)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = confirmationDialog.onConfirm;
                  setConfirmationDialog(null);
                  await action();
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-green-500 hover:bg-green-600 text-black transition-all"
              >
                {confirmationDialog.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
