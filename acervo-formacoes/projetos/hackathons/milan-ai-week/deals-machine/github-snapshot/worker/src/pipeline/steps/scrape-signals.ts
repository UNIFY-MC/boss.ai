import { fetchRSS } from '../../signals/rss';
import { fetchHackerNewsTop } from '../../signals/hackernews';
import { fetchReddit } from '../../signals/reddit';
import { fetchWebSearch } from '../../signals/web-search';
import { logActivity } from '../../lib/activity-log';
import type { PipelineContext, RawSignal } from '../types';

const HN_MARKERS = ['hacker news', 'hackernews', 'hn top', 'ycombinator'];
const REDDIT_URL_PATTERN = /(?:^|\/\/)(?:www\.|old\.)?reddit\.com\//i;
const HN_API_PATTERN = /hacker-news\.firebaseio\.com/i;

/**
 * Scrape every signal source defined in the vertical's config. Supported:
 *   - Hacker News API   — name contains "hacker news" / URL is firebaseio.com
 *   - Reddit JSON       — URL matches reddit.com
 *   - RSS / Atom feed   — any other URL
 *   - Anything else     — surfaced as a warning so the operator can fix it
 */
export async function scrapeSignals(ctx: PipelineContext): Promise<void> {
  const sources = ctx.vertical.config.signal_source.sources;
  const all: RawSignal[] = [];
  const skipped: string[] = [];

  await logActivity({
    run_id: ctx.run_id,
    vertical_id: ctx.vertical_id,
    type: 'agent_step',
    message: `🛰️ Scraping ${sources.length} signal source(s)…`,
  });

  for (const src of sources) {
    const name = src.name;
    const nameLower = name.toLowerCase();
    const url = src.url ?? '';
    let collected: RawSignal[] = [];
    let kind = '';

    if (HN_MARKERS.some((m) => nameLower.includes(m)) || (url && HN_API_PATTERN.test(url))) {
      collected = await fetchHackerNewsTop(30);
      kind = 'hn';
    } else if (url && REDDIT_URL_PATTERN.test(url)) {
      collected = await fetchReddit(name, url, 30);
      kind = 'reddit';
    } else if (url) {
      collected = await fetchRSS(name, url, 30);
      kind = 'rss';
    } else {
      skipped.push(name);
      await logActivity({
        run_id: ctx.run_id,
        vertical_id: ctx.vertical_id,
        type: 'info',
        message: `↪ Skipped "${name}" — no URL, not a recognized type (supported: RSS, Reddit, Hacker News)`,
      });
      continue;
    }

    await logActivity({
      run_id: ctx.run_id,
      vertical_id: ctx.vertical_id,
      type: 'agent_step',
      message: `  · ${name} [${kind}]: ${collected.length} items`,
    });
    all.push(...collected);
  }

  // Live web-search augmentation — Claude picks its own queries from the
  // vertical's ICP + relevance prompt and surfaces 5-10 fresh events. Runs
  // once per pipeline regardless of how many configured sources there are.
  // Purely additive; failure is silent so it never blocks a run.
  await logActivity({
    run_id: ctx.run_id,
    vertical_id: ctx.vertical_id,
    type: 'agent_step',
    message: `🌐 Web search · live: agent is picking queries from the ICP…`,
  });
  try {
    const { signals: webSignals, queries } = await fetchWebSearch(ctx.vertical, 10);
    if (queries.length > 0) {
      await logActivity({
        run_id: ctx.run_id,
        vertical_id: ctx.vertical_id,
        type: 'agent_step',
        message: `  · Queries chosen: ${queries.slice(0, 5).map((q) => `"${q.slice(0, 60)}"`).join(', ')}${queries.length > 5 ? '…' : ''}`,
      });
    }
    await logActivity({
      run_id: ctx.run_id,
      vertical_id: ctx.vertical_id,
      type: 'agent_step',
      message: `  · Web search [live]: ${webSignals.length} events surfaced`,
    });
    all.push(...webSignals);
  } catch (err) {
    await logActivity({
      run_id: ctx.run_id,
      vertical_id: ctx.vertical_id,
      type: 'info',
      message: `↪ Web search step failed: ${(err as Error).message} (continuing without it)`,
    });
  }

  // Dedupe by title+url combo
  const seen = new Set<string>();
  ctx.signals = all.filter((s) => {
    const key = `${s.title}::${s.url ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const skipSuffix = skipped.length > 0 ? ` (${skipped.length} source${skipped.length === 1 ? '' : 's'} skipped)` : '';
  await logActivity({
    run_id: ctx.run_id,
    vertical_id: ctx.vertical_id,
    type: 'agent_step',
    message: `🛰️ Total: ${ctx.signals.length} unique signals collected${skipSuffix}`,
  });
}
