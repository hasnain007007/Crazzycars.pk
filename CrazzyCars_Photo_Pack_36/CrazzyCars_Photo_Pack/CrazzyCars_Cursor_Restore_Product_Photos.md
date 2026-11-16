# Cursor prompt — restore CrazzyCars.pk product photos

Paste this prompt into Cursor with the CrazzyCars repository open. Attach or extract the supplied photo ZIP into the workspace first. The package includes `manifest.json`, `product-image-map.csv`, `SHA256SUMS.txt`, `index.html`, and `images/<SKU>/`.

---

You are working on the owner's CrazzyCars.pk store. Product images were lost during a VPS migration. Restore the attached replacement images to the correct products, carry out the authorized reversible media work, and verify the results. Do not stop after producing an audit or plan. Do not claim completion for items you could not verify.

## Scope and input

This handoff uses the FIRST completed photo pack: 18 products and 36 PNG files, two files per SKU: `01-product.png` and `02-detail.png`. No later third-view images are included. Use the actual manifest and hashes as the input authority. These images are AI-generated research reconstructions with CrazzyCars.pk branding and a reconstruction disclosure. They are not recovered stock photographs. The owner approved the visual direction and asked for this media restoration. That approval does not prove every reference's physical fitment, color or pack contents. Do not generate any more photos.

Target SKUs: CC-0231, CC-0230, CC-0229, CC-0228, CC-0227, CC-0226, CC-0225, CC-0222, CC-0224, CC-0223, CC-0221, CC-0220, CC-0219, CC-0217, CC-0218, CC-0216, CC-0212, CC-0213.

Use the product titles in the manifest. Search drafts, archived/private records and paginated admin results, not just the public storefront API. These were draft products in the supplied admin screenshots; absence from a public API is not proof that the records are missing. Do not create duplicate products or invent missing SKUs.

## 1. Identify the correct environment

Read repository instructions and inspect the existing admin, storefront and media-upload implementation. Reuse supported authenticated admin/API paths or the repository's established media migration utilities. Use direct database writes only when the project already supports that route and the exact target can be verified.

Before any mutation, establish the chain from `crazzycars.pk` to the running storefront/admin services and their actual database and media storage. This workspace may contain configurations for other stores. Historically the CrazzyCars database was `crazzycars_motorsports`; verify current runtime configuration rather than relying on that name alone. Do not accidentally write to Sialkot, Gujranwala, AutoAesthetic or a stale local/Atlas database. Do not print credentials, connection strings, tokens or customer information.

If target identity or required access is genuinely unavailable, finish the local mapping, checks and prepared importer; report that precise blocker. Do not switch to another database or silently manufacture access.

## 2. Validate inputs and product mapping

Locate the extracted package within the workspace. If only the ZIP is present, extract it safely to a new task folder. If the owner used the four smaller standalone ZIPs, extract ALL FOUR into the SAME parent folder and merge the shared `CrazzyCars_Photo_Pack` directory. Validate each PNG's SHA-256, format, dimensions and SKU mapping using the manifest. There must be 18 unique SKU groups with two images each, 36 unique images total. Report any missing/corrupt input instead of substituting another product's image. The ChatGPT download link is only for obtaining the ZIP; do not hotlink it as a website image or rely on Cursor accessing the owner's ChatGPT session.

Match each target by exact SKU and confirm title and vehicle generation. Compare the images and manifest review notes with the record's description, options and existing valid photos. Never replace one of these draft SKU matches with a similarly titled older active SKU; related active products were research references only.

Keep these distinctions explicit:

- City 2009–2020 / 2009–2018 kits and Pakistan City 2021+ kits have different shapes. CC-0222 and CC-0225 share a researched old-City kit reference, so verify their actual SKU distinction and contents.
- Pakistan City 2021+ is the local sixth-generation body; do not substitute the global seventh-generation cabin or generic Civic trims.
- Civic Reborn 2006–2011 is eighth generation. Civic 2022–2026 trims are eleventh generation. Do not mix Civic X imagery into these records.
- CC-0219 depicts two small top-of-dashboard demister vent rings selected from a related listing. Confirm that this is the draft SKU's intended part, not long honeycomb dash strips.
- CC-0216 depicts an RHD front window-control cover pair. It does not certify a four-piece stock pack or every switch layout.
- CC-0213 requires the newer five-button key shape: lock, unlock, remote start, trunk and panic. Do not substitute an older three-button cover or claim that every Pakistani Civic has that key.
- CC-0226 depicts one two-sided gray/yellow towel; “2-in-1” does not mean a two-towel pack. No GSM claim is established.
- The lion's silver finish, generic push-start lid shape and MG clip geometry are reference selections. Confirm actual stock details before public promotion. Do not make safety or belt-alarm-bypass claims.

Do not rewrite fitment, material, dimensions, package quantity or compatibility claims merely to match a generated picture. Carbon-look imagery does not prove real structural carbon fiber.

For exact matched draft records, attach the supplied candidates for owner preview with their reconstruction disclosure and retain the draft state. Record the unresolved stock checks in the restoration report; do not treat successful draft attachment as fitment verification. If a picture clearly contradicts the record, skip that picture and record why. Do not publish draft products automatically.

For a target that is now live, use only images whose part/variant mapping is supported by the record and references. When stock identity remains uncertain, do not promote that reconstruction to the public primary/OG image. Keep the candidate in the review handoff and continue other safe matches.

## 3. Back up and prepare a reviewable change set

Create a timestamped restoration folder, for example `seo-reports/product-image-restoration-<timestamp>/`. Save only the relevant product/media fields needed to restore the 18 target records: IDs, SKUs, titles, slugs, publication states, primary/gallery image order, alt text, OG references and media metadata. Back up any existing file before replacing it. Avoid broad database exports containing unrelated private data.

Create `before.json`, `proposed-changes.json`, `mapping.csv` and an exact rollback command/script using the project's normal conventions. Include existing publication state and a reason for every primary-image change. A dry-run stage must show the exact records and files affected; then carry out the in-scope media changes without another routine confirmation request.

Use stable asset names and SHA-256 checks so rerunning the task skips unchanged files and does not duplicate gallery entries. Do not execute a broad media cleanup or delete unmatched files.

## 4. Upload and attach the images

Use original PNG bytes, correct `image/png` content type, original aspect ratio and the generated dimensions recorded in the manifest. Do not convert to WebP/JPEG, upscale, crop away watermarks/disclosures, or apply lossy recompression. The supplied generated masters are 1254 × 1254 pixels; do not call them recovered originals or 4K assets.

Use this order for accepted images:

1. `01-product.png` — main product candidate.
2. `02-detail.png` — alternate/detail view.

Preserve existing healthy original gallery assets and their useful order. Replace only confirmed broken/blank primary references when the new candidate is a supported match. If a primary is already healthy, keep it and add accepted new images as supplementary views. Check failed media with a real GET before declaring it dead; a failed HEAD alone is insufficient. Keep removed broken references in the backup.

Use the product name as image alt text (add ` - detail` only for non-main gallery images). Do **not** use “reconstructed”, “illustrated”, “visual”, “branding”, or “ai-generated” in customer-facing alt text — the admin/API reject those phrases and the storefront strips them. Never label generated imagery as a verified photograph of physical stock. Preserve the embedded CrazzyCars.pk logo watermarks and small reconstruction disclosure in the PNG bytes only (not in alt text).

Keep product titles, SKUs, prices, descriptions, inventory, vehicle associations, canonical URLs and publication states unchanged. This is a media restoration task, not a catalogue migration or a growth strategy. Do not post to social media or modify site-wide hero banners.

Only change OG/media-derived structured-data references when they are broken and should follow an accepted restored primary under the existing app behavior. Do not overwrite a healthy custom OG selection. Do not fabricate product data or Google indexation claims.

## 5. Align the photos on the main website

Check product cards, vehicle/category listings, search results, the product-detail gallery and mobile thumbnails using the same shared image components already used by this site. Associate every image with the correct exact SKU; do not apply one car generation's trim images to another car. Model-specific trims stay with their intended vehicle; do not fill them with generic universal products.

Render the full square artwork inside a consistent square container using centered `object-fit: contain`, a neutral background and proportional sizing. Do not stretch, squash, crop off product edges, or crop out the logo/reconstruction footer with `object-fit: cover`. Keep the master PNG intact; adjust the presentation container when required. Preserve usable responsive layout and avoid layout shift by providing correct intrinsic dimensions or aspect ratio. Keep thumbnails, selected image, gallery order and modal/zoom behavior in sync. Provide an appropriate loading/error fallback without hiding broken-image issues from the restoration report. Do not redesign the storefront or change unrelated layouts. If the existing component already satisfies these requirements, reuse it without gratuitous code changes.

## 6. Verify end to end

Read back each changed product through the actual admin/data interface. For every uploaded master, GET the final URL and verify HTTP success, `image/png`, valid PNG decoding, recorded dimensions and byte hash. If the application routes masters through a transformation endpoint, verify the original master separately and report the delivery behavior rather than claiming byte identity for a transformed response.

Check the admin listing thumbnail and product editor gallery for draft products. For live products, verify the actual storefront primary/gallery order, displayed fitment, mobile layout and relevant OG/structured-data image references. Do not publish a draft just to make a public verification URL available.

Use the repository's required checks for any code change. If the existing media workflow already works, do not rebuild or redeploy application code unnecessarily. If a code fix is required, keep it narrowly scoped, run appropriate checks, and use the verified CrazzyCars deployment process with a rollback path.

Re-read changed records after cache invalidation or deployment where applicable. Confirm unrelated fields and publication states remained unchanged. Re-running the importer must be a no-op for already applied files.

Retry transient failures with bounded retries. Continue through independent products; do not stop the whole batch because one SKU needs a stock check. Keep unresolved products untouched where the proposed image would misrepresent the part. Never claim success without readback evidence.

## 7. Final output

Produce `REPORT.md`, `before.json`, `after.json`, `mapping.csv`, `verification.json` and a usable rollback script in the restoration folder. Report:

- Expected inputs, validated PNG count and matched SKU count.
- Images uploaded, attached to drafts, added to live galleries, or used to restore broken primaries.
- Every skipped image/product and its exact reason.
- Remaining stock/fitment checks, separately from completed media work.
- Verified target domain/services/database name without secrets.
- Verification results and rollback location.
- Any actual code/deployment change, or a clear statement that no code deployment was needed.

Execute until every in-scope SKU is either restored and verified or recorded with a specific unresolved blocker. A plan, successful upload alone, or public-API lookup alone does not complete the task.
