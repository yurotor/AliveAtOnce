import { cacheLife } from "next/cache";
import { getDailyFact, getFeed } from "@/lib/db";
import { BridgeFeed } from "@/components/feed/BridgeFeed";

export default async function Home() {
  "use cache";
  cacheLife("hours");
  const [daily, feed] = await Promise.all([getDailyFact(), getFeed()]);
  if (!daily) {
    return <p className="p-8 text-muted">No bridges loaded yet. Run the data pipeline (see README).</p>;
  }
  return <BridgeFeed initial={daily.fact} feed={feed} home />;
}
