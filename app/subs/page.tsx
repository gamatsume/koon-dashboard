import Link from "next/link";
import { getFolderNotes, loadConfig, tableFrom } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default function SubsPage() {
  const config = loadConfig();
  const label = config.views.subs?.label ?? "サブスク";
  const { columns, rows } = tableFrom(getFolderNotes("subs", config));

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-black sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← ダッシュボードへ戻る
        </Link>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {label}
        </h1>

        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">データがありません。</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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
                    <td className="px-4 py-2 font-medium text-zinc-800 dark:text-zinc-200">
                      <Link href={`/db/${note.slug}`} className="hover:underline">
                        {note.title}
                      </Link>
                    </td>
                    {cells.map((cell, i) => (
                      <td key={i} className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
