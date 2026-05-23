import { supabase, isSupabaseConfigured } from "./supabase";

// ---- Leads ----
export async function saveLeads(leads) {
  if (!isSupabaseConfigured()) return;
  const rows = leads.map((l) => ({
    id: l.id,
    apollo_id: l.id,
    first_name: l.first_name || null,
    last_name: l.last_name || l.last_name_obfuscated || null,
    title: l.title || null,
    email: l.email || l.contact_emails?.[0]?.email || null,
    phone: l.phone_numbers?.[0]?.sanitized_number || l.sanitized_phone || null,
    linkedin_url: l.linkedin_url || null,
    organization_name: l.organization?.name || l.organization_name || null,
    organization_industry: l.organization?.industry || null,
    organization_size: String(l.organization?.estimated_num_employees || ""),
    city: l.city || null,
    country: l.country || null,
    raw_data: l,
  }));
  const { error } = await supabase.from("leads").upsert(rows, { onConflict: "id" });
  if (error) console.error("saveLeads error:", error);
}

export async function getLeads(limit = 100, offset = 0) {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) { console.error("getLeads error:", error); return []; }
  return data.map((r) => ({ ...r.raw_data, ...r }));
}

// ---- Actions ----
export async function saveAction(leadId, actionType, { notes, tags, callOutcome, followUpDate, scriptData } = {}) {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from("actions").insert({
    lead_id: leadId,
    action_type: actionType,
    notes: notes || null,
    tags: tags || [],
    call_outcome: callOutcome || null,
    follow_up_date: followUpDate || null,
    script_data: scriptData || null,
  });
  if (error) console.error("saveAction error:", error);
}

export async function getActions(leadId) {
  if (!isSupabaseConfigured()) return [];
  const query = supabase.from("actions").select("*").order("created_at", { ascending: false });
  if (leadId) query.eq("lead_id", leadId);
  const { data, error } = await query.limit(200);
  if (error) { console.error("getActions error:", error); return []; }
  return data || [];
}

export async function getAllActions() {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from("actions")
    .select("*, leads(*)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) { console.error("getAllActions error:", error); return []; }
  return data || [];
}

// ---- Scripts ----
export async function saveScripts(scriptMap) {
  if (!isSupabaseConfigured()) return;
  const rows = Object.entries(scriptMap).map(([leadId, s]) => ({
    lead_id: leadId,
    opening_line: s.opening_line || null,
    call_script: s.call_script || null,
    cold_email: s.cold_email || null,
    email_subject: s.email_subject || null,
    lead_differentiator: s.lead_differentiator || null,
    objection: s.objection || null,
    why_today: s.why_today || null,
    priority: s.priority || null,
    qualification_score: s.qualification_score || null,
    raw_data: s,
  }));
  const { error } = await supabase.from("scripts").upsert(rows, { onConflict: "lead_id" });
  if (error) console.error("saveScripts error:", error);
}

export async function getScripts(leadIds) {
  if (!isSupabaseConfigured() || !leadIds?.length) return {};
  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .in("lead_id", leadIds);
  if (error) { console.error("getScripts error:", error); return {}; }
  const map = {};
  (data || []).forEach((s) => { map[s.lead_id] = s.raw_data || s; });
  return map;
}

// ---- Search Configs ----
export async function getSearchConfigs() {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from("search_configs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("getSearchConfigs error:", error); return []; }
  return data || [];
}

export async function saveSearchConfig(config) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("search_configs")
    .upsert({ ...config, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) { console.error("saveSearchConfig error:", error); return null; }
  return data;
}

export async function deleteSearchConfig(id) {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from("search_configs").delete().eq("id", id);
  if (error) console.error("deleteSearchConfig error:", error);
}

// ---- Client Settings ----
export async function getSetting(key) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("client_settings")
    .select("setting_value")
    .eq("setting_key", key)
    .single();
  if (error) return null;
  return data?.setting_value || null;
}

export async function setSetting(key, value) {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase
    .from("client_settings")
    .upsert({ setting_key: key, setting_value: value, updated_at: new Date().toISOString() }, { onConflict: "setting_key" });
  if (error) console.error("setSetting error:", error);
}
