"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_GROUPS = [
  {
    label: "Operate",
    items: [
      { href: "/", label: "Dashboard", icon: "dashboard" },
      { href: "/verticals", label: "Verticals", icon: "track_changes" },
      { href: "/intelligence", label: "Intelligence", icon: "auto_awesome" },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/leads", label: "Leads", icon: "groups" },
      { href: "/pipeline", label: "Pipeline", icon: "view_kanban" },
      { href: "/knowledge", label: "Knowledge", icon: "psychology" },
    ],
  },
  {
    label: "Measure",
    items: [{ href: "/analytics", label: "Analytics", icon: "insights" }],
  },
];

function BrandMark({ className = "h-8 w-8" }) {
  // Generated brand mark — vintage slot machine with a chrome phone handset
  // lever. Source PNG lives at /public/brand-logo.png so Next.js serves it
  // statically. .brand-glint adds a subtle warmth + brightness boost on
  // hover so the mark "wakes up" when you mouse over the sidebar brand.
  return (
    <img
      src="/brand-logo.png"
      alt="Deals Machine"
      className={`${className} object-contain shrink-0 brand-glint`}
      draggable={false}
    />
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 z-40 shrink-0"
      style={{
        background:
          "linear-gradient(180deg, var(--color-surface-container) 0%, var(--color-surface-container-low) 60%, var(--color-surface-container-low) 100%)",
        boxShadow: "4px 0 24px -8px rgba(31, 22, 18, 0.08)",
      }}
    >
      {/* Branding — no divider; the soft tonal gradient + bg-color step under TopNav handles separation */}
      <Link
        href="/"
        className="flex items-center gap-3 px-6 h-16 group shrink-0"
      >
        <BrandMark className="h-9 w-9 shrink-0 transition-transform duration-300 group-hover:rotate-3" />
        <div className="leading-tight min-w-0">
          <div className="font-headline font-black text-on-surface text-[15px] tracking-tight truncate">
            Deals Machine
          </div>
          <div className="eyebrow text-on-surface-variant/80 mt-0.5">
            B2B Sales OS
          </div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-4 overflow-y-auto px-3 pt-5 pb-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="eyebrow text-on-surface-variant/60 px-3 mb-1.5">
              {group.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-3 px-3 py-2 rounded-lg font-headline text-sm tracking-tight transition-all duration-200 ${
                      active
                        ? "bg-surface-container-highest text-on-surface font-bold shadow-sm"
                        : "text-on-surface/70 hover:bg-surface-container-high/60 hover:text-on-surface font-medium"
                    }`}
                  >
                    {active && (
                      <span
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`material-symbols-outlined text-[20px] ${active ? "text-primary" : ""}`}
                      style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="px-4 pt-3 pb-4 mt-2 border-t border-outline/15 flex flex-col gap-1.5">
        <Link
          href="/verticals?new=1"
          className="gold-shimmer gleam-hover text-on-primary px-4 py-2.5 rounded-xl font-headline font-bold text-[13px] flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-px transition-all duration-200 relative"
        >
          <span className="material-symbols-outlined text-base relative z-[2]">add</span>
          <span className="relative z-[2]">Build a vertical</span>
        </Link>

        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg font-headline text-sm tracking-tight transition-all duration-200 ${
            isActive("/settings")
              ? "bg-surface-container-highest text-on-surface font-bold"
              : "text-on-surface/60 hover:bg-surface-container-high/60 hover:text-on-surface font-medium"
          }`}
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={isActive("/settings") ? { fontVariationSettings: "'FILL' 1" } : {}}
          >
            settings
          </span>
          Settings
        </Link>
      </div>
    </aside>
  );
}
