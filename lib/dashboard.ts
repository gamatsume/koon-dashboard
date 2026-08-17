import fs from "fs";
import os from "os";
import path from "path";
import matter from "gray-matter";
import { differenceInCalendarDays, format, getDayOfYear, isValid } from "date-fns";

/* ========== 設定 ========== */

export type ViewType =
  | "checklist"
  | "document"
  | "schedule"
  | "quote"
  | "feed"
  | "table"
  | "note";

export type ViewConfig = { type: ViewType; label: string };

export type DashboardConfig = {
  dbPath: string;
  views: Record<string, ViewConfig>;
  layout: { top: string[]; middle: string[]; bottom: string[] };
};

export function loadConfig(): DashboardConfig {
  const raw = fs.readFileSync(path.join(process.cwd(), "dashboard.config.json"), "utf-8");
  return JSON.parse(raw) as DashboardConfig;
}

/** DB領域のルート。環境変数 DASHBOARD_DB_PATH が設定ファイルより優先。 */
export function dbRoot(config?: DashboardConfig): string {
  const raw = process.env.DASHBOARD_DB_PATH ?? (config ?? loadConfig()).dbPath;
  const expanded = raw.replace(/^~(?=$|\/)/, os.homedir());
  return path.resolve(process.cwd(), expanded);
}

/* ========== ノート読み込み(寛容パース) ========== */

export type DbNote = {
  folder: string;
  fileName: string; // 拡張子なし
  slug: string; // folder/encodeURIComponent(fileName)
  title: string;
  date: string | null; // yyyy-MM-dd(ソート用)
  dateLabel: string | null; // yyyy年M月d日(表示用)
  meta: Record<string, unknown>;
  content: string;
  excerpt: string;
  broken: boolean; // frontmatter解析に失敗した等
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return isValid(d) ? d : null;
}

function excerptFrom(content: string): string {
  const line = content
    .trim()
    .split("\n")
    .find((l) => l.trim().length > 0 && !l.trim().startsWith("#"));
  return (line ?? "").replace(/^[-*]\s*(\[[ xX]\]\s*)?/, "").trim();
}

function parseNote(folder: string, filePath: string): DbNote {
  const fileName = path.basename(filePath, ".md");
  const raw = fs.readFileSync(filePath, "utf-8");

  let meta: Record<string, unknown> = {};
  let content = raw;
  let broken = false;
  try {
    const parsed = matter(raw);
    meta = parsed.data ?? {};
    content = parsed.content;
  } catch {
    broken = true; // frontmatterが壊れていても生の本文として表示する
  }

  const dateSource =
    toDate(meta.date) ?? toDate((fileName.match(/(\d{4}-\d{2}-\d{2})/) ?? [])[1]);

  return {
    folder,
    fileName,
    slug: `${folder}/${encodeURIComponent(fileName)}`,
    title: String(meta.title ?? meta.subject ?? fileName),
    date: dateSource ? format(dateSource, "yyyy-MM-dd") : null,
    dateLabel: dateSource ? format(dateSource, "yyyy年M月d日") : null,
    meta,
    content,
    excerpt: excerptFrom(content),
    broken,
  };
}

/** フォルダ直下の.mdを読み込む(README.mdは除外)。存在しなければ空配列。 */
export function getFolderNotes(folder: string, config?: DashboardConfig): DbNote[] {
  const dir = path.join(dbRoot(config), folder);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md") && e.name !== "README.md")
    .map((e) => {
      try {
        return parseNote(folder, path.join(dir, e.name));
      } catch {
        return null;
      }
    })
    .filter((n): n is DbNote => n !== null);
}

export function getDbNoteBySlug(parts: string[]): DbNote | null {
  const [folder, ...rest] = parts;
  if (!folder || rest.length === 0) return null;
  const fileName = rest.map(decodeURIComponent).join("/");
  const filePath = path.join(dbRoot(), folder, `${fileName}.md`);
  if (!filePath.startsWith(dbRoot()) || !fs.existsSync(filePath)) return null;
  try {
    return parseNote(folder, filePath);
  } catch {
    return null;
  }
}

/* ========== ビュー型ごとの整形 ========== */

// checklist型: 全ファイルのチェックボックスを集計
export type ChecklistItem = { text: string; done: boolean; source: string };

export function checklistFrom(notes: DbNote[]): { items: ChecklistItem[]; done: number } {
  const items: ChecklistItem[] = [];
  for (const note of notes) {
    for (const line of note.content.split("\n")) {
      const m = line.match(/^\s*[-*]\s*\[([ xX])\]\s+(.+)$/);
      if (m) items.push({ text: m[2].trim(), done: m[1] !== " ", source: note.fileName });
    }
  }
  return { items, done: items.filter((i) => i.done).length };
}

// document型: 最新(ファイル名降順)の1件
export function latestOf(notes: DbNote[]): DbNote | null {
  if (notes.length === 0) return null;
  return [...notes].sort((a, b) => b.fileName.localeCompare(a.fileName))[0];
}

// schedule型: 日付昇順+残り日数
export type ScheduleEntry = { note: DbNote; daysLeft: number | null };

export function scheduleFrom(notes: DbNote[]): ScheduleEntry[] {
  const today = new Date();
  return [...notes]
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"))
    .map((note) => ({
      note,
      daysLeft: note.date ? differenceInCalendarDays(new Date(note.date), today) : null,
    }));
}

// quote型: 日替わりで1件
export function quoteOfToday(notes: DbNote[]): DbNote | null {
  if (notes.length === 0) return null;
  const sorted = [...notes].sort((a, b) => a.fileName.localeCompare(b.fileName));
  return sorted[getDayOfYear(new Date()) % sorted.length];
}

// feed型: 日付降順
export function feedFrom(notes: DbNote[]): DbNote[] {
  return [...notes].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

// table型: frontmatter項目の一覧表(列は出現順の和集合)
export type TableData = { columns: string[]; rows: { note: DbNote; cells: string[] }[] };

export function tableFrom(notes: DbNote[]): TableData {
  const columns: string[] = [];
  for (const note of notes) {
    for (const key of Object.keys(note.meta)) {
      if (key !== "title" && !columns.includes(key)) columns.push(key);
    }
  }
  const rows = [...notes]
    .sort((a, b) => a.title.localeCompare(b.title, "ja"))
    .map((note) => ({
      note,
      cells: columns.map((c) => (note.meta[c] == null ? "" : String(note.meta[c]))),
    }));
  return { columns, rows };
}

export function todayLabel(): string {
  const d = new Date();
  const week = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${format(d, "yyyy年M月d日")}(${week})`;
}
