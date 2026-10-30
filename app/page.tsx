import Link from "next/link";
import RefreshButton from "@/components/RefreshButton";
import SortableGrid from "@/components/SortableGrid";
import ThemeToggle from "@/components/ThemeToggle";
import ViewCard from "@/components/ViewCard";
import { listCategories, todayLabel } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const categories = listCategories();

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-4 flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
              ダッシュボード
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">{todayLabel()}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/views" className="text-sm text-zinc-500 hover:underline">
              表示のしかた
            </Link>
            <Link href="/settings" className="text-sm text-zinc-500 hover:underline">
              _view.md を作る
            </Link>
            <ThemeToggle />
            <RefreshButton />
          </div>
        </header>

        {categories.length === 0 ? (
          <p className="text-sm text-zinc-500">
            カードになるフォルダがありません。DB（<code>DASHBOARD_DB_PATH</code>
            ）の直下にフォルダを作り、<code>.md</code> を置いてください。
          </p>
        ) : (
          <SortableGrid
            items={categories.map((category) => ({
              id: category.folder,
              label: category.label,
              width: category.settings.width,
              node: <ViewCard category={category} />,
            }))}
          />
        )}
      </div>
    </div>
  );
}
