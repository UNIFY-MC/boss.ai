"use client";
// Unified empty-state primitive. Two sizes:
//   <EmptyState size="lg" />  — full-card; for page-level empties
//   <EmptyState size="sm" />  — inline; for panels inside a card
//
// Always icon + headline + (optional) body + (optional) CTA. Never raw italic
// text. The icon pill sits in a soft gold-rim square so empties feel intentional.

import Link from "next/link";

export default function EmptyState({
  icon = "info",
  title,
  body,
  cta,
  ctaHref,
  onCtaClick,
  size = "lg",
  tone = "neutral",
  className = "",
}) {
  const isSm = size === "sm";

  const containerCls = isSm
    ? "px-5 py-6 text-center"
    : "px-6 py-12 text-center bg-surface-container-low rounded-2xl editorial-shadow";

  const iconWrapCls = isSm
    ? "inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2.5"
    : "inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4";

  const iconSize = isSm ? "text-[20px]" : "text-[28px]";

  const titleCls = isSm
    ? "font-headline font-bold text-[13.5px] text-on-surface mb-1 tracking-tight"
    : "font-headline font-extrabold text-lg text-on-surface mb-1.5 tracking-tight";

  const bodyCls = isSm
    ? "font-label text-[12px] text-on-surface-variant leading-snug max-w-[34ch] mx-auto"
    : "font-label text-[13.5px] text-on-surface-variant leading-relaxed max-w-md mx-auto mb-5";

  const iconBg =
    tone === "gold"
      ? "bg-surface-container-lowest gold-rim"
      : "bg-surface-container-high";

  return (
    <div className={`${containerCls} ${className}`}>
      <div className={`${iconWrapCls} ${iconBg}`}>
        <span
          className={`material-symbols-outlined text-on-surface-variant ${iconSize}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      {title && <div className={titleCls}>{title}</div>}
      {body && <p className={bodyCls}>{body}</p>}
      {cta && (ctaHref || onCtaClick) && (
        <CtaButton size={size} href={ctaHref} onClick={onCtaClick}>
          {cta}
        </CtaButton>
      )}
    </div>
  );
}

function CtaButton({ size, href, onClick, children }) {
  const isSm = size === "sm";
  const base = isSm
    ? "font-label text-[12.5px] font-bold text-primary hover:underline inline-flex items-center gap-1"
    : "metallic-silk gleam-hover text-on-primary px-5 py-2.5 rounded-2xl font-headline font-bold text-sm shadow-lg hover:-translate-y-px transition-all inline-flex items-center gap-2";

  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
        {!isSm && (
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        )}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={base}>
      {children}
    </button>
  );
}
