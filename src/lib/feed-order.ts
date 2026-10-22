/** One homepage-feed card: its slug and the ids of its three people. */
export type FeedItem = { slug: string; people: string[] };

/**
 * Reorder the feed so nobody reappears within `gap` cards, staying as close to
 * the given order as that allows: each slot takes the first card whose people
 * are all rested, or failing that the card whose people rested longest.
 * `seen` are the people already on screen (the first card).
 */
export function spaceOut(items: FeedItem[], seen: string[] = [], gap = 20) {
  const last = new Map(seen.map((id) => [id, -1]));
  const left = [...items];
  const out: FeedItem[] = [];
  while (left.length) {
    const pos = out.length;
    const rest = (it: FeedItem) => Math.min(...it.people.map((id) => pos - (last.get(id) ?? -Infinity)));
    let best = 0;
    for (let j = 0, bestRest = -1; j < left.length; j++) {
      const r = rest(left[j]);
      if (r > gap) { best = j; break; }
      if (r > bestRest) { best = j; bestRest = r; }
    }
    const [it] = left.splice(best, 1);
    for (const id of it.people) last.set(id, pos);
    out.push(it);
  }
  return out;
}
