# Data-quality tracking — title vs VC mismatches (not securityHold)

**Opened:** 2026-09-21 (Phase 4 sign-off)  
**Rule:** Do not treat FAQ interim disclosures as permanent substitutes for fixing title/VC fields. Do **not** put these on `securityHold` unless fitment risk is confirmed.

| articleNo | Issue | Interim | Proper fix later |
|-----------|--------|---------|------------------|
| **CC-0004** | On `securityHold`: VC model `E170–E210`, years 2014–2026 vs title 2015–2026; stale top-level meta 2017–2020 | Hold unchanged — **do not edit in SEO batches** | Supplier WhatsApp fitment confirmation; then clear hold + align title/VC/meta |
| **CC-0008** | Title years **2015–2024**; VC table **2014–2026** (Corolla E170) | FAQ discloses “table is source of truth” | Align `name` / meta years with VC (or confirm 2015–2024 only with supplier) |
| **CC-RAI-MIR-BAT** | Title says **2025**; VC / shortDescription **2019–present** | FAQ discloses table/years on page as source of truth | Align title to 2019–present (or 2025+ only if supplier confirms) |
| **CC-0157** | Title years **2015–2026**; VC table **2014–2026** (Corolla E170) | FAQ discloses “table is source of truth” | Align product `name` / slug / meta years with VC (or confirm 2015+ only with supplier) |
| **CC-UNI-INT-GKN-TOY** | Title says **universal**; VC has specific Honda/Toyota rows | FAQ discloses use the VC table | Retitle to match VC (drop false “universal”) or clear VC rows if truly universal |

Do not clear `securityHold` on CC-0004 as part of SEO work.
