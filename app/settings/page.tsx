import Link from "next/link";
import ViewSettingsBuilder from "@/components/ViewSettingsBuilder";
import { VIEW_PICK_NOTE, viewOptions } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

/** `_view.md` を組み立てる画面。どのフォルダに置くかは利用者が決める */
export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← ダッシュボードへ戻る
        </Link>

        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            _view.md を作る
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            作ったファイルは、適用したいフォルダに置いてください。置き方や決まりは{" "}
            <Link href="/views" className="underline">
              表示のしかた
            </Link>{" "}
            にあります。
          </p>
        </header>

        <ViewSettingsBuilder views={viewOptions()} pickNote={VIEW_PICK_NOTE} />
      </div>
    </div>
  );
}
