import Link from "next/link";
import { getAllNotes, getAllTags } from "@/lib/vault";

export const dynamic = "force-dynamic";

export default function VaultList() {
  const notes = getAllNotes();
  const tags = getAllTags(notes);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-black sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← ダッシュボードへ戻る
        </Link>
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Vault一覧
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            ノート {notes.length}件 · タグ {tags.length}件
          </p>
        </header>

        {tags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {notes.map((note) => (
            <Link
              key={note.slug}
              href={`/notes/${note.slug}`}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <h2 className="font-medium text-black dark:text-zinc-50">{note.title}</h2>
              {note.dateLabel && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{note.dateLabel}</p>
              )}
              <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                {note.excerpt}
              </p>
              {note.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>

        {notes.length === 0 && (
          <p className="text-sm text-zinc-500">
            ノートが見つかりません。<code>vault/</code> にMarkdownファイルを追加するか、
            <code>VAULT_PATH</code> でObsidian vaultの場所を指定してください。
          </p>
        )}
      </div>
    </div>
  );
}
