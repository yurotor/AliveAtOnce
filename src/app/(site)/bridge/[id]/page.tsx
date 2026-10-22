import { notFound, permanentRedirect } from "next/navigation";
import { getFact } from "@/lib/db";
import { factPath } from "@/lib/present";

export const instant = false;

/** Old /bridge/{id} links forward to the bridge's /b/{slug} card. */
export default async function OldBridge({ params }: PageProps<"/bridge/[id]">) {
  const id = Number((await params).id);
  const fact = Number.isInteger(id) ? await getFact(id) : null;
  if (!fact) notFound();
  permanentRedirect(factPath(fact));
}
