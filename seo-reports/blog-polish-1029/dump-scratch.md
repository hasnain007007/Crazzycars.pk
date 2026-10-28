# BLOG-POLISH mongodump + scratch restore (pre-write)

**When:** 2026-10-28T23:25:48Z  
**Host DB:** `sialkot_motorsports` via `docker exec sialkot-mongo`  
**Fingerprint gate (apply later):** `84143ac0cb2c3085` · never Atlas `317ae4de8eb24f84`

## Dump

- Archive: `/data/crazzycars/mongo/blog-polish-dryrun-20261028T232548Z.archive` (gzip mongodump, **11M**)
- Live counts at dump: products **430**, blogposts **38** (published **32**), orders **603**, categories **84**

## Scratch restore test

- Target DB: `blog_polish_scratch_20261028T232548Z`
- Result: **108688** document(s) restored successfully; **0** failed
- Scratch counts: products 430, blogposts 38, publishedBlogs 32, orders 603, categories 84
- Scratch DB dropped after verify

## Content writes

**None.** Dump/scratch only — awaiting `GO BLOG-POLISH`.
