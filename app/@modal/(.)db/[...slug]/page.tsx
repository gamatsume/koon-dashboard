import { notFound } from "next/navigation";
import Modal from "@/components/Modal";
import NoteView from "@/components/NoteView";
import { getDbNoteBySlug } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

/**
 * ダッシュボードからノートを開いたときに、`/db/...` への遷移を横取りしてモーダルで出す。
 * URL を直接開いた場合やリロード時は横取りされず、`app/db/[...slug]/page.tsx` が出る。
 */
export default async function DbNoteModal({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const note = getDbNoteBySlug(slug);
  if (!note) notFound();

  return (
    <Modal>
      <NoteView note={note} />
    </Modal>
  );
}
