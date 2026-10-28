# S5 Crawled-not-indexed blogs — dry-run STOP

**Status:** blocked. No DB/content writes.

## Blocked why
Brief requires owner-supplied slugs for “Crawled - currently not indexed” posts. None provided in this loop.

## When unblocked (GO S5 + slug list)
For each slug:
- Expand to 600+ words unique content
- FAQ + FAQPage schema
- 3–5 contextual links to products/categories/cars
- Related guides block back-links from those pages
- Field-level `$set` only after fresh mongodump + FP check
