"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-sm text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:shadow disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500"
    >
      {pending ? "更新中…" : "↻ 更新"}
    </button>
  );
}
