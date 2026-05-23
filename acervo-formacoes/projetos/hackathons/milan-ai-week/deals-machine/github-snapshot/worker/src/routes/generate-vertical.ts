import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { generateVertical, refineVertical, generateBrainSeed, type GeneratedVertical } from '../vertical-builder/generate';
import { logActivity } from '../lib/activity-log';

const GenerateBody = z.object({
  // New structured input (preferred)
  what_sold: z.string().min(8).max(1000).optional(),
  who_sold_to: z.string().min(8).max(1000).optional(),
  countries: z.array(z.string()).optional(),
  company_sizes: z.array(z.string()).optional(),
  revenue_ranges: z.array(z.string()).optional(),

  // Legacy single-textarea input (kept for backward compat)
  description: z.string().min(20).max(2000).optional(),

  run_id: z.string().uuid().optional(),
  save: z.boolean().default(false),
});

const RefineBody = z.object({
  previous_config: z.object({}).passthrough(),
  // Bumped from 1000 → 8000 to accommodate batched "Apply N selected"
  // requests that bundle the full text of multiple considerations.
  refinement_message: z.string().min(2).max(8000),
  // Considerations the operator has already applied or dismissed across the
  // session — the agent should not re-flag these.
  resolved_considerations: z
    .array(
      z.object({
        text: z.string(),
        action: z.enum(['applied', 'dismissed']),
      })
    )
    .optional(),
  run_id: z.string().uuid().optional(),
});

const SaveBody = z.object({
  generated: z.object({}).passthrough(),
  // When present, UPDATE the existing verticals row instead of inserting.
  // Used by the refine-existing flow so we preserve foreign-key references
  // from brain entries, runs, leads, calls etc.
  update_id: z.string().uuid().optional(),
});

async function ensureRunRow(run_id: string | undefined): Promise<string | undefined> {
  if (!run_id) return undefined;
  const { data } = await supabase().from('runs').select('id').eq('id', run_id).maybeSingle();
  if (data) {
    // Reset to running in case the row was created earlier
    await supabase()
      .from('runs')
      .update({ status: 'running', result_json: null, error_message: null, finished_at: null })
      .eq('id', run_id);
    return run_id;
  }
  await supabase().from('runs').insert({
    id: run_id,
    vertical_id: null,
    status: 'running',
    triggered_by: 'manual',
    started_at: new Date().toISOString(),
  });
  return run_id;
}

async function finishRunRow(
  run_id: string | undefined,
  status: 'complete' | 'failed',
  summary?: string,
  errorMessage?: string,
  resultJson?: unknown,
): Promise<void> {
  if (!run_id) return;
  await supabase()
    .from('runs')
    .update({
      status,
      finished_at: new Date().toISOString(),
      summary: summary ?? null,
      error_message: errorMessage ? errorMessage.slice(0, 500) : null,
      result_json: resultJson ?? null,
    })
    .eq('id', run_id);
}

/**
 * Background generation — runs after we've already responded 202 to the client.
 * Writes the final config to runs.result_json on success.
 */
async function generateInBackground(
  app: FastifyInstance,
  input: z.infer<typeof GenerateBody>,
  run_id: string,
): Promise<void> {
  let result: GeneratedVertical;
  try {
    result = await generateVertical({
      what_sold: input.what_sold,
      who_sold_to: input.who_sold_to,
      countries: input.countries,
      company_sizes: input.company_sizes,
      revenue_ranges: input.revenue_ranges,
      description: input.description,
      run_id,
    });
  } catch (err) {
    app.log.error({ err }, 'vertical-builder background generation failed');
    await finishRunRow(run_id, 'failed', undefined, (err as Error).message);
    return;
  }

  if (!input.save) {
    await finishRunRow(run_id, 'complete', `Generated "${result.display_name}" (preview)`, undefined, {
      kind: 'preview',
      generated: result,
    });
    return;
  }

  // Save flow
  const { data: row, error: insertErr } = await supabase()
    .from('verticals')
    .insert({
      slug: result.slug,
      display_name: result.display_name,
      config: result.config as unknown as object,
      active: true,
    })
    .select('id, slug, display_name')
    .single();

  if (insertErr || !row) {
    await finishRunRow(run_id, 'failed', undefined, insertErr?.message ?? 'no row');
    return;
  }

  try {
    const seed = await generateBrainSeed(result);
    const seedRows = seed.map((entry) => ({
      vertical_id: row.id,
      type: entry.type,
      content: entry.content,
      weight: entry.weight,
      source: 'brain' as const,
    }));
    await supabase().from('brain_entries').insert(seedRows);
    await logActivity({
      run_id,
      vertical_id: row.id,
      type: 'agent_step',
      message: `🧠 Pre-seeded ${seedRows.length} initial brain insights for "${row.display_name}"`,
    });
  } catch (err) {
    app.log.warn({ err }, 'brain pre-seed failed');
    await logActivity({
      run_id,
      vertical_id: row.id,
      type: 'info',
      message: `⚠ Pre-seed brain failed (non-fatal): ${(err as Error).message.slice(0, 100)}`,
    });
  }

  await logActivity({
    run_id,
    vertical_id: row.id,
    type: 'vertical_built',
    message: `✅ Vertical "${row.display_name}" saved (slug: ${row.slug})`,
  });
  await finishRunRow(run_id, 'complete', `Built vertical "${row.display_name}"`, undefined, {
    kind: 'saved',
    generated: result,
    saved: row,
  });
}

export async function generateVerticalRoute(app: FastifyInstance) {
  // ─── Generate (async) ─────────────────────────────────────────────
  app.post('/generate-vertical', async (req, reply) => {
    const parsed = GenerateBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', details: parsed.error.format() });
    }
    const input = parsed.data;

    if (!input.description && !(input.what_sold && input.who_sold_to)) {
      return reply.code(400).send({
        error: 'missing_input',
        message: 'Provide either { what_sold, who_sold_to } or a legacy description',
      });
    }

    // run_id is now required so the client can poll. Generate one if missing.
    const run_id = input.run_id ?? crypto.randomUUID();
    await ensureRunRow(run_id);

    // Fire-and-forget — return immediately so the proxy doesn't time out.
    // The cockpit polls /run-status/:id to discover when result_json is filled.
    generateInBackground(app, input, run_id).catch((err) => {
      app.log.error({ err }, 'background generation crashed unexpectedly');
    });

    return reply.code(202).send({ status: 'running', run_id });
  });

  // ─── Refine (also async) ──────────────────────────────────────────
  app.post('/refine-vertical', async (req, reply) => {
    const parsed = RefineBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', details: parsed.error.format() });
    }
    const { previous_config, refinement_message, resolved_considerations, run_id: providedRunId } = parsed.data;

    const run_id = providedRunId ?? crypto.randomUUID();
    await ensureRunRow(run_id);

    // Fire-and-forget refinement
    (async () => {
      try {
        const result = await refineVertical({
          previous_config: previous_config as GeneratedVertical,
          refinement_message,
          resolved_considerations,
          run_id,
        });
        await finishRunRow(
          run_id,
          'complete',
          `Refined via: "${refinement_message.slice(0, 60)}"`,
          undefined,
          { kind: 'refinement', refinement: result },
        );
      } catch (err) {
        app.log.error({ err }, 'refinement failed');
        await finishRunRow(run_id, 'failed', undefined, (err as Error).message);
      }
    })().catch((err) => {
      app.log.error({ err }, 'refinement background crashed');
    });

    return reply.code(202).send({ status: 'running', run_id });
  });

  // ─── Save a previously-generated vertical ─────────────────────────
  // Skip the multi-step reasoning when the cockpit already has a preview.
  // If `update_id` is present, this is a refine of an existing vertical —
  // update the row in place to preserve foreign keys (brain entries,
  // runs, leads, calls all hang off vertical_id).
  app.post('/save-vertical', async (req, reply) => {
    const parsed = SaveBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', details: parsed.error.format() });
    }
    const result = parsed.data.generated as GeneratedVertical;
    const updateId = parsed.data.update_id;

    let row: { id: string; slug: string; display_name: string } | null = null;

    if (updateId) {
      // Refine path — update in place. We deliberately do NOT touch the slug
      // because URLs / external references key on it.
      const { data: updated, error: updateErr } = await supabase()
        .from('verticals')
        .update({
          display_name: result.display_name,
          config: result.config as unknown as object,
          active: true,
        })
        .eq('id', updateId)
        .select('id, slug, display_name')
        .single();

      if (updateErr || !updated) {
        return reply.code(500).send({ error: 'update_failed', message: updateErr?.message ?? 'no row' });
      }
      row = updated;

      await logActivity({
        run_id: null,
        vertical_id: row.id,
        type: 'vertical_built',
        message: `🔧 Vertical "${row.display_name}" refined and saved`,
      });
    } else {
      // New vertical path — insert.
      const { data: inserted, error: insertErr } = await supabase()
        .from('verticals')
        .insert({
          slug: result.slug,
          display_name: result.display_name,
          config: result.config as unknown as object,
          active: true,
        })
        .select('id, slug, display_name')
        .single();

      if (insertErr || !inserted) {
        return reply.code(500).send({ error: 'save_failed', message: insertErr?.message ?? 'no row' });
      }
      row = inserted;

      // Pre-seed brain (non-fatal) — only on initial save, not on refine.
      try {
        const seed = await generateBrainSeed(result);
        const seedRows = seed.map((entry) => ({
          vertical_id: row!.id,
          type: entry.type,
          content: entry.content,
          weight: entry.weight,
          source: 'brain' as const,
        }));
        await supabase().from('brain_entries').insert(seedRows);
        await logActivity({
          run_id: null,
          vertical_id: row.id,
          type: 'agent_step',
          message: `🧠 Pre-seeded ${seedRows.length} initial brain insights for "${row.display_name}"`,
        });
      } catch (err) {
        app.log.warn({ err }, 'brain pre-seed failed');
      }

      await logActivity({
        run_id: null,
        vertical_id: row.id,
        type: 'vertical_built',
        message: `✅ Vertical "${row.display_name}" saved (slug: ${row.slug})`,
      });
    }

    return reply.send({ saved: row });
  });

  // ─── Run-status polling endpoint ──────────────────────────────────
  app.get<{ Params: { id: string } }>('/run-status/:id', async (req, reply) => {
    const { id } = req.params;
    const { data, error } = await supabase()
      .from('runs')
      .select('id, status, result_json, error_message, summary, finished_at')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return reply.code(500).send({ error: 'lookup_failed', message: error.message });
    }
    if (!data) {
      return reply.code(404).send({ error: 'run_not_found' });
    }
    return reply.send(data);
  });
}
