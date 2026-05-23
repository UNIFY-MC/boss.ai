// Onboarding wizard routes
//
// Helps users who don't have a clear ICP yet. Agent asks one adaptive
// question at a time (max 5), builds a scratchpad of the emerging ICP,
// validates against real companies via web search, and at commit creates
// 1..N verticals (variations supported — same buyer, different niches).
//
// Flow:
//   POST /onboard/start              → session_id (new or resumed by token)
//   POST /onboard/next-question      → next_question, updated_scratchpad, done
//   POST /onboard/validate           → real companies w/ "why it fits" reasoning
//   POST /onboard/commit             → creates 1..N verticals + lineage
//   POST /onboard/pause              → marks session paused (resume later)
//
// Session identification is via a cookie token the frontend mints + sends.
// No auth — matches the existing single-tenant model.

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { supabase } from '../lib/supabase';
import { callClaude, callClaudeJSON } from '../llm/client';

const MAX_QUESTIONS = 5;
const MAX_VARIATIONS = 4;

/* ─── Schemas ────────────────────────────────────────────────────── */

const StartBody = z.object({
  cookie_token: z.string().min(8).max(128),
});

const NextQuestionBody = z.object({
  cookie_token: z.string().min(8).max(128),
  answer: z.string().max(4000).optional(),
});

const ValidateBody = z.object({
  cookie_token: z.string().min(8).max(128),
});

const CommitBody = z.object({
  cookie_token: z.string().min(8).max(128),
  variations: z
    .array(
      z.object({
        display_name: z.string().min(2).max(120),
        niche_override: z.string().max(500).optional(),
        industry_override: z.array(z.string()).optional(),
      }),
    )
    .min(1)
    .max(MAX_VARIATIONS),
});

const PauseBody = z.object({
  cookie_token: z.string().min(8).max(128),
});

/* ─── Scratchpad type ────────────────────────────────────────────── */

type Scratchpad = {
  product?: string;
  buyer_titles?: string[];
  industries?: string[];
  company_size?: { min?: number; max?: number };
  geo?: string[];
  pain_point?: string;
  trigger_events?: string[];
  value_prop?: string;
  niches_detected?: string[];
  notes?: string;
};

type AnswerEntry = {
  step: number;
  question: string;
  answer: string;
  asked_at: string;
};

/* ─── Helpers ────────────────────────────────────────────────────── */

async function loadSession(token: string) {
  const { data } = await supabase()
    .from('onboarding_sessions')
    .select('*')
    .eq('cookie_token', token)
    .maybeSingle();
  return data;
}

async function upsertSession(
  token: string,
  patch: Record<string, unknown>,
): Promise<unknown> {
  const existing = await loadSession(token);
  if (existing) {
    const { data } = await supabase()
      .from('onboarding_sessions')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('cookie_token', token)
      .select('*')
      .single();
    return data;
  }
  const { data } = await supabase()
    .from('onboarding_sessions')
    .insert({
      cookie_token: token,
      status: 'active',
      current_step: 1,
      scratchpad: {},
      answers: [],
      ...patch,
    })
    .select('*')
    .single();
  return data;
}

/* ─── Question generation ────────────────────────────────────────── */

const Q1_FIXED =
  "What do you sell, in one sentence? Tell me like you'd tell a friend — what's the product or service, and who do you think it's for?";

async function generateNextQuestion(
  scratchpad: Scratchpad,
  answers: AnswerEntry[],
  step: number,
): Promise<{ question: string; scratchpad: Scratchpad; done: boolean; niches_detected: string[] }> {
  if (step === 1) {
    return { question: Q1_FIXED, scratchpad, done: false, niches_detected: [] };
  }

  if (step > MAX_QUESTIONS) {
    return { question: '', scratchpad, done: true, niches_detected: scratchpad.niches_detected ?? [] };
  }

  const system = `You are an ICP coach helping a founder figure out who to sell to.
You ask ONE question at a time. The question must have the highest information
gain given what we already know. Never ask things you can already infer.

Update the scratchpad with everything you can extract from the latest answer.
Detect when the user mentions multiple distinct buyer niches — if they do,
list them in niches_detected.

Output strict JSON only. Shape:
{
  "scratchpad": {
    "product": "...",
    "buyer_titles": ["..."],
    "industries": ["..."],
    "company_size": { "min": 50, "max": 200 },
    "geo": ["United States"],
    "pain_point": "...",
    "trigger_events": ["..."],
    "value_prop": "...",
    "niches_detected": ["..."],
    "notes": "..."
  },
  "next_question": "<the single question to ask next, conversational, no preamble>",
  "done": false
}

Guidelines:
- Step 2-3: triangulate the buyer (title, seniority, function). Ask about
  the FIRST person to feel the pain, or what their two best customers have
  in common.
- Step 4: pin down the trigger event (the thing that happens that makes the
  buyer ready). Suggest 2-3 trigger options as a multi-choice if useful.
- Step 5: nail the value prop in the buyer's words ("I need this because…").
- If the user mentions multiple niches (e.g. "freight forwarders AND e-comm
  3PLs"), note them in niches_detected. Don't fork the flow yet — that
  happens at commit.
- Never ask "what's your industry" — that's too vague. Ask about WHO and WHY.
- If their answer is too vague, your next question should ask for a concrete
  example. Don't move on.
- If step is >= 5 and you have enough to commit, set done:true and skip
  next_question.`;

  const user = [
    `Current step: ${step} of ${MAX_QUESTIONS}`,
    '',
    'Scratchpad so far:',
    JSON.stringify(scratchpad, null, 2),
    '',
    'Q/A history:',
    ...answers.map(
      (a) => `Step ${a.step}\nQ: ${a.question}\nA: ${a.answer}`,
    ),
    '',
    'Compose the next question and update the scratchpad.',
  ].join('\n');

  const out = await callClaudeJSON<{
    scratchpad: Scratchpad;
    next_question?: string;
    done?: boolean;
  }>({
    system,
    user,
    maxTokens: 1500,
    temperature: 0.4,
  });

  return {
    question: out.next_question ?? '',
    scratchpad: out.scratchpad ?? scratchpad,
    done: !!out.done || step >= MAX_QUESTIONS,
    niches_detected: out.scratchpad?.niches_detected ?? [],
  };
}

/* ─── Web-search validation ──────────────────────────────────────── */

async function validateAgainstWeb(
  scratchpad: Scratchpad,
): Promise<Array<{ company: string; domain?: string; why_fits: string }>> {
  const system = `You validate an ICP hypothesis by finding 8 real companies
that match. Use the web_search tool. For each company, return the name, the
domain if you can find it, and a single sentence on WHY it fits the ICP —
specifically referencing the buyer titles, industry, size, or pain point
from the hypothesis. Skip companies you can't verify.

Output strict JSON only:
{ "companies": [ { "company": "...", "domain": "...", "why_fits": "..." } ] }

Hard rules:
- 8 companies. No more, no less. If you can't find 8, fewer is fine but say so.
- Real companies only. If you can't find a domain, omit the domain field.
- "why_fits" must reference SPECIFIC ICP attributes — not generic "they
  operate in this space."`;

  const user = [
    'ICP hypothesis:',
    JSON.stringify(
      {
        buyer_titles: scratchpad.buyer_titles,
        industries: scratchpad.industries,
        company_size: scratchpad.company_size,
        geo: scratchpad.geo,
        pain_point: scratchpad.pain_point,
      },
      null,
      2,
    ),
    '',
    'Find 8 real companies that fit. Use web search.',
  ].join('\n');

  // Web-search calls take longer. Bump max tokens.
  const text = await callClaude({
    system,
    user,
    maxTokens: 4000,
    temperature: 0.3,
    webSearch: true,
  });

  // Extract JSON tolerantly — web search can produce verbose intermediate text.
  try {
    const stripped = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*$/g, '')
      .trim();
    const objMatch = stripped.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(objMatch?.[0] ?? stripped);
    return parsed.companies ?? [];
  } catch {
    return [];
  }
}

/* ─── Commit: build N verticals ──────────────────────────────────── */

async function commitVerticals(
  scratchpad: Scratchpad,
  variations: z.infer<typeof CommitBody>['variations'],
  validatedCompanies: unknown,
): Promise<string[]> {
  const sb = supabase();
  const ids: string[] = [];
  let parentId: string | null = null;

  for (let i = 0; i < variations.length; i++) {
    const v = variations[i];
    const industries =
      v.industry_override && v.industry_override.length > 0
        ? v.industry_override
        : scratchpad.industries ?? [];

    const slug =
      v.display_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) +
      '-' +
      Math.random().toString(36).slice(2, 6);

    const config = {
      icp: {
        titles: scratchpad.buyer_titles ?? [],
        industries,
        company_size_range: scratchpad.company_size
          ? [
              scratchpad.company_size.min ?? 10,
              scratchpad.company_size.max ?? 500,
            ]
          : [10, 500],
        countries: scratchpad.geo ?? [],
        primary_pain: scratchpad.pain_point,
        niche_note: v.niche_override,
      },
      value_props: scratchpad.value_prop ? [scratchpad.value_prop] : [],
      trigger_events: scratchpad.trigger_events ?? [],
      voice: {
        anchor_phrases: [],
        forbidden_phrases: ['circle back', 'touch base', 'value prop', 'synergy', 'leverage'],
      },
      onboarding: {
        source: 'guided_wizard',
        scratchpad,
        validated_companies: validatedCompanies ?? null,
      },
    };

    const insertPayload: Record<string, unknown> = {
      slug,
      display_name: v.display_name,
      config,
      active: true,
    };
    if (parentId) insertPayload.parent_vertical_id = parentId;

    const { data, error }: { data: { id: string } | null; error: { message: string } | null } =
      await sb.from('verticals').insert(insertPayload).select('id').single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to insert vertical');
    }
    ids.push(data.id);
    if (i === 0) parentId = data.id; // first becomes parent of variations
  }

  return ids;
}

/* ─── Route registration ─────────────────────────────────────────── */

export async function onboardingRoutes(app: FastifyInstance) {
  // Start or resume a session. Always idempotent: same token returns the
  // existing session (so the page can show "welcome back" if applicable).
  app.post('/onboard/start', async (req, reply) => {
    try {
      const parse = StartBody.safeParse(req.body);
      if (!parse.success) return reply.code(400).send({ ok: false, error: 'Invalid input' });

      const existing = await loadSession(parse.data.cookie_token);
      if (existing) {
        if (existing.status === 'paused') {
          await supabase()
            .from('onboarding_sessions')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('cookie_token', parse.data.cookie_token);
        }
        return reply.send({ ok: true, session: { ...existing, status: 'active' }, resumed: true });
      }

      const created = await upsertSession(parse.data.cookie_token, {});
      return reply.send({ ok: true, session: created, resumed: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      req.log.error({ err: message }, 'onboarding start failed');
      return reply.code(500).send({ ok: false, error: message });
    }
  });

  // Submit an answer (or get Q1 if no answer yet) → returns next question.
  app.post('/onboard/next-question', async (req, reply) => {
    try {
      const parse = NextQuestionBody.safeParse(req.body);
      if (!parse.success)
        return reply.code(400).send({ error: 'Invalid input', issues: parse.error.issues });

      // Auto-heal: if the cookie has no session row yet (e.g. /start failed
      // silently or the client raced ahead), create one inline so the user
      // never sees session_not_found.
      let session = await loadSession(parse.data.cookie_token);
      if (!session) {
        session = (await upsertSession(parse.data.cookie_token, {})) as typeof session;
      }
      if (!session) return reply.code(500).send({ error: 'session_create_failed' });

      let answers = (session.answers as AnswerEntry[]) ?? [];
      let scratchpad = (session.scratchpad as Scratchpad) ?? {};
      let step = session.current_step ?? 1;

      // Record the answer for the current step (if provided).
      if (parse.data.answer && answers.length < step) {
        const lastQuestion = answers[answers.length - 1]?.question ?? Q1_FIXED;
        const questionForStep =
          answers.length === step - 1
            ? (session as { pending_question?: string }).pending_question ?? lastQuestion
            : lastQuestion;
        answers = [
          ...answers,
          {
            step,
            question: questionForStep,
            answer: parse.data.answer,
            asked_at: new Date().toISOString(),
          },
        ];
        step = step + 1;
      }

      // Ask the agent to compose the next question. Wrap so Claude errors
      // (timeouts, rate limits, malformed JSON) surface as 502 with a clear
      // message instead of a bare 500.
      let result;
      try {
        result = await generateNextQuestion(scratchpad, answers, step);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        req.log.error({ err: message }, 'onboarding next-question agent failed');
        return reply.code(502).send({
          ok: false,
          error: `Agent call failed: ${message}`,
        });
      }
      scratchpad = result.scratchpad;

      await supabase()
        .from('onboarding_sessions')
        .update({
          scratchpad,
          answers,
          current_step: step,
          updated_at: new Date().toISOString(),
        })
        .eq('cookie_token', parse.data.cookie_token);

      return reply.send({
        ok: true,
        step,
        max_step: MAX_QUESTIONS,
        next_question: result.question,
        scratchpad,
        niches_detected: result.niches_detected,
        done: result.done,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      req.log.error({ err: message }, 'onboarding next-question failed');
      return reply.code(500).send({ ok: false, error: message });
    }
  });

  // Run the web-search validation step.
  app.post('/onboard/validate', async (req, reply) => {
    const parse = ValidateBody.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'Invalid input' });

    const session = await loadSession(parse.data.cookie_token);
    if (!session) return reply.code(404).send({ error: 'session_not_found' });

    const scratchpad = (session.scratchpad as Scratchpad) ?? {};
    const companies = await validateAgainstWeb(scratchpad);

    await supabase()
      .from('onboarding_sessions')
      .update({
        validated_companies: companies,
        updated_at: new Date().toISOString(),
      })
      .eq('cookie_token', parse.data.cookie_token);

    return reply.send({ ok: true, companies });
  });

  // Commit: turn the scratchpad into 1..N verticals.
  app.post('/onboard/commit', async (req, reply) => {
    const parse = CommitBody.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'Invalid input', issues: parse.error.issues });

    const session = await loadSession(parse.data.cookie_token);
    if (!session) return reply.code(404).send({ error: 'session_not_found' });
    if (session.status === 'committed') {
      return reply.send({
        ok: true,
        vertical_ids: session.committed_vertical_ids ?? [],
        already_committed: true,
      });
    }

    const scratchpad = (session.scratchpad as Scratchpad) ?? {};
    const ids = await commitVerticals(scratchpad, parse.data.variations, session.validated_companies);

    await supabase()
      .from('onboarding_sessions')
      .update({
        status: 'committed',
        committed_vertical_ids: ids,
        updated_at: new Date().toISOString(),
      })
      .eq('cookie_token', parse.data.cookie_token);

    return reply.send({ ok: true, vertical_ids: ids });
  });

  app.post('/onboard/pause', async (req, reply) => {
    const parse = PauseBody.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'Invalid input' });

    await supabase()
      .from('onboarding_sessions')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('cookie_token', parse.data.cookie_token);

    return reply.send({ ok: true });
  });
}
