# DECISIONS

| ID | Decision | Rationale | Date |
| --- | --- | --- | --- |
| D1 | No production deploy from this remediation branch without owner GO | Mission §1.1 / §7 overrides auto-ship habit | 2026-11-11 |
| D2 | No Mongo writes from local Atlas `.env.local` | Wrong fingerprint (`317ae4de8eb24f84`) | 2026-11-11 |
| D3 | Code-level title-model conflict filter on vehicle hubs | Protects UX/SEO while data migration awaits approval; does not invent fitment | 2026-11-11 |
| D4 | Mongo name `$not` guard for Splitters forbidden tokens | Aligns listing counts with UI; data still needs category cleanup | 2026-11-11 |
| D5 | Do not auto-remove multi-gen Swift VC rows that include 2025 | Insufficient evidence of wrong physical fitment | 2026-11-11 |
| D6 | Prefer dry-run data fixes over inventing compatibility | Mission C3/C6 | 2026-11-11 |
| D7 | Leave uncommitted AnalyticsScripts.jsx out of this branch work | Unrelated conversion behaviour | 2026-11-11 |
