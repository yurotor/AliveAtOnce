import { cacheLife } from "next/cache";
import { getDailyFact, getTopFacts } from "@/lib/db";
import { currentYear } from "@/lib/life";
import { FactList, FactView } from "@/components/FactView";
import { Search } from "@/components/Search";

export default async function Home() {
  "use cache";
  cacheLife("hours");
  const daily = await getDailyFact();
  const more = await getTopFacts(daily?.fact.id ?? null, 12);
  const now = currentYear();
  const date = daily
    ? new Date(daily.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })
    : null;

  return (
    <>
      <section className="pt-10 sm:pt-16 pb-14">
        {daily ? (
          <>
            <p className="mb-5 text-sm text-muted">Today’s bridge, {date}</p>
            <FactView fact={daily.fact} now={now} />
          </>
        ) : (
          <p className="text-muted">No bridges loaded yet. Run the data pipeline (see README).</p>
        )}
      </section>

      <section className="py-10 border-t border-rule">
        <h2 className="font-display text-3xl">Whose lifetime overlapped with whose?</h2>
        <p className="mt-2 mb-6 text-muted max-w-prose">
          Pick anyone from 50,000 famous people and see who was alive at the same time.
        </p>
        <div className="max-w-xl">
          <Search />
        </div>
      </section>

      {more.length > 0 && (
        <section className="py-10">
          <h2 className="font-display text-3xl mb-6">More bridges</h2>
          <FactList facts={more} now={now} />
        </section>
      )}
    </>
  );
}
