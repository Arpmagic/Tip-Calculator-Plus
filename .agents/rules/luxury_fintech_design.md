---
title: Luxury Fintech Design Standards (2026 Revolut & Linear Tier)
trigger: always_on
---

# Luxury Fintech Design & UI Invariants

When developing, designing, or refactoring UI components in Tip Calculator Plus+:

## 1. Palette & Surface Tokens
- **Background**: Deep Obsidian `#090D16` / `#0B0F19`. Never use flat grey `#333333` or pure black `#000000` without depth.
- **Card Surfaces**: Frosted Titanium Glass `bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.36)] rounded-2xl` or `rounded-3xl`.
- **Primary CTAs**: Champagne Gold Gradient `bg-gradient-to-r from-[#F5D061] via-[#E6B83D] to-[#C9971E] text-[#090D16] font-semibold tracking-wide shadow-[0_4px_20px_rgba(230,184,61,0.25)] hover:brightness-110 active:scale-[0.98] transition-all`.
- **Secondary CTAs**: Translucent Frosted Glass `bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.12] rounded-2xl active:scale-[0.98] transition-all`.
- **Accent & Verification**: Emerald Glass Glow `bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]`.

## 2. Touch Targets & Ergonomics
- Minimum interactive button height: `48dp` (standard) to `56dp` (primary bottom-zone CTAs).
- Circular touch controls: Minimum `44x44dp` up to `72x72dp` (camera shutter).
- Strict safe area offsets: `.pt-content-safe` and `.pb-content-safe` must wrap scrollable viewport pages to avoid notch/home indicator collisions.

## 3. Clutter Elimination & Typography
- Never display unstructured raw OCR snippets or floating tag debris (`. Eua Chenpifsk LL i 48`, `EUR`, etc.).
- Use clean font hierarchy: `font-display font-black text-2xl/3xl` for Hero totals, `font-mono text-xs uppercase tracking-wider` for labels.
- Tabular figures (`tabular-nums`) on all monetary amounts.
