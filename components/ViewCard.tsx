import type { ReactNode } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  type Category,
  type DbNote,
  categoryHref,
  checklistFrom,
  feedFrom,
  latestOf,
  quoteOfToday,
  scheduleFrom,
  shownProperties,
  tableFrom,
} from "@/lib/dashboard";

const card =
  "h-full rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
const cardTitle = "text-sm font-semibold tracking-wide text-zinc-500 dark:text-zinc-400";
const emptyText = "text-sm text-zinc-400";
const internalTitle = "font-medium text-zinc-800 hover:underline dark:text-zinc-200";
const externalTitle = "font-medium text-blue-600 hover:underline dark:text-blue-400";

/** url があれば外部リンク、無ければノートの詳細ページへ */
function NoteTitle({ note }: { note: DbNote }) {
  return note.url ? (
    <a href={note.url} target="_blank" rel="noreferrer" className={externalTitle}>
      {note.title} ↗
    </a>
  ) : (
    <Link href={`/db/${note.slug}`} className={internalTitle}>
      {note.title}
    </Link>
  );
}

/** 出どころ・日付の1行 */
function MetaLine({ note }: { note: DbNote }) {
  const text = [note.source, note.dateLabel].filter(Boolean).join(" · ");
  return text ? <p className="mt-0.5 text-xs text-zinc-500">{text}</p> : null;
}

/** 設定ノートの show に書いたプロパティ */
function ShownProperties({ note, show }: { note: DbNote; show: string[] }) {
  const entries = shownProperties(note, show);
  if (entries.length === 0) return null;
  return (
    <dl className="mt-1 flex flex-wrap gap-1.5">
      {entries.map(({ key, value }) => (
        <div
          key={key}
          className="flex gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          <dt className="text-zinc-400 dark:text-zinc-500">{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function daysBadge(daysLeft: number | null) {
  if (daysLeft === null) return <span className="shrink-0 text-xs text-zinc-400">日付なし</span>;
  if (daysLeft === 0)
    return (
      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
        今日
      </span>
    );
  return (
    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      あと{daysLeft}日
    </span>
  );
}

function renderBody({ notes, settings }: Category): { extra?: ReactNode; body: ReactNode } {
  const { show } = settings;

  switch (settings.view) {
    case "checklist": {
      const { items, done } = checklistFrom(notes);
      return {
        extra: (
          <span className="ml-2 font-normal">
            {done}/{items.length} 完了
          </span>
        ),
        body:
          items.length === 0 ? (
            <p className={emptyText}>タスクなし</p>
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
          ),
      };
    }

    case "document": {
      const doc = latestOf(notes);
      if (!doc) return { body: <p className={emptyText}>ドキュメントなし</p> };
      return {
        body: (
          <>
            <p className="text-sm">
              <NoteTitle note={doc} />
            </p>
            <MetaLine note={doc} />
            <ShownProperties note={doc} show={show} />
            {/* カード内では本文の見出しをカード見出し・文書タイトルより目立たせない。
                prose-sm のままだと h1 が 30px になり、14px のカード見出しと階層が逆転する。 */}
            <div className="prose prose-sm prose-zinc mt-2 max-w-none dark:prose-invert prose-headings:mt-4 prose-headings:mb-1.5 prose-headings:text-sm prose-headings:font-semibold">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
            </div>
          </>
        ),
      };
    }

    case "quote": {
      const quote = quoteOfToday(notes);
      if (!quote) return { body: <p className={emptyText}>格言なし</p> };
      const author = typeof quote.meta.author === "string" ? quote.meta.author : null;
      return {
        body: (
          <figure>
            <blockquote className="border-l-2 border-zinc-300 pl-3 text-sm italic text-zinc-700 dark:border-zinc-600 dark:text-zinc-300">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{quote.content}</ReactMarkdown>
            </blockquote>
            {author && (
              <figcaption className="mt-2 text-right text-xs text-zinc-500">— {author}</figcaption>
            )}
            <ShownProperties note={quote} show={show} />
          </figure>
        ),
      };
    }

    case "schedule": {
      const entries = scheduleFrom(notes).filter((e) => e.daysLeft === null || e.daysLeft >= 0);
      if (entries.length === 0) return { body: <p className={emptyText}>予定なし</p> };
      return {
        body: (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {entries.map(({ note, daysLeft }) => (
              <li key={note.slug} className="flex items-center gap-3 py-2 text-sm">
                {daysBadge(daysLeft)}
                <div className="min-w-0">
                  <NoteTitle note={note} />
                  {note.source && <span className="ml-2 text-xs text-zinc-500">{note.source}</span>}
                  <ShownProperties note={note} show={show} />
                </div>
                {note.dateLabel && (
                  <span className="ml-auto shrink-0 text-xs text-zinc-500">{note.dateLabel}</span>
                )}
              </li>
            ))}
          </ul>
        ),
      };
    }

    case "feed": {
      const items = feedFrom(notes);
      if (items.length === 0) return { body: <p className={emptyText}>アイテムなし</p> };
      return {
        body: (
          <ul className="space-y-3">
            {items.map((note) => (
              <li key={note.slug} className="text-sm">
                <NoteTitle note={note} />
                <MetaLine note={note} />
                {note.excerpt && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {note.excerpt}
                  </p>
                )}
                <ShownProperties note={note} show={show} />
              </li>
            ))}
          </ul>
        ),
      };
    }

    case "table": {
      const { columns, rows } = tableFrom(notes, show);
      if (rows.length === 0) return { body: <p className={emptyText}>ノートなし</p> };
      return {
        body: (
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="px-4 py-2 font-medium">名称</th>
                  {columns.map((c) => (
                    <th key={c} className="px-4 py-2 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map(({ note, cells }) => (
                  <tr key={note.slug}>
                    <td className="whitespace-nowrap px-4 py-2">
                      <NoteTitle note={note} />
                    </td>
                    {cells.map((cell, i) => (
                      <td
                        key={columns[i]}
                        className="whitespace-nowrap px-4 py-2 text-zinc-600 dark:text-zinc-400"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      };
    }

    case "note":
    default: {
      if (notes.length === 0) return { body: <p className={emptyText}>ノートなし</p> };
      return {
        body: (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.slug} className="text-sm">
                <NoteTitle note={note} />
                <MetaLine note={note} />
                {note.excerpt && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{note.excerpt}</p>
                )}
                <ShownProperties note={note} show={show} />
              </li>
            ))}
          </ul>
        ),
      };
    }
  }
}

/** フォルダ1つ分のカード。見出しはフォルダ名、中身は設定ノートの view で決まる */
export default function ViewCard({
  category,
  linkTitle = true,
}: {
  category: Category;
  linkTitle?: boolean;
}) {
  const { extra, body } = renderBody(category);
  return (
    <section className={card}>
      <h2 className={`mb-3 ${cardTitle}`}>
        {linkTitle ? (
          <Link href={categoryHref(category.folder)} className="hover:underline">
            {category.label}
          </Link>
        ) : (
          category.label
        )}
        {extra}
      </h2>
      {category.settings.warnings.map((w) => (
        <p
          key={w}
          className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        >
          {w}
        </p>
      ))}
      {body}
    </section>
  );
}
