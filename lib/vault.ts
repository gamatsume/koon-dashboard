import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { format, isValid } from "date-fns";

export const VAULT_PATH = process.env.VAULT_PATH
  ? path.resolve(process.env.VAULT_PATH)
  : path.join(process.cwd(), "vault");

export type Note = {
  slug: string;
  title: string;
  tags: string[];
  /** ISO (yyyy-MM-dd) date used for sorting. */
  date: string | null;
  /** Localized date label for display (e.g. 2026年7月27日). */
  dateLabel: string | null;
  excerpt: string;
  content: string;
};

function walkMarkdownFiles(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdownFiles(fullPath, base);
    if (entry.isFile() && entry.name.endsWith(".md")) return [fullPath];
    return [];
  });
}

function filePathToSlug(filePath: string): string {
  const relative = path.relative(VAULT_PATH, filePath).replace(/\.md$/, "");
  return relative.split(path.sep).map(encodeURIComponent).join("/");
}

function slugToFilePath(slug: string): string {
  const decoded = slug.split("/").map(decodeURIComponent).join(path.sep);
  return path.join(VAULT_PATH, `${decoded}.md`);
}

function filePathToRelativeName(filePath: string): string {
  return path.relative(VAULT_PATH, filePath).replace(/\.md$/, "").split(path.sep).join("/");
}

function noteNameToSlug(name: string): string | null {
  const match = allFilePaths().find((filePath) => {
    const base = path.basename(filePath, ".md");
    return base === name || filePathToRelativeName(filePath) === name;
  });
  return match ? filePathToSlug(match) : null;
}

let cachedFilePaths: string[] | null = null;
function allFilePaths(): string[] {
  if (!cachedFilePaths) cachedFilePaths = walkMarkdownFiles(VAULT_PATH);
  return cachedFilePaths;
}

/** Turns Obsidian-style [[Wikilinks]] and [[Wikilinks|labels]] into normal Markdown links. */
function resolveWikilinks(content: string): string {
  return content.replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (_, target, __, label) => {
    const displayText = label ?? target;
    const slug = noteNameToSlug(target.trim());
    return slug ? `[${displayText}](/notes/${slug})` : displayText;
  });
}

/** Replaces wikilinks with their display text, for plain-text contexts like excerpts. */
function stripWikilinks(content: string): string {
  return content.replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (_, target, __, label) =>
    (label ?? target).trim(),
  );
}

function formatDate(value: unknown): string | null {
  if (!value) return null;
  const asDate = value instanceof Date ? value : new Date(String(value));
  return isValid(asDate) ? format(asDate, "yyyy-MM-dd") : String(value);
}

function formatDateLabel(value: unknown): string | null {
  if (!value) return null;
  const asDate = value instanceof Date ? value : new Date(String(value));
  return isValid(asDate) ? format(asDate, "yyyy年M月d日") : String(value);
}

function excerptFrom(content: string): string {
  const line = content
    .trim()
    .split("\n")
    .find((line) => line.trim().length > 0 && !line.trim().startsWith("#"));
  return line?.trim() ?? "";
}

function toNote(filePath: string): Note {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const slug = filePathToSlug(filePath);

  return {
    slug,
    title: data.title ?? path.basename(filePath, ".md"),
    tags: Array.isArray(data.tags) ? data.tags : [],
    date: formatDate(data.date),
    dateLabel: formatDateLabel(data.date),
    excerpt: excerptFrom(stripWikilinks(content)),
    content: resolveWikilinks(content),
  };
}

export function getAllNotes(): Note[] {
  cachedFilePaths = null; // pick up any edits made in Obsidian since last request
  return allFilePaths()
    .map(toNote)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function getNoteBySlug(slug: string): Note | null {
  cachedFilePaths = null;
  const filePath = slugToFilePath(slug);
  if (!fs.existsSync(filePath)) return null;
  return toNote(filePath);
}

export function getAllTags(notes: Note[]): string[] {
  return Array.from(new Set(notes.flatMap((note) => note.tags))).sort();
}
