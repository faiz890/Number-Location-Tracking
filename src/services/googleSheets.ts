export interface SpreadsheetItem {
  id: string;
  name: string;
  modifiedTime?: string;
}

export interface SheetRowData {
  timestamp: string;
  number: string;
  raw: string;
  provider: string;
  valid: string;
  country: string;
  riskLevel: string;
  summary: string;
  redFlags: string;
  links: string;
}

export const HEADERS = [
  "Timestamp",
  "Phone Number",
  "Raw Number",
  "Provider",
  "Validity",
  "Country",
  "Risk Level",
  "AI Threat Summary",
  "Red Flags",
  "OSINT Links",
];

/**
 * List existing Google Sheets from user's Drive
 */
export async function listSpreadsheets(accessToken: string): Promise<SpreadsheetItem[]> {
  const url = `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'+and+trashed=false&fields=files(id,name,modifiedTime)&orderBy=modifiedTime+desc&pageSize=20`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch spreadsheets (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Create a new Google Spreadsheet with predefined OSINT investigation columns
 */
export async function createSpreadsheet(
  accessToken: string,
  title = "Faiz V5 - Lacak Nomor Database"
): Promise<{ id: string; url: string; title: string }> {
  const url = "https://sheets.googleapis.com/v4/spreadsheets";
  const body = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: "Hasil Pelacakan",
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: HEADERS.map((h) => ({
                  userEnteredValue: { stringValue: h },
                  userEnteredFormat: {
                    textFormat: { bold: true, foregroundColor: { red: 0.1, green: 0.8, blue: 0.3 } },
                    backgroundColor: { red: 0.05, green: 0.05, blue: 0.05 },
                  },
                })),
              },
            ],
          },
        ],
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to create spreadsheet (${res.status})`);
  }

  const data = await res.json();
  return {
    id: data.spreadsheetId,
    url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    title: data.properties?.title || title,
  };
}

/**
 * Get spreadsheet sheet names (avoid hardcoding 'Sheet1')
 */
export async function getSpreadsheetDetails(accessToken: string, spreadsheetId: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to inspect spreadsheet (${res.status})`);
  }

  const data = await res.json();
  const sheets = data.sheets || [];
  const firstSheetTitle = sheets[0]?.properties?.title || "Sheet1";

  return {
    title: data.properties?.title || "Spreadsheet",
    sheets: sheets.map((s: any) => s.properties?.title as string),
    firstSheetTitle,
  };
}

/**
 * Append investigation row to Google Sheet
 */
export async function appendInvestigationRow(
  accessToken: string,
  spreadsheetId: string,
  rowData: SheetRowData
): Promise<void> {
  const details = await getSpreadsheetDetails(accessToken, spreadsheetId);
  const targetSheet = encodeURIComponent(details.firstSheetTitle);

  const values = [
    [
      rowData.timestamp,
      rowData.number,
      rowData.raw,
      rowData.provider,
      rowData.valid,
      rowData.country,
      rowData.riskLevel,
      rowData.summary,
      rowData.redFlags,
      rowData.links,
    ],
  ];

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${targetSheet}!A:J:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(appendUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to append row to spreadsheet (${res.status})`);
  }
}

/**
 * Read recent rows from spreadsheet for preview
 */
export async function readSpreadsheetData(
  accessToken: string,
  spreadsheetId: string,
  maxRows = 30
): Promise<{ headers: string[]; rows: string[][] }> {
  const details = await getSpreadsheetDetails(accessToken, spreadsheetId);
  const targetSheet = encodeURIComponent(details.firstSheetTitle);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${targetSheet}!A1:J${maxRows}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to read sheet data (${res.status})`);
  }

  const data = await res.json();
  const allValues = data.values || [];

  if (allValues.length === 0) {
    return { headers: HEADERS, rows: [] };
  }

  const headers = allValues[0];
  const rows = allValues.slice(1);

  return { headers, rows };
}
