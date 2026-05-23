"use client";
// EditLeadModal — single-pane editor for every lead field the operator
// might need to fix mid-call. Updates the leads table directly via
// Supabase (RLS is allow_all on the table, same as everywhere else).

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "./Toast";

export default function EditLeadModal({ lead, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: lead?.name ?? "",
    title: lead?.title ?? "",
    company: lead?.company ?? "",
    location: lead?.location ?? "",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    domain: lead?.domain ?? "",
    memory_summary: lead?.memory_summary ?? "",
    deal_value_usd: lead?.deal_value_usd ?? "",
    next_action: lead?.next_action ?? "",
    next_action_due: lead?.next_action_due ?? "",
    pipeline_stage: lead?.pipeline_stage ?? "new",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    if (!lead?.id || !supabase) return;
    setSaving(true);
    setError(null);
    try {
      const stageChanged = form.pipeline_stage !== (lead?.pipeline_stage ?? "new");
      const patch = {
        name: form.name.trim() || null,
        title: form.title.trim() || null,
        company: form.company.trim() || null,
        location: form.location.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        domain: form.domain.trim() || null,
        memory_summary: form.memory_summary.trim() || null,
        deal_value_usd: form.deal_value_usd === "" ? null : Number(form.deal_value_usd),
        next_action: form.next_action.trim() || null,
        next_action_due: form.next_action_due || null,
        pipeline_stage: form.pipeline_stage,
        ...(stageChanged ? { pipeline_stage_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      };
      const { error: updErr } = await supabase
        .from("leads")
        .update(patch)
        .eq("id", lead.id);
      if (updErr) throw new Error(updErr.message);
      onSaved?.({ ...lead, ...patch });
      toast.success("Lead updated");
    } catch (err) {
      setError(err.message);
      toast.error("Couldn't save lead", { detail: err.message });
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
            <div className="eyebrow text-on-surface-variant mb-1.5">Edit lead</div>
            <div className="font-headline text-xl font-bold text-on-surface tracking-tight">
              {lead?.name || "Lead details"}
            </div>
            <div className="font-label text-[12px] text-on-surface-variant mt-0.5">
              Update what the agent has on file. Changes save instantly.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Name"
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
              rows={5}
              placeholder="Captured from prior calls + notes. The agent uses this when drafting follow-ups and scripting future calls."
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
                  Saving…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Save changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", inputRef }) {
  return (
    <div>
      <label className="eyebrow text-on-surface-variant mb-2 block">{label}</label>
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
