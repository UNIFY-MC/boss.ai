import { logActivity } from '../../lib/activity-log';
import type { ConsequenceChain, PipelineContext, ScoredLead } from '../types';

const PAIN_WEIGHTS = { high: 100, medium: 60, low: 25 };

function scoreSeniority(seniority: string | null | undefined): number {
  const s = (seniority ?? '').toLowerCase();
  if (s.includes('c_suite') || s.includes('founder') || s.includes('cto') || s.includes('ceo') || s.includes('chief')) return 20;
  if (s.includes('vp') || s.includes('vice')) return 15;
  if (s.includes('director') || s.includes('head')) return 12;
  if (s.includes('manager')) return 8;
  return 4;
}

function painFromUrgency(u: 'high' | 'medium' | 'low'): 'high' | 'medium' | 'low' {
  return u;
}

/**
 * Pair each deduped Apollo lead with the most relevant consequence chain
 * (best title/keyword overlap), compute a raw score, and rank by pain × score.
 * Then apply Brain modifiers (profile_chase boosts, profile_avoid drops) and
 * cut off at vertical.config.target_daily_leads.
 */
export async function scoreAndAssign(ctx: PipelineContext): Promise<void> {
  const target = ctx.vertical.config.target_daily_leads ?? 20;

  const fallbackChain: ConsequenceChain | null = ctx.chains[0] ?? null;
  if (!fallbackChain) {
    // No chains — still produce a basic scored list so the run isn't empty
    ctx.scored = ctx.deduped_against_hubspot.slice(0, target).map((apollo) => ({
      apollo,
      triggering_chain: {
        event: 'baseline ICP outreach',
        cascading_effects: [],
        target_profile: 'standard ICP match',
        urgency: 'medium',
      },
      pain_level: 'medium',
      raw_score: scoreSeniority(apollo.seniority),
    }));
  } else {
    const scored: ScoredLead[] = ctx.deduped_against_hubspot.map((apollo) => {
      // Find best chain match by simple token overlap of title + hint titles
      const personTitle = (apollo.title ?? '').toLowerCase();
      let best: ConsequenceChain = fallbackChain;
      let bestScore = 0;
      for (const c of ctx.chains) {
        const hintTitles = c.apollo_search_hint?.person_titles ?? [];
        const overlap = hintTitles.reduce((acc, ht) => acc + (personTitle.includes(ht.toLowerCase()) ? 1 : 0), 0);
        const urgencyBonus = c.urgency === 'high' ? 1 : c.urgency === 'medium' ? 0.5 : 0;
        const score = overlap + urgencyBonus;
        if (score > bestScore) {
          best = c;
          bestScore = score;
        }
      }

      const pain = painFromUrgency(best.urgency);
      const raw =
        PAIN_WEIGHTS[pain] +
        scoreSeniority(apollo.seniority) +
        (apollo.phone ? 5 : 0) +
        (apollo.email ? 3 : 0);

      return { apollo, triggering_chain: best, pain_level: pain, raw_score: raw };
    });

    // Brain modifiers
    for (const brain of ctx.brain) {
      const content = brain.content.toLowerCase();
      if (brain.type === 'profile_chase') {
        for (const s of scored) {
          const blob = `${s.apollo.title ?? ''} ${s.apollo.organization?.name ?? ''} ${s.apollo.organization?.industry ?? ''}`.toLowerCase();
          if (content.split(/\s+/).filter((w) => w.length > 3).some((w) => blob.includes(w))) {
            s.raw_score += 15 * brain.weight;
          }
        }
      } else if (brain.type === 'profile_avoid') {
        for (const s of scored) {
          const blob = `${s.apollo.title ?? ''} ${s.apollo.organization?.name ?? ''} ${s.apollo.organization?.industry ?? ''}`.toLowerCase();
          if (content.split(/\s+/).filter((w) => w.length > 3).some((w) => blob.includes(w))) {
            s.raw_score -= 25 * brain.weight;
          }
        }
      }
    }

    scored.sort((a, b) => b.raw_score - a.raw_score);
    ctx.scored = scored.slice(0, target);
  }

  const highCount = ctx.scored.filter((s) => s.pain_level === 'high').length;
  const medCount = ctx.scored.filter((s) => s.pain_level === 'medium').length;

  await logActivity({
    run_id: ctx.run_id,
    vertical_id: ctx.vertical_id,
    type: 'agent_step',
    message: `🎯 Scored ${ctx.scored.length} target leads (${highCount} high-pain, ${medCount} medium)`,
  });
}
