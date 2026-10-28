import Link from "next/link";
import { notFound } from "next/navigation";
import NoteView from "@/components/NoteView";
import { getDbNoteBySlug } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

/** ノート1件の単独ページ。URL を直接開いた場合やリロード時はこちらが出る */
export default async function DbNotePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const note = getDbNoteBySlug(slug);
  if (!note) notFound();

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
          <NoteView note={note} />
        </article>
      </div>
    </div>
  );
}
