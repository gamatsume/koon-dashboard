import fs from "fs";
import os from "os";
import path from "path";
import matter from "gray-matter";
import {
  addDays,
  differenceInCalendarDays,
  format,
  getDayOfYear,
  isValid,
  parseISO,
  startOfWeek,
  subDays,
} from "date-fns";

/* ========== 設定 ========== */

/**
 * リポジトリ側に置く設定はデータの場所だけ。
 * カードの見出し・ビューの種類・幅などは DB 側（フォルダ名と `_view.md`）で決める。
 */
export type DashboardConfig = { dbPath: string };

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

/* ========== ビューの種類 ========== */

/** この並びがカードの並び順の初期値にもなる（ドラッグで並べ替えるまで） */
export const VIEW_TYPES = [
  "checklist",
  "habit",
  "document",
  "quote",
  "schedule",
  "feed",
  "note",
  "table",
] as const;

export type ViewType = (typeof VIEW_TYPES)[number];
export type Width = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * `view:` に書ける別名、width を書かなかったときの幅、画面に出す説明。
 *
 * 「表示のしかた」ページと設定画面は、どちらもここを読む。
 * 挙動を変えたらここも直すこと。説明が実装とずれると、どちらのページも嘘になる。
 */
const VIEWS: Record<
  ViewType,
  { aliases: string[]; defaultWidth: Width; items: string; body: string }
> = {
  checklist: {
    aliases: ["チェックリスト"],
    defaultWidth: 2,
    items: "全部",
    body: "「- [ ]」の行だけ。他は出ない",
  },
  habit: {
    aliases: ["習慣"],
    defaultWidth: 2,
    items: "1日ぶんずつ（既定は今日。マス目には全部の記録を使う）",
    body: "「- [ ]」の行だけ。他は出ない",
  },
  document: {
    aliases: ["ドキュメント", "文書"],
    defaultWidth: 2,
    items: "1件ずつ（既定は最新）",
    body: "全文",
  },
  quote: {
    aliases: ["格言"],
    defaultWidth: 2,
    items: "1件（日替わり）",
    body: "全文",
  },
  schedule: {
    aliases: ["予定"],
    defaultWidth: 6,
    items: "今日以降と日付なし",
    body: "使わない",
  },
  feed: {
    aliases: ["フィード"],
    defaultWidth: 2,
    items: "全部",
    body: "最初の1行だけ",
  },
  note: {
    aliases: ["メモ", "一覧"],
    defaultWidth: 2,
    items: "全部",
    body: "最初の1行だけ",
  },
  table: {
    aliases: ["表", "テーブル"],
    defaultWidth: 6,
    items: "全部",
    body: "使わない",
  },
};

/**
 * document と quote は、どちらも「1件を全文」で見分けがつきにくい。
 * 違いは選び方だけなので、表の下に添えて補う。
 */
export const VIEW_PICK_NOTE =
  "document と quote は、どちらも1件を全文で出します。違うのは選び方だけです。" +
  "document は既定で最新の1件を出し、送り操作で過去の分も見られます。" +
  "quote は毎日1件ずつ順ぐりに変わり、フォルダ内のすべてがいずれ出ます。";

export type ViewOption = {
  type: ViewType;
  name: string;
  aliases: string[];
  items: string;
  body: string;
  defaultWidth: Width;
};

/** 「表示のしかた」ページと設定画面に出すビューの一覧 */
export function viewOptions(): ViewOption[] {
  return VIEW_TYPES.map((type) => ({
    type,
    name: VIEWS[type].aliases[0],
    aliases: VIEWS[type].aliases,
    items: VIEWS[type].items,
    body: VIEWS[type].body,
    defaultWidth: VIEWS[type].defaultWidth,
  }));
}

function normalizeViewType(value: unknown): ViewType | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  const lower = v.toLowerCase();
  for (const type of VIEW_TYPES) {
    if (type === lower || VIEWS[type].aliases.includes(v)) return type;
  }
  return null;
}

/* ========== プロパティ ========== */

/** 左にあるものほど優先。どれも無ければファイル名 */
const TITLE_KEYS = ["title", "name", "subject"];
/** 左にあるものほど優先 */
const SOURCE_KEYS = ["source", "from"];

/** 役割が決まっているプロパティ。show に書かなくても表示される */
export const ROLE_KEYS = [...TITLE_KEYS, "date", "url", ...SOURCE_KEYS, "author"];

/** 画面表示用の文字列にする。日付は yyyy-MM-dd、リストはカンマ区切り */
export function formatValue(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return isValid(value) ? format(value, "yyyy-MM-dd") : "";
  if (Array.isArray(value)) return value.map(formatValue).filter(Boolean).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim();
}

function firstValue(meta: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = formatValue(meta[key]);
    if (v) return v;
  }
  return null;
}

/* ========== ノート読み込み(寛容パース) ========== */

export type DbNote = {
  folder: string;
  fileName: string; // 拡張子なし
  slug: string; // URL 用。フォルダ名とファイル名をそれぞれエンコードしたもの
  title: string;
  date: string | null; // yyyy-MM-dd(ソート用)
  dateLabel: string | null; // yyyy年M月d日(表示用)
  source: string | null;
  url: string | null; // http(s) のものだけ
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

/**
 * ファイル名から日付を拾う。`2026-11-05` と `20261105` のどちらも読む。
 *
 * 8桁は先頭にあるものだけを見る。本文的な数字（`1500シネマ` など）を
 * うっかり日付として拾わないようにするため。
 */
function dateFromFileName(fileName: string): Date | null {
  const hyphen = fileName.match(/(\d{4}-\d{2}-\d{2})/);
  if (hyphen) return toDate(hyphen[1]);
  const plain = fileName.match(/^(\d{4})(\d{2})(\d{2})(?!\d)/);
  return plain ? toDate(`${plain[1]}-${plain[2]}-${plain[3]}`) : null;
}

/**
 * @param folder カードになっているフォルダ名
 * @param relPath そのフォルダから見た `.md` までの相対パス（`過去/2026-11-02.md` など）
 */
function parseNote(folder: string, filePath: string, relPath: string): DbNote {
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

  const dateSource = toDate(meta.date) ?? dateFromFileName(fileName);
  const url = formatValue(meta.url);

  return {
    folder,
    fileName,
    // 下のフォルダにあるノートも指せるように、区間ごとに符号化してつなぐ
    slug: [folder, ...relPath.slice(0, -3).split(path.sep)].map(encodeURIComponent).join("/"),
    title: firstValue(meta, TITLE_KEYS) ?? fileName,
    date: dateSource ? format(dateSource, "yyyy-MM-dd") : null,
    dateLabel: dateSource ? format(dateSource, "yyyy年M月d日") : null,
    source: firstValue(meta, SOURCE_KEYS),
    // javascript: などを踏ませないため、外部リンクにするのは http(s) だけ
    url: /^https?:\/\//i.test(url) ? url : null,
    meta,
    content,
    excerpt: excerptFrom(content),
    broken,
  };
}

/**
 * 新しいものが上。日付があればそれで、無ければファイル名で比べる。
 *
 * ファイル名から拾える日付は `YYYY-MM-DD` 形式だけなので（`2026_1019週` などは拾えない）、
 * 日付を持たないノートもファイル名で新しい順になるようにしておく。
 */
function byNewestFirst(a: DbNote, b: DbNote): number {
  return (b.date ?? "").localeCompare(a.date ?? "") || b.fileName.localeCompare(a.fileName, "ja");
}

/** フォルダの表示設定ノート。ノートとしては読まない */
const VIEW_SETTINGS_FILE = "_view.md";

/**
 * ノートとして読む .md か。
 *
 * `_` で始まるものは設定やひな形とみなして読まない（`_view.md` `_template.md` など）。
 * フォルダ名の規則と揃えてある。Obsidian で名前を付けると `.md` が自動で付くので
 * `_view.md.md` のような取りこぼしが起きるが、その場合もノートとしては出さない。
 */
function isNoteFile(name: string): boolean {
  return name.endsWith(".md") && !name.startsWith("_") && name !== "README.md";
}

/**
 * ノートを探しに入るフォルダか。
 *
 * ファイルの規則と揃えてある。`_下書き` のように `_` を付ければ、
 * カードに出したくないノートの置き場にできる。
 */
function isNoteFolder(name: string): boolean {
  return !name.startsWith("_") && !name.startsWith(".");
}

/** これ以上は下に入らない。入れ子の深いフォルダを延々とたどらないための歯止め */
const MAX_NOTE_DEPTH = 5;

/**
 * カードのフォルダにある .md を読み込む(README.md と設定ノートは除外)。
 *
 * 下のフォルダもたどる。`過去/` のような入れ物に古いノートを移しても、
 * 集計や送り操作から外れないようにするため。存在しなければ空配列。
 */
export function getFolderNotes(folder: string, config?: DashboardConfig): DbNote[] {
  const base = path.join(dbRoot(config), folder);
  if (!fs.existsSync(base)) return [];

  const notes: DbNote[] = [];
  const walk = (dir: string, rel: string, depth: number) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // シンボリックリンクは isDirectory() が false になるので、輪にはならない
        if (depth > 0 && isNoteFolder(entry.name)) walk(full, path.join(rel, entry.name), depth - 1);
      } else if (entry.isFile() && isNoteFile(entry.name)) {
        try {
          notes.push(parseNote(folder, full, path.join(rel, entry.name)));
        } catch {
          // 読めないノートは飛ばす
        }
      }
    }
  };
  walk(base, "", MAX_NOTE_DEPTH);

  return notes.sort(byNewestFirst);
}

/* ========== URL ========== */

/** URL の1区間を元の名前に戻す。すでにデコード済みで渡されても壊れないようにする */
export function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function isSafeSegment(name: string): boolean {
  return (
    name.length > 0 && name !== "." && name !== ".." && !name.includes("/") && !name.includes("\\")
  );
}

export function categoryHref(folder: string): string {
  return `/view/${encodeURIComponent(folder)}`;
}

export function getDbNoteBySlug(parts: string[]): DbNote | null {
  if (parts.length < 2) return null;
  const decoded = parts.map(decodeSegment);
  if (!decoded.every(isSafeSegment)) return null;

  const [folder, ...rest] = decoded;
  const subFolders = rest.slice(0, -1);
  const fileName = rest[rest.length - 1];
  // 一覧で読むときと同じ決まりで絞る。一覧に出ないノートはここからも開けない
  if (!isCategoryFolderName(folder) || !subFolders.every(isNoteFolder)) return null;
  if (!isNoteFile(`${fileName}.md`)) return null;

  const relPath = path.join(...subFolders, `${fileName}.md`);
  const root = dbRoot();
  const filePath = path.join(root, folder, relPath);
  if (!filePath.startsWith(root + path.sep) || !fs.existsSync(filePath)) return null;
  try {
    return parseNote(folder, filePath, relPath);
  } catch {
    return null;
  }
}

/* ========== カテゴリ(フォルダ = カード) ========== */

export type ViewSettings = {
  view: ViewType;
  hasSettingsFile: boolean;
  width: Width;
  show: string[];
  hidden: boolean;
  warnings: string[];
};

export type Category = {
  folder: string;
  label: string; // フォルダ名そのもの
  settings: ViewSettings;
  notes: DbNote[];
};

function toWidth(value: unknown): Width | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 6 ? (n as Width) : null;
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => formatValue(v)).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function readViewSettings(dir: string): ViewSettings {
  const defaults: ViewSettings = {
    view: "note",
    hasSettingsFile: false,
    width: VIEWS.note.defaultWidth,
    show: [],
    hidden: false,
    warnings: [],
  };

  const file = path.join(dir, VIEW_SETTINGS_FILE);
  if (!fs.existsSync(file)) return defaults;

  let meta: Record<string, unknown>;
  try {
    meta = matter(fs.readFileSync(file, "utf-8")).data ?? {};
  } catch {
    return {
      ...defaults,
      hasSettingsFile: true,
      warnings: ["設定ノートのプロパティを読み取れませんでした。メモとして表示しています。"],
    };
  }

  const warnings: string[] = [];

  let view: ViewType = "note";
  if (meta.view != null && meta.view !== "") {
    const normalized = normalizeViewType(meta.view);
    if (normalized) view = normalized;
    else warnings.push(`view の値「${formatValue(meta.view)}」は不明です。メモとして表示しています。`);
  }

  let width = VIEWS[view].defaultWidth;
  if (meta.width != null && meta.width !== "") {
    const w = toWidth(meta.width);
    if (w) width = w;
    else warnings.push(`width は 1〜6 で指定してください（「${formatValue(meta.width)}」は無視しました）。`);
  }

  const show = toStringList(meta.show);
  if (view === "checklist" && show.length > 0) {
    warnings.push("チェックリストでは show は使えません。");
  }

  return { view, hasSettingsFile: true, width, show, hidden: meta.hidden === true, warnings };
}

function isCategoryFolderName(name: string): boolean {
  return !name.startsWith(".") && !name.startsWith("_");
}

function buildCategory(root: string, folder: string): Category {
  return {
    folder,
    label: folder,
    settings: readViewSettings(path.join(root, folder)),
    notes: getFolderNotes(folder),
  };
}

/**
 * DB直下のフォルダをカードとして列挙する。
 * `_` や `.` で始まるフォルダ、ノートも設定ノートも無いフォルダ（画像置き場など）は出さない。
 */
export function listCategories({ includeHidden = false } = {}): Category[] {
  const root = dbRoot();
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && isCategoryFolderName(e.name))
    .map((e) => buildCategory(root, e.name))
    .filter((c) => c.settings.hasSettingsFile || c.notes.length > 0)
    .filter((c) => includeHidden || !c.settings.hidden)
    .sort(
      (a, b) =>
        VIEW_TYPES.indexOf(a.settings.view) - VIEW_TYPES.indexOf(b.settings.view) ||
        a.folder.localeCompare(b.folder, "ja"),
    );
}

/** 1フォルダ分。非表示に設定したものも返す */
export function getCategory(folder: string): Category | null {
  if (!isSafeSegment(folder) || !isCategoryFolderName(folder)) return null;
  const root = dbRoot();
  const dir = path.join(root, folder);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null;
  return buildCategory(root, folder);
}

/* ========== プロパティの表示 ========== */

export type PropertyEntry = { key: string; value: string };

/** 設定ノートの show に書いたプロパティのうち、値のあるもの */
export function shownProperties(note: DbNote, show: string[]): PropertyEntry[] {
  return show
    .map((key) => ({ key, value: formatValue(note.meta[key]) }))
    .filter((p) => p.value !== "");
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

// habit型: 日付ごとのノートを1日分の記録として読み、今日の分と続き具合を出す
export type HabitDay = { date: string; done: number; total: number };
export type HabitCell = { date: string; day: HabitDay | null; future: boolean };

/** タスク1つぶんの成績。出てこなかった日は数えない（週1のタスクでも連続が途切れない） */
export type HabitTask = {
  text: string;
  /** 直近の出番から数えて、続けてできている回数 */
  streak: number;
  done: number;
  appeared: number;
};

/**
 * 画面に渡す習慣の集計。
 * クライアント側のタブで使うので、Map を持たせずそのまま渡せる形にしてある。
 */
/** 1日ぶんの記録。日付を前後に動かして1日ずつ見る */
export type HabitEntry = {
  date: string;
  /** 送り操作に出す見出し。`2026年11月5日(水)` */
  label: string;
  items: ChecklistItem[];
  done: number;
  total: number;
};

export type HabitStats = {
  /** 記録のある日。新しい順。記録の無い日は入らない */
  days: HabitEntry[];
  /** 今日の日付。既定でこの日を開く。記録が無ければ days には入っていない */
  todayDate: string;
  /** マス目。週ごとの列 */
  cells: HabitCell[][];
  /** 棒グラフ用。直近ぶんを日付の昇順で */
  bars: HabitDay[];
  /** 全部できた日が、今日（まだなら昨日）から何日続いているか */
  streak: number;
  completedDays: number;
  recordedDays: number;
  tasks: HabitTask[];
};

export function habitStats(
  notes: DbNote[],
  { weeks = 17, barDays = 30 } = {},
): HabitStats {
  // 日付ごとの項目。日付の読めないノートは記録として数えない
  const itemsByDate = new Map<string, ChecklistItem[]>();
  for (const note of notes) {
    // 同じ日付のノートが複数あっても1日は1枚ぶん。新しい順で先に来たほうを使う
    if (!note.date || itemsByDate.has(note.date)) continue;
    const { items } = checklistFrom([note]);
    if (items.length > 0) itemsByDate.set(note.date, items);
  }

  const dayOf = (items: ChecklistItem[], date: string): HabitDay => ({
    date,
    done: items.filter((i) => i.done).length,
    total: items.length,
  });
  const byDate = new Map<string, HabitDay>(
    [...itemsByDate].map(([date, items]) => [date, dayOf(items, date)]),
  );

  const todayKey = format(new Date(), "yyyy-MM-dd");

  const isComplete = (key: string) => {
    const day = byDate.get(key);
    return !!day && day.total > 0 && day.done === day.total;
  };

  // 今日がまだ終わっていないうちは昨日から数える。朝に毎回 0日 と出ないようにするため
  let cursor = isComplete(todayKey) ? new Date() : subDays(new Date(), 1);
  let streak = 0;
  while (isComplete(format(cursor, "yyyy-MM-dd"))) {
    streak++;
    cursor = subDays(cursor, 1);
  }

  // マス目: 月曜はじまりの週を1列にする
  const gridStart = subDays(startOfWeek(new Date(), { weekStartsOn: 1 }), (weeks - 1) * 7);
  const cells = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const key = format(addDays(gridStart, w * 7 + d), "yyyy-MM-dd");
      return { date: key, day: byDate.get(key) ?? null, future: key > todayKey };
    }),
  );

  // 棒グラフ: 記録のある日だけを直近から
  const bars = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-barDays);

  // タスク別: 新しい日から順に、出番のあった日だけを見る
  const datesDesc = [...itemsByDate.keys()].sort((a, b) => b.localeCompare(a));
  const names: string[] = [];
  for (const date of [...datesDesc].reverse()) {
    for (const item of itemsByDate.get(date) ?? []) {
      if (!names.includes(item.text)) names.push(item.text);
    }
  }

  const tasks: HabitTask[] = names.map((text) => {
    const history = datesDesc
      .map((date) => ({ date, item: itemsByDate.get(date)?.find((i) => i.text === text) }))
      .filter((h): h is { date: string; item: ChecklistItem } => !!h.item);

    // 今日の出番がまだ終わっていないなら、そこは飛ばして前の出番から数える
    const countFrom = history[0]?.date === todayKey && !history[0].item.done ? 1 : 0;
    let taskStreak = 0;
    for (let i = countFrom; i < history.length && history[i].item.done; i++) taskStreak++;

    return {
      text,
      streak: taskStreak,
      done: history.filter((h) => h.item.done).length,
      appeared: history.length,
    };
  });

  return {
    days: datesDesc.map((date) => {
      const items = itemsByDate.get(date) ?? [];
      return {
        date,
        label: dayLabel(date),
        items,
        done: items.filter((i) => i.done).length,
        total: items.length,
      };
    }),
    todayDate: todayKey,
    cells,
    bars,
    streak,
    completedDays: [...byDate.keys()].filter(isComplete).length,
    recordedDays: byDate.size,
    tasks,
  };
}

// document型: 新しい順に並べ、1枚ずつ出す。前後に動かして過去の分を見る
export function documentsFrom(notes: DbNote[]): DbNote[] {
  return [...notes].sort(byNewestFirst);
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

// feed型: 新しい順
export function feedFrom(notes: DbNote[]): DbNote[] {
  return [...notes].sort(byNewestFirst);
}

// table型: show があればその列、無ければタイトル以外の全プロパティ(出現順)
export type TableData = { columns: string[]; rows: { note: DbNote; cells: string[] }[] };

export function tableFrom(notes: DbNote[], show: string[] = []): TableData {
  const columns: string[] = [...show];
  if (show.length === 0) {
    for (const note of notes) {
      for (const key of Object.keys(note.meta)) {
        if (!TITLE_KEYS.includes(key) && !columns.includes(key)) columns.push(key);
      }
    }
  }
  const rows = [...notes]
    .sort((a, b) => a.title.localeCompare(b.title, "ja"))
    .map((note) => ({ note, cells: columns.map((c) => formatValue(note.meta[c])) }));
  return { columns, rows };
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** `2026-11-05` または Date を `2026年11月5日(水)` にする */
export function dayLabel(value: string | Date): string {
  const d = typeof value === "string" ? parseISO(value) : value;
  return `${format(d, "yyyy年M月d日")}(${WEEKDAYS[d.getDay()]})`;
}

export function todayLabel(): string {
  const d = new Date();
  const week = WEEKDAYS[d.getDay()];
  return `${format(d, "yyyy年M月d日")}(${week})`;
}
