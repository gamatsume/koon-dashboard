import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type DbNote, categoryHref, formatValue } from "@/lib/dashboard";

/**
 * ノート1件の中身。単独ページとモーダルの両方から使う。
 * 「戻る」「閉じる」のような枠の部分は、呼び出し側が用意する。
 */
export default function NoteView({ note }: { note: DbNote }) {
  // カードでは show に書いたものしか出ないので、ここでは全部見せる
  const properties = Object.entries(note.meta)
    .map(([key, value]) => ({ key, value: formatValue(value) }))
    .filter((p) => p.value !== "");

  return (
    <>
      <p className="mb-1 text-xs text-zinc-500">
        <Link href={categoryHref(note.folder)} className="hover:underline">
          {note.folder}
        </Link>
      </p>
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">{note.title}</h1>
      {note.dateLabel && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{note.dateLabel}</p>
      )}
      {note.broken && (
        <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          メタデータの解析に失敗したため、本文をそのまま表示しています。
        </p>
      )}

      {properties.length > 0 && (
        <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 rounded-lg bg-zinc-50 px-3 py-2 text-xs dark:bg-zinc-800/50">
          {properties.map(({ key, value }) => (
            <div key={key} className="contents">
              <dt className="font-mono text-zinc-500">{key}</dt>
              <dd className="break-words text-zinc-700 dark:text-zinc-300">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="prose prose-zinc mt-6 max-w-none dark:prose-invert prose-a:text-blue-600 dark:prose-a:text-blue-400">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
      </div>
    </>
  );
}
