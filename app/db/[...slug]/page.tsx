import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getDbNoteBySlug, loadConfig } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function DbNotePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const note = getDbNoteBySlug(slug);
  if (!note) notFound();

  const config = loadConfig();
  const folderLabel = config.views[note.folder]?.label ?? note.folder;

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
          <p className="mb-1 text-xs text-zinc-500">{folderLabel}</p>
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">{note.title}</h1>
          {note.dateLabel && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{note.dateLabel}</p>
          )}
          {note.broken && (
            <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              メタデータの解析に失敗したため、本文をそのまま表示しています。
            </p>
          )}

          <div className="prose prose-zinc mt-6 max-w-none dark:prose-invert prose-a:text-blue-600 dark:prose-a:text-blue-400">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
          </div>
        </article>
      </div>
    </div>
  );
}
