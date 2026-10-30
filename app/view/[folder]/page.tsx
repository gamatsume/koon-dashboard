import Link from "next/link";
import { notFound } from "next/navigation";
import ViewCard from "@/components/ViewCard";
import { decodeSegment, getCategory } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

/** カード1枚を横いっぱいで表示する。表や長い一覧を見やすくするためのページ */
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ folder: string }>;
}) {
  const { folder } = await params;
  const category = getCategory(decodeSegment(folder));
  if (!category) notFound();

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← ダッシュボードへ戻る
        </Link>
        <ViewCard category={category} linkTitle={false} />
      </div>
    </div>
  );
}
