"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useActiveRuns } from "../lib/hooks";

const TITLES = {
  "/": { label: "Dashboard", eyebrow: "Overview" },
  "/verticals": { label: "Verticals", eyebrow: "Configure" },
  "/intelligence": { label: "Intelligence", eyebrow: "Run the agent" },
  "/agent": { label: "Intelligence", eyebrow: "Run the agent" },
  "/leads": { label: "Leads", eyebrow: "Make the calls" },
  "/pipeline": { label: "Pipeline", eyebrow: "Where the deals live" },
  "/knowledge": { label: "Knowledge", eyebrow: "What the brain learned" },
  "/analytics": { label: "Analytics", eyebrow: "Performance" },
  "/settings": { label: "Settings", eyebrow: "Configuration" },
};

function resolveTitle(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  const match = Object.entries(TITLES).find(([k]) => k !== "/" && pathname.startsWith(k));
  return match ? match[1] : { label: "", eyebrow: "" };
}

export default function TopNav() {
  const pathname = usePathname();
  const { label, eyebrow } = resolveTitle(pathname);
  const { runs: activeRuns } = useActiveRuns();
  const isLive = activeRuns.length > 0;

  return (
    <header
      className="fixed top-0 right-0 left-0 md:left-64 z-50 bg-surface-container-low"
      style={{
        boxShadow: "0 8px 24px -12px rgba(31, 22, 18, 0.08)",
      }}
    >
      <div className="flex items-center justify-between px-6 md:px-8 h-16">
        {/* Page title + eyebrow */}
        <div className="leading-tight min-w-0">
          <div className="eyebrow text-on-surface-variant/60 mb-0.5">{eyebrow}</div>
          <h2 className="text-lg font-headline font-extrabold text-on-surface tracking-tight truncate">
            {label}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Live agent indicator — only renders when something is running */}
          {isLive && (
            <Link
              href="/intelligence"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label text-xs font-bold tracking-tight hover:opacity-90 transition-opacity"
              title={`${activeRuns.length} run${activeRuns.length === 1 ? "" : "s"} active`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75 animate-ping"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
              </span>
              Agent live · {activeRuns.length}
            </Link>
          )}

          <Link
            href="/settings"
            className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
            aria-label="Settings"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">settings</span>
          </Link>

          <div className="relative">
            <div
              className="w-9 h-9 rounded-full metallic-silk flex items-center justify-center text-on-primary font-bold text-[11px] tracking-wider shadow-md ring-2 ring-surface-container-low"
              title="You"
            >
              KD
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
