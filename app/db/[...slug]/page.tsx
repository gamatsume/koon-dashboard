import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { categoryHref, formatValue, getDbNoteBySlug } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function DbNotePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const note = getDbNoteBySlug(slug);
  if (!note) notFound();

  // カードでは show に書いたものしか出ないので、ここでは全部見せる
  const properties = Object.entries(note.meta)
    .map(([key, value]) => ({ key, value: formatValue(value) }))
    .filter((p) => p.value !== "");

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-black sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← ダッシュボードへ戻る
        </Link>

        <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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
        </article>
      </div>
    </div>
  );
}
