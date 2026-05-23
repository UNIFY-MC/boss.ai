// Reddit JSON fetcher. Reddit exposes every listing as JSON by appending
// `.json` to the URL — no auth, no key. Returns hot/top posts depending
// on the URL the operator (or vertical builder) configured.
//
// Accepted source URL shapes:
//   https://www.reddit.com/r/<sub>/
//   https://www.reddit.com/r/<sub>/.json
//   https://www.reddit.com/r/<sub>/top/.json?t=week&limit=30
//   https://reddit.com/r/<sub>
//
// We normalize to /.json and clamp the limit. Reddit requires a non-generic
// User-Agent or it 429s; we set a stable identifier.

import type { RawSignal } from '../pipeline/types';

const UA = 'deals-machine-worker/0.1 (B2B sales agent; +https://deals-machine.vercel.app)';

interface RedditChild {
  data?: {
    id?: string;
    title?: string;
    selftext?: string;
    url?: string;
    permalink?: string;
    created_utc?: number;
    score?: number;
    num_comments?: number;
    subreddit?: string;
    over_18?: boolean;
    stickied?: boolean;
  };
}

interface RedditListing {
  data?: { children?: RedditChild[] };
}

function normalizeUrl(input: string, maxItems: number): string {
  let url = input.trim();
  // Strip query string for normalization, we'll add our own
  const [base, query] = url.split('?', 2);
  let path = base.replace(/\/$/, '');
  if (!path.endsWith('.json')) {
    path = path + '/.json';
  }
  const params = new URLSearchParams(query || '');
  if (!params.has('limit')) params.set('limit', String(maxItems));
  return `${path}?${params.toString()}`;
}

export async function fetchReddit(sourceName: string, url: string, maxItems = 30): Promise<RawSignal[]> {
  const normalized = normalizeUrl(url, maxItems);
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10_000);
    const res = await fetch(normalized, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error(`[reddit] ${sourceName} HTTP ${res.status} for ${normalized}`);
      return [];
    }
    const data = (await res.json()) as RedditListing;
    const children = data?.data?.children ?? [];
    return children
      .map((c) => c.data)
      .filter((d): d is NonNullable<RedditChild['data']> => Boolean(d?.title))
      // Skip stickied mod posts + NSFW noise
      .filter((d) => !d.stickied && !d.over_18)
      .slice(0, maxItems)
      .map((d) => ({
        source_name: sourceName,
        title: d.title!,
        description: d.selftext ? d.selftext.slice(0, 600) : '',
        url: d.permalink ? `https://www.reddit.com${d.permalink}` : d.url,
        published_at: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : undefined,
        raw: {
          subreddit: d.subreddit,
          score: d.score,
          num_comments: d.num_comments,
          reddit_id: d.id,
        },
      }));
  } catch (err) {
    console.error(`[reddit] ${sourceName} failed:`, err);
    return [];
  }
}
