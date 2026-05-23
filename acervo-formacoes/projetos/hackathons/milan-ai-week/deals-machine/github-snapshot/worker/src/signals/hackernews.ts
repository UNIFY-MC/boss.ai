import type { RawSignal } from '../pipeline/types';

const BASE = 'https://hacker-news.firebaseio.com/v0';

export async function fetchHackerNewsTop(n = 30): Promise<RawSignal[]> {
  try {
    const ids = (await (await fetch(`${BASE}/topstories.json`)).json()) as number[];
    const top = ids.slice(0, n);
    const items = await Promise.all(
      top.map(async (id) => {
        try {
          const r = await fetch(`${BASE}/item/${id}.json`);
          return (await r.json()) as {
            id: number;
            title?: string;
            url?: string;
            text?: string;
            time?: number;
            type?: string;
          };
        } catch {
          return null;
        }
      })
    );
    return items
      .filter((x): x is NonNullable<typeof x> => Boolean(x) && Boolean(x?.title))
      .map((it) => ({
        source_name: 'Hacker News',
        title: it.title!,
        description: it.text ?? '',
        url: it.url ?? `https://news.ycombinator.com/item?id=${it.id}`,
        published_at: it.time ? new Date(it.time * 1000).toISOString() : undefined,
        raw: { hn_id: it.id, hn_type: it.type },
      }));
  } catch (err) {
    console.error('[hackernews] failed:', err);
    return [];
  }
}
