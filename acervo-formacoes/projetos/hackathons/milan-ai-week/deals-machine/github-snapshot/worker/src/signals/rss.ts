import RSSParser from 'rss-parser';
import type { RawSignal } from '../pipeline/types';

const parser = new RSSParser({ timeout: 10000, headers: { 'User-Agent': 'deals-machine-worker/0.1' } });

export async function fetchRSS(sourceName: string, url: string, maxItems = 30): Promise<RawSignal[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? []).slice(0, maxItems).map((item) => ({
      source_name: sourceName,
      title: item.title ?? '(no title)',
      description: item.contentSnippet ?? item.content ?? '',
      url: item.link,
      published_at: item.isoDate ?? item.pubDate,
      raw: { feedTitle: feed.title, categories: item.categories },
    }));
  } catch (err) {
    console.error(`[rss] ${sourceName} failed:`, err);
    return [];
  }
}
