// Shared formatting helpers. Centralizes the timeAgo + compact-number logic
// that was previously duplicated across half a dozen pages.

export function timeAgo(ts) {
  if (!ts) return "";
  const sec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d ago`;
  if (sec < 86400 * 30) return `${Math.floor(sec / (86400 * 7))}w ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Short relative time — "5s", "12m", "3h", "2d". For tight UIs (coach feed).
export function timeAgoShort(ts) {
  if (!ts) return "";
  const sec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (sec < 5) return "now";
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

// 1234 → "1.2K", 1234567 → "1.2M". Plain ints stay plain under 1000.
export function compactNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "0";
  const v = Number(n);
  if (Math.abs(v) < 1000) return String(v);
  if (Math.abs(v) < 1_000_000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
  if (Math.abs(v) < 1_000_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  return `${(v / 1_000_000_000).toFixed(1)}B`;
}

// Currency — $1,234 / $1.2K / $1.2M. Drops trailing .0.
export function compactCurrency(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "$0";
  const v = Number(n);
  if (Math.abs(v) < 10_000) return `$${v.toLocaleString()}`;
  if (Math.abs(v) < 1_000_000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
  if (Math.abs(v) < 1_000_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  return `$${(v / 1_000_000_000).toFixed(1)}B`;
}
