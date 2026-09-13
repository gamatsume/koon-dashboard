import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import RefreshButton from "@/components/RefreshButton";
import ThemeToggle from "@/components/ThemeToggle";
import {
  DbNote,
  ScheduleEntry,
  checklistFrom,
  feedFrom,
  getFolderNotes,
  latestOf,
  loadConfig,
  quoteOfToday,
  scheduleFrom,
  todayLabel,
} from "@/lib/dashboard";

export const dynamic = "force-dynamic";

const card =
  "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
const cardTitle =
  "mb-3 text-sm font-semibold tracking-wide text-zinc-500 dark:text-zinc-400";

function ChecklistCard({ label, notes }: { label: string; notes: DbNote[] }) {
  const { items, done } = checklistFrom(notes);
  return (
    <section className={card}>
      <h2 className={cardTitle}>
        {label}
        <span className="ml-2 font-normal">
          {done}/{items.length} 完了
        </span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-400">タスクなし</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span aria-hidden className="mt-0.5">
                {item.done ? "☑" : "☐"}
              </span>
              <span
                className={
                  item.done
                    ? "text-zinc-400 line-through dark:text-zinc-600"
                    : "text-zinc-800 dark:text-zinc-200"
                }
              >
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DocumentCard({ label, notes }: { label: string; notes: DbNote[] }) {
  const doc = latestOf(notes);
  return (
    <section className={card}>
      <h2 className={cardTitle}>{label}</h2>
      {!doc ? (
        <p className="text-sm text-zinc-400">ドキュメントなし</p>
      ) : (
        <>
          <p className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            <Link href={`/db/${doc.slug}`} className="hover:underline">
              {doc.title}
            </Link>
          </p>
          {/* カード内では本文の見出しをカード見出し・文書タイトルより目立たせない。
              prose-sm のままだと h1 が 30px になり、14px のカード見出しと階層が逆転する。 */}
          <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert prose-headings:mt-4 prose-headings:mb-1.5 prose-headings:text-sm prose-headings:font-semibold">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
          </div>
        </>
      )}
    </section>
  );
}

function QuoteCard({ label, notes }: { label: string; notes: DbNote[] }) {
  const quote = quoteOfToday(notes);
  return (
    <section className={card}>
      <h2 className={cardTitle}>{label}</h2>
      {!quote ? (
        <p className="text-sm text-zinc-400">格言なし</p>
      ) : (
        <figure>
          <blockquote className="border-l-2 border-zinc-300 pl-3 text-sm italic text-zinc-700 dark:border-zinc-600 dark:text-zinc-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{quote.content}</ReactMarkdown>
          </blockquote>
          {typeof quote.meta.author === "string" && (
            <figcaption className="mt-2 text-right text-xs text-zinc-500">
              — {quote.meta.author}
            </figcaption>
          )}
        </figure>
      )}
    </section>
  );
}

function daysBadge(daysLeft: number | null) {
  if (daysLeft === null)
    return <span className="text-xs text-zinc-400">日付なし</span>;
  if (daysLeft < 0) return <span className="text-xs text-zinc-400">終了</span>;
  if (daysLeft === 0)
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
        今日
      </span>
    );
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      あと{daysLeft}日
    </span>
  );
}

function ScheduleSection({ label, notes }: { label: string; notes: DbNote[] }) {
  const entries: ScheduleEntry[] = scheduleFrom(notes).filter(
    (e) => e.daysLeft === null || e.daysLeft >= 0,
  );
  return (
    <section className={card}>
      <h2 className={cardTitle}>{label}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-zinc-400">予定なし</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {entries.map(({ note, daysLeft }) => (
            <li key={note.slug} className="flex items-center gap-3 py-2 text-sm">
              {daysBadge(daysLeft)}
              <Link
                href={`/db/${note.slug}`}
                className="font-medium text-zinc-800 hover:underline dark:text-zinc-200"
              >
                {note.title}
              </Link>
              {note.dateLabel && (
                <span className="ml-auto text-xs text-zinc-500">{note.dateLabel}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FeedColumn({ label, notes }: { label: string; notes: DbNote[] }) {
  const items = feedFrom(notes);
  return (
    <section className={card}>
      <h2 className={cardTitle}>{label}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-400">アイテムなし</p>
      ) : (
        <ul className="space-y-3">
          {items.map((note) => {
            const url = typeof note.meta.url === "string" ? note.meta.url : null;
            const from = typeof note.meta.from === "string" ? note.meta.from : null;
            return (
              <li key={note.slug} className="text-sm">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {note.title} ↗
                  </a>
                ) : (
                  <Link
                    href={`/db/${note.slug}`}
                    className="font-medium text-zinc-800 hover:underline dark:text-zinc-200"
                  >
                    {note.title}
                  </Link>
                )}
                <p className="mt-0.5 text-xs text-zinc-500">
                  {[from, note.dateLabel].filter(Boolean).join(" · ")}
                </p>
                {note.excerpt && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {note.excerpt}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function NoteListCard({ label, notes }: { label: string; notes: DbNote[] }) {
  return (
    <section className={card}>
      <h2 className={cardTitle}>{label}</h2>
      {notes.length === 0 ? (
        <p className="text-sm text-zinc-400">ノートなし</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.slug} className="text-sm">
              <Link
                href={`/db/${note.slug}`}
                className="font-medium text-zinc-800 hover:underline dark:text-zinc-200"
              >
                {note.title}
              </Link>
              {note.excerpt && (
                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{note.excerpt}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ViewBlock({ folder }: { folder: string }) {
  const config = loadConfig();
  const view = config.views[folder];
  const notes = getFolderNotes(folder, config);
  if (!view) return null;
  switch (view.type) {
    case "checklist":
      return <ChecklistCard label={view.label} notes={notes} />;
    case "document":
      return <DocumentCard label={view.label} notes={notes} />;
    case "quote":
      return <QuoteCard label={view.label} notes={notes} />;
    case "schedule":
      return <ScheduleSection label={view.label} notes={notes} />;
    case "feed":
      return <FeedColumn label={view.label} notes={notes} />;
    default:
      return <NoteListCard label={view.label} notes={notes} />;
  }
}

export default function Dashboard() {
  const config = loadConfig();
  const { top, middle, bottom } = config.layout;
  const extra = Object.keys(config.views).filter(
    (f) =>
      !top.includes(f) &&
      !middle.includes(f) &&
      !bottom.includes(f) &&
      config.views[f].type !== "table",
  );

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
              ダッシュボード
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">{todayLabel()}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/subs" className="text-sm text-zinc-500 hover:underline">
              サブスク
            </Link>
            <Link href="/vault" className="text-sm text-zinc-500 hover:underline">
              Vault一覧
            </Link>
            <ThemeToggle />
            <RefreshButton />
          </div>
        </header>

        {/* 上段: 毎朝見る核 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {top.map((folder) => (
            <ViewBlock key={folder} folder={folder} />
          ))}
        </div>

        {/* 中段: 近づく予定 */}
        <div className="mt-4 space-y-4">
          {middle.map((folder) => (
            <ViewBlock key={folder} folder={folder} />
          ))}
        </div>

        {/* 下段: フィード */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {bottom.map((folder) => (
            <ViewBlock key={folder} folder={folder} />
          ))}
        </div>

        {/* レイアウト未指定のビュー(memo等) */}
        {extra.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {extra.map((folder) => (
              <ViewBlock key={folder} folder={folder} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
