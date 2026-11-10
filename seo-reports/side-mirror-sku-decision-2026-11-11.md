# Side-mirror LED vs Neon pair — SKU decision (2026-11-11)

**Verdict: RETAIN BOTH CANONICAL PAGES. Redirect BLOCKED.**

| Field | LED Indicators (parent) | Neon Indicator Pair |
| --- | --- | --- |
| URL | `/toyota-corolla-2014-2026-side-mirror-led-indicators` | `/toyota-corolla-2015-2026-led-side-mirror-neon-indicator-pair` |
| Live HTTP | **200** | **200** |
| Canonical | self | self |
| Title | Corolla 2014-2026 Side LED Indicators \| Price in PKR | Corolla 2015-2026 LED Side Neon Indicator \| Price in PKR |
| Schema name | Toyota Corolla 2014-2026 Side Mirror LED Indicators | Toyota Corolla 2015-2026 LED Side Mirror Neon Indicator Pair |
| SKU / MPN | **CC-COR-MIRROR-3** | **CC-0004** |
| Offer price | **PKR 8500.00** | **PKR 6500.00** |
| Availability | InStock | InStock |
| Product type | Multi-variant parent (meta: choose Neon, Sequential or RGB Dragon at checkout) | Neon-only pair |
| Images | Distinct main + gallery (`…side-mirror-led-indicators-main-52753b5167…`) | Distinct neon pair gallery (`…neon-indicator-pair-1-21fb988ce1…`) |
| Fitment years in copy | 2014–2026 (E170/E210) | 2015–2026 |

## Decision

These are **not** the same product. A 301 from the LED parent to the neon pair would send customers from a variant chooser (Neon/Sequential/RGB) to a single neon SKU at a different price.

**Action taken in release candidate:** removed the `DELETED_URL_REDIRECTS` entry that would have retired the LED PDP.

**Mongo:** no status changes, no deletes.
