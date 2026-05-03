export type ReadingTestType = "academic" | "general";

type BandCutoff = { minRaw: number; band: number };

const LISTENING_TABLE: BandCutoff[] = [
  { minRaw: 39, band: 9 },
  { minRaw: 37, band: 8.5 },
  { minRaw: 35, band: 8 },
  { minRaw: 32, band: 7.5 },
  { minRaw: 30, band: 7 },
  { minRaw: 26, band: 6.5 },
  { minRaw: 23, band: 6 },
  { minRaw: 18, band: 5.5 },
  { minRaw: 16, band: 5 },
  { minRaw: 13, band: 4.5 },
  { minRaw: 10, band: 4 },
  { minRaw: 8, band: 3.5 },
  { minRaw: 6, band: 3 },
  { minRaw: 4, band: 2.5 },
  { minRaw: 0, band: 2 },
];

const READING_ACADEMIC_TABLE: BandCutoff[] = [
  { minRaw: 39, band: 9 },
  { minRaw: 37, band: 8.5 },
  { minRaw: 35, band: 8 },
  { minRaw: 33, band: 7.5 },
  { minRaw: 30, band: 7 },
  { minRaw: 27, band: 6.5 },
  { minRaw: 23, band: 6 },
  { minRaw: 19, band: 5.5 },
  { minRaw: 15, band: 5 },
  { minRaw: 13, band: 4.5 },
  { minRaw: 10, band: 4 },
  { minRaw: 8, band: 3.5 },
  { minRaw: 6, band: 3 },
  { minRaw: 4, band: 2.5 },
  { minRaw: 0, band: 2 },
];

const READING_GENERAL_TABLE: BandCutoff[] = [
  { minRaw: 40, band: 9 },
  { minRaw: 39, band: 8.5 },
  { minRaw: 37, band: 8 },
  { minRaw: 36, band: 7.5 },
  { minRaw: 34, band: 7 },
  { minRaw: 32, band: 6.5 },
  { minRaw: 30, band: 6 },
  { minRaw: 27, band: 5.5 },
  { minRaw: 23, band: 5 },
  { minRaw: 19, band: 4.5 },
  { minRaw: 15, band: 4 },
  { minRaw: 12, band: 3.5 },
  { minRaw: 9, band: 3 },
  { minRaw: 6, band: 2.5 },
  { minRaw: 3, band: 2 },
  { minRaw: 0, band: 1 },
];

function bandFromTable(rawScore: number, table: BandCutoff[]): number {
  const s = Math.max(0, Math.min(40, Math.floor(rawScore)));
  for (const row of table) {
    if (s >= row.minRaw) return row.band;
  }
  return table[table.length - 1]?.band ?? 0;
}

export function calculateListeningBand(rawScore: number): number {
  return bandFromTable(rawScore, LISTENING_TABLE);
}

export function calculateReadingBand(rawScore: number, testType: ReadingTestType): number {
  return bandFromTable(rawScore, testType === "general" ? READING_GENERAL_TABLE : READING_ACADEMIC_TABLE);
}

export function calculateOverallBand(scores: {
  listening?: number;
  reading?: number;
  writing?: number;
  speaking?: number;
}): number {
  const values = Object.values(scores).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (values.length === 0) return 0;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.round(avg * 2) / 2;
}

export const BAND_TABLES = {
  listening: LISTENING_TABLE,
  readingAcademic: READING_ACADEMIC_TABLE,
  readingGeneral: READING_GENERAL_TABLE,
};

