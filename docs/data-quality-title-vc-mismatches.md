# Data-quality tracking — title vs VC mismatches (not securityHold)

**Opened:** 2026-09-21 (Phase 4 sign-off)  
**Updated:** 2026-09-21 (Batch 3)  
**Rule:** Do not treat FAQ interim disclosures as permanent substitutes for fixing title/VC fields. Do **not** put these on `securityHold` unless fitment risk is confirmed.

| articleNo | Issue | Interim | Proper fix later |
|-----------|--------|---------|------------------|
| **CC-0004** | On `securityHold`: VC model `E170–E210`, years 2014–2026 vs title 2015–2026; stale top-level meta 2017–2020 | Hold unchanged — **do not edit in SEO batches** | Supplier WhatsApp fitment confirmation; then clear hold + align title/VC/meta |
| **CC-0008** | Title years **2015–2024**; VC table **2014–2026** (Corolla E170) | FAQ discloses “table is source of truth” | Align `name` / meta years with VC (or confirm 2015–2024 only with supplier) |
| **CC-RAI-MIR-BAT** | Title says **2025**; VC / shortDescription **2019–present** | FAQ discloses table/years on page as source of truth | Align title to 2019–present (or 2025+ only if supplier confirms) |
| **CC-0157** | Title years **2015–2026**; VC table **2014–2026** (Corolla E170) | FAQ discloses “table is source of truth” | Align product `name` / slug / meta years with VC (or confirm 2015+ only with supplier) |
| **CC-UNI-INT-GKN-TOY** | Title says **universal**; VC has specific Honda/Toyota rows | FAQ discloses use the VC table | Retitle to match VC (drop false “universal”) or clear VC rows if truly universal |
| **CC-0154** | Title years **2020–2026**; VC **2021–present** (Honda City) | FAQ discloses “table is source of truth” | Align title years with VC (or confirm 2020 start with supplier) |
| **CC-0024** | Short copy cites Grande **2017–2021**; VC Corolla **2014–2026** | FAQ discloses table + photos as source of truth | Align shortDescription / title years with VC or Grande-specific row |
| **CC-0095** | Title Reborn **2007–2012**; VC **2006–2012** | FAQ discloses “table is source of truth” | Align title start year with VC (or confirm 2007+ only) |
| **CC-0007** | Title Corolla **2015–2023**; VC E170 **2014–2026** | FAQ discloses “table is source of truth” | Align title years with VC (or confirm narrower band with supplier) |
| **CC-0147** | Title E140 **2008–2013**; VC **2009–2014** | FAQ discloses “table is source of truth” | Align title years with VC |
| **CC-0118** | Title **Yaris** 2020–2026; VC also includes **Yaris Cross** | FAQ discloses table + WhatsApp for Cross | Confirm Cross row with supplier; remove if invalid |
| **CC-0146** | Title E170 **2014–2020**; VC **2014–2026** | FAQ discloses “table is source of truth” | Align title end year with VC |
| **CC-0088** | Title City **2021–2025**; VC **2021–present** | FAQ discloses “table is source of truth” | Align title with VC (or confirm 2025 end with supplier) |
| **CC-0155** | Title City **2020–2026**; VC **2021–present** | FAQ discloses “table is source of truth” | Align title years with VC (same pattern as CC-0154) |
| **CC-0127** | Title mixes **2012** / **2008–2013**; VC E140 **2009–2014** | FAQ discloses “table is source of truth” | Clean title years to match VC |

Do not clear `securityHold` on CC-0004 as part of SEO work.
