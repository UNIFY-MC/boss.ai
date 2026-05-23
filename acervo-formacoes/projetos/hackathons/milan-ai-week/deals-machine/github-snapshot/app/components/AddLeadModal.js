"use client";
// AddLeadModal — manually create a lead with the same shape as Apollo-sourced
// rows (see worker/src/pipeline/steps/generate-scripts.ts for the insert that
// the agent runs). Lets the operator drop a lead in by hand from LinkedIn,
// referral, inbound email, etc. without spinning up the full pipeline.

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useVerticals } from "@/app/lib/hooks";
import { useToast } from "./Toast";

export default function AddLeadModal({ defaultVerticalId = null, onClose, onCreated }) {
  const toast = useToast();
  const { verticals, loading: verticalsLoading } = useVerticals();
  const [form, setForm] = useState({
    vertical_id: defaultVerticalId || "",
    name: "",
    title: "",
    company: "",
    location: "",
    phone: "",
    email: "",
    domain: "",
    pain_level: "",
    trigger_event: "",
    memory_summary: "",
    deal_value_usd: "",
    next_action: "",
    next_action_due: "",
    pipeline_stage: "new",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  // Auto-select the only vertical if there's just one — saves a click.
  useEffect(() => {
    if (!form.vertical_id && verticals.length === 1) {
      setForm((f) => ({ ...f, vertical_id: verticals[0].id }));
    }
  }, [verticals, form.vertical_id]);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    if (!supabase) return;
    setError(null);

    if (!form.vertical_id) {
      setError("Pick a vertical for this lead.");
      return;
    }
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.phone.trim() && !form.email.trim()) {
      setError("Add a phone or email — leads need at least one way to reach them.");
      return;
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const painNum =
        form.pain_level === "" ? null : Math.max(0, Math.min(10, Number(form.pain_level)));
      const row = {
        vertical_id: form.vertical_id,
        run_id: null,
        name: form.name.trim() || null,
        title: form.title.trim() || null,
        company: form.company.trim() || null,
        location: form.location.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        domain: form.domain.trim() || null,
        pain_level: Number.isFinite(painNum) ? painNum : null,
        trigger_event: form.trigger_event.trim() || null,
        memory_summary: form.memory_summary.trim() || null,
        deal_value_usd: form.deal_value_usd === "" ? null : Number(form.deal_value_usd),
        next_action: form.next_action.trim() || null,
        next_action_due: form.next_action_due || null,
        pipeline_stage: form.pipeline_stage,
        pipeline_stage_at: nowIso,
        status: "new",
      };
      const { data, error: insErr } = await supabase
        .from("leads")
        .insert(row)
        .select(
          "id, vertical_id, run_id, name, title, company, location, phone, email, domain, status, pain_level, hubspot_id, pushed_at, memory_summary, deal_value_usd, next_action, next_action_due, pipeline_stage, pipeline_stage_at, trigger_event, account_id, created_at, updated_at"
        )
        .single();
      if (insErr) throw new Error(insErr.message);
      onCreated?.(data);
      toast.success("Lead added");
    } catch (err) {
      setError(err.message);
      toast.error("Couldn't add lead", { detail: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel relative w-full max-w-2xl rounded-3xl editorial-shadow-lg animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-7 pt-6 pb-4 border-b border-outline/10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="eyebrow text-on-surface-variant mb-1.5">Add lead</div>
            <div className="font-headline text-xl font-bold text-on-surface tracking-tight">
              New custom lead
            </div>
            <div className="font-label text-[12px] text-on-surface-variant mt-0.5">
              Mirrors the shape of Apollo-sourced leads. Lands in the list immediately.
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
          </button>
        </div>

        {/* Form */}
        <div className="p-7 space-y-4 overflow-y-auto">
          {/* Vertical */}
          <div>
            <label className="eyebrow text-on-surface-variant mb-2 block">
              Vertical <span className="text-error">*</span>
            </label>
            <select
              value={form.vertical_id}
              onChange={setField("vertical_id")}
              disabled={verticalsLoading}
              className="w-full px-4 py-2.5 rounded-xl border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[14px]"
            >
              <option value="">{verticalsLoading ? "Loading…" : "Pick a vertical"}</option>
              {verticals.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.display_name || v.slug}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Name"
              required
              value={form.name}
              onChange={setField("name")}
              inputRef={firstFieldRef}
              placeholder="First Last"
            />
            <Field
              label="Title"
              value={form.title}
              onChange={setField("title")}
              placeholder="Head of Operations"
            />
            <Field
              label="Company"
              value={form.company}
              onChange={setField("company")}
              placeholder="Acme Corp"
            />
            <Field
              label="Location"
              value={form.location}
              onChange={setField("location")}
              placeholder="Berlin, DE"
            />
            <Field
              label="Phone"
              value={form.phone}
              onChange={setField("phone")}
              placeholder="+1 555 123 4567"
              type="tel"
            />
            <Field
              label="Email"
              value={form.email}
              onChange={setField("email")}
              placeholder="name@company.com"
              type="email"
            />
            <div className="md:col-span-2">
              <Field
                label="Website / domain"
                value={form.domain}
                onChange={setField("domain")}
                placeholder="acme.com"
              />
            </div>
          </div>

          {/* Signal block — matches what the Apollo pipeline writes */}
          <div className="pt-2">
            <div className="eyebrow text-on-surface-variant/70 mb-3">Signal</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Pain level (0–10)"
                value={form.pain_level}
                onChange={setField("pain_level")}
                placeholder="7"
                type="number"
              />
              <Field
                label="Trigger event"
                value={form.trigger_event}
                onChange={setField("trigger_event")}
                placeholder="Posted on LinkedIn about charter capacity"
              />
            </div>
          </div>

          {/* CRM block */}
          <div className="pt-2">
            <div className="eyebrow text-on-surface-variant/70 mb-3">CRM</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="eyebrow text-on-surface-variant mb-2 block">Pipeline stage</label>
                <select
                  value={form.pipeline_stage}
                  onChange={setField("pipeline_stage")}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[14px]"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="meeting_set">Meeting set</option>
                  <option value="demo">Demo</option>
                  <option value="negotiating">Negotiating</option>
                  <option value="closed_won">Closed won</option>
                  <option value="closed_lost">Closed lost</option>
                </select>
              </div>
              <Field
                label="Deal value (USD)"
                value={form.deal_value_usd}
                onChange={setField("deal_value_usd")}
                placeholder="25000"
                type="number"
              />
              <Field
                label="Next action"
                value={form.next_action}
                onChange={setField("next_action")}
                placeholder="Follow up Tuesday after demo"
              />
              <Field
                label="Due"
                value={form.next_action_due}
                onChange={setField("next_action_due")}
                type="date"
              />
            </div>
          </div>

          <div>
            <label className="eyebrow text-on-surface-variant mb-2 block">
              Memory summary (what the brain knows)
            </label>
            <textarea
              value={form.memory_summary}
              onChange={setField("memory_summary")}
              rows={4}
              placeholder="Why this lead matters, where they came from, any prior context. The agent uses this when drafting follow-ups and scripting calls."
              className="w-full px-4 py-3 rounded-xl border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[14px] leading-[1.6] resize-y"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-error-container/60 border border-error/30 px-4 py-3 font-label text-sm text-on-error-container flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-headline font-semibold text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="metallic-silk gleam-hover text-on-primary px-6 py-3 rounded-xl font-headline font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-px transition-all inline-flex items-center gap-2.5"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  Adding…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Add lead
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", inputRef, required }) {
  return (
    <div>
      <label className="eyebrow text-on-surface-variant mb-2 block">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[14px]"
      />
    </div>
  );
}
