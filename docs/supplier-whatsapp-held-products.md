# Supplier WhatsApp pack — held products (CC-0168, CC-0004, CC-0019)

**Date:** 2026-09-21  
**Purpose:** Copy-paste into WhatsApp (one chat thread per SKU, or clearly separated messages). Attach a product photo to each if available.  
**Verified against live Mongo** before send — field conflicts below match production.

**Do not clear `securityHold` or reactivate until supplier answers are applied and live-verified.**

---

## Live conflict summary (for you)

| SKU | Status | What’s conflicting |
|-----|--------|-------------------|
| **CC-0168** | `draft` + `securityHold` | Title/short: City **2012–2016** · VC vehicle: **honda-city-classic-2009–2020** |
| **CC-0004** | `active` + `securityHold` (not storefront-selling while held; old URL **308 → CC-COR-MIRROR-3**) | Name **2015–2026** · top-level `metaTitle` **2017–2020** · `seo.metaTitle` **2015–2026** · VC model field **E170–E210** (no clean year row) |
| **CC-0019** | `draft` + `securityHold` | Title/short: Grande **2014–2018** · VC: Corolla E170 **2014–2026** · stale top-level meta still says **2014–2026** |
| **CC-COR-MIRROR-3** | `active` (live replacement landing page) | Name **2014–2026** neon-style indicator · same E170–E210-style VC · **decide: same part as CC-0004 or different SKU?** |

---

## Message 1 — CC-0168 (Honda City mirror cover)

> Assalam-o-Alaikum. I need to confirm the exact fitment for this item before I can list it again:
>
> **Product: Honda City side mirror cover**
> - Our title/short description says it fits **2012–2016 Honda City**
> - Our compatibility list says **2009–2020 Honda City**
>
> These two don't match, so I've taken it off the site until I know the real answer.
>
> Can you please confirm: which exact Honda City years does this mirror cover actually fit? Is it the same part across 2009–2020, or only certain generations (e.g. only 2012–2016)? If it only fits some years, please tell me exactly which ones.
>
> Once you confirm, I'll update the listing to match and put it back on the site.

---

## Message 2 — CC-0004 (Corolla neon side mirror indicator)

> Assalam-o-Alaikum. I need to confirm fitment for this item — there are three different year ranges on our side and I want to get it right:
>
> **Product: Toyota Corolla neon/LED side mirror indicator**
> - Product name says **2015–2026**
> - One of our internal fields says **2017–2020**
> - Our compatibility data is tagged as **Corolla chassis E170–E210** (the generation we treat as roughly **2014–2026**)
>
> Can you please confirm:
> 1. What is the correct year range this part fits?
> 2. Does it fit ONLY the Corolla body style (E170/E180/E210), or does it also fit older Corolla generations (E140/E150)?
> 3. Is there a difference in the part for different years (e.g. 2014–2019 vs 2020–2026), or is it one universal part across the whole range?
>
> **Also important:** we already have another live SKU on the site for a similar Corolla neon-style mirror indicator (**2014–2026** listing). Is that the **same/replacement** part as this one, or a **different** product? If it’s the same, we may retire this old listing instead of bringing it back.
>
> This item has been off the site for a while because of this mismatch — once I have your confirmation I can fix or retire the listing correctly.

---

## Message 3 — CC-0019 (Corolla Grande paddle shifter)

> Assalam-o-Alaikum. Need your help confirming fitment on this one too:
>
> **Product: Toyota Corolla Grande paddle shifter extension**
> - Product title / short description says **2014–2018 Corolla Grande**
> - Our compatibility table says **2014–2026 Corolla**
>
> Can you please confirm:
> 1. Does this paddle shifter fit all Corolla Grande years from 2014 to 2026, or only the earlier facelift (2014–2018)?
> 2. Is "Grande" a specific trim, or does this part fit any Corolla trim in that year range (Altis, GLi, etc.)?
>
> Once confirmed I'll correct the listing and reactivate it.

---

## When answers come back

1. Paste the supplier reply (or screenshot) here — one SKU at a time is ideal.
2. Draft exact title / shortDescription / VC / meta fixes → backup → write → live-verify.
3. Clear `securityHold` and set `active` **only after** corrected data is live (never before).
4. If supplier says “not sure”: narrow fitment to only the years they are confident about — do not guess wide.

### CC-0004 decision tree (after Message 2)

| Supplier says | Likely action |
|---------------|---------------|
| Same as live **CC-COR-MIRROR-3** | Keep redirect; retire/merge CC-0004; do not re-list a duplicate |
| Different part (years/finish/wiring) | Fix CC-0004 fields from their answer; then clear hold + decide whether redirect stays |
| Only confident about a narrow band (e.g. 2017–2020) | List only that band; remove wider claims |
| Can’t confirm | Keep hold; leave CC-COR-MIRROR-3 as the live neon-indicator SKU |
