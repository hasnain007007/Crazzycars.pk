#!/usr/bin/env bash
# Rewrite forbidden "reconstructed … branding" image alts on 19 live products.
# Dry-run by default. Set APPLY=1 to write.
#
# Rules:
#   - Target DB: crazzycars_motorsports only (path fingerprint 187aad8c44fe3a84)
#   - Backup: timestamped mongodump of the touched docs + scratch restore test
#   - Write: field-level $set of media.images[i].altText only
#   - Alt: index 0 = product name; index >= 1 = "{name} - detail"
#   - No file renames, no other field updates
set -euo pipefail

LIVE_DB=crazzycars_motorsports
LIVE_PATH_URI="mongodb://sialkot-mongo:27017/${LIVE_DB}"
LIVE_FP=187aad8c44fe3a84
LEGACY_FP=84143ac0cb2c3085
ATLAS_FP=317ae4de8eb24f84
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_ROOT=${BACKUP_ROOT:-/data/crazzycars-mongo-backups}
BACKUP_DIR="${BACKUP_ROOT}/alt-rewrite-${STAMP}"
SCRATCH_DB="cc_alt_scratch_${STAMP}"
DUMP_IN_CONTAINER="/tmp/alt-rewrite-dump-${STAMP}"
QUERY_IN_CONTAINER="/tmp/alt-rewrite-query-${STAMP}.json"
APPLY_JS_HOST=""
APPLY_JS_CONTAINER="/tmp/alt-rewrite-apply-${STAMP}.js"
APPLY=${APPLY:-0}
MEXEC=/opt/sialkot/scripts/mexec

ARTICLE_NOS=(
  CC-0212 CC-0213 CC-0216 CC-0217 CC-0218 CC-0219 CC-0220 CC-0221 CC-0222 CC-0223
  CC-0224 CC-0225 CC-0226 CC-0227 CC-0228 CC-0229 CC-0230 CC-0231 CC-0283
)

PATH_FP=$(printf '%s' "$LIVE_PATH_URI" | sha256sum | cut -c1-16)
if [ "$PATH_FP" != "$LIVE_FP" ]; then
  echo "REFUSE path fingerprint $PATH_FP != $LIVE_FP" >&2
  exit 2
fi

STORE_URI=$(docker inspect crazzycars-store --format '{{range .Config.Env}}{{println .}}{{end}}' | awk -F= '/^MONGODB_URI=/{print substr($0,index($0,"=")+1)}')
STORE_DB=$(printf '%s' "$STORE_URI" | awk -F/ '{print $NF}' | cut -d? -f1)
STORE_HOST=$(printf '%s' "$STORE_URI" | sed -E 's#mongodb(\+srv)?://([^@]+@)?([^:/]+).*#\3#')
STORE_FP=$(printf '%s' "$STORE_URI" | sha256sum | cut -c1-16)
if [ "$STORE_DB" != "$LIVE_DB" ] || [ "$STORE_HOST" != "sialkot-mongo" ]; then
  echo "REFUSE store target db=$STORE_DB host=$STORE_HOST (want $LIVE_DB @ sialkot-mongo)" >&2
  exit 2
fi
if [ "$STORE_FP" = "$ATLAS_FP" ] || [ "$STORE_FP" = "$LEGACY_FP" ]; then
  echo "REFUSE forbidden store fingerprint $STORE_FP" >&2
  exit 2
fi
echo "OK gate path_fp=$LIVE_FP db=$LIVE_DB host=sialkot-mongo store_env_fp=$STORE_FP"

mkdir -p "$BACKUP_DIR"
echo "BACKUP_DIR=$BACKUP_DIR"

# mongodump query by articleNo (no ObjectId Extended JSON needed)
python3 - <<PY
import json
arts = """${ARTICLE_NOS[*]}""".split()
assert len(arts) == 19, arts
open("$BACKUP_DIR/query.json", "w").write(json.dumps({"articleNo": {"\$in": arts}}))
print("query articles", len(arts))
PY
docker cp "$BACKUP_DIR/query.json" "sialkot-mongo:${QUERY_IN_CONTAINER}"

echo "=== plan (before) ==="
$MEXEC gm_root mongosh "$LIVE_DB" --quiet --eval "
  const arts = $(python3 -c 'import json; print(json.dumps("""'"${ARTICLE_NOS[*]}"'""".split()))');
  const rows = db.products.find(
    { articleNo: { \$in: arts } },
    { articleNo: 1, name: 1, slug: 1, status: 1, pricing: 1, 'media.images': 1, updatedAt: 1 }
  ).sort({ articleNo: 1 }).toArray();
  if (rows.length !== 19) { print('REFUSE expected 19 products, got ' + rows.length); quit(2); }
  let imgs = 0;
  const changes = [];
  for (const p of rows) {
    const images = (p.media && p.media.images) || [];
    for (let i = 0; i < images.length; i++) {
      const before = String(images[i].altText || '');
      if (!/reconstructed/i.test(before)) continue;
      imgs++;
      const name = String(p.name || '').trim();
      const after = i === 0 ? name : (name + ' - detail');
      changes.push({
        _id: String(p._id),
        articleNo: p.articleNo || '',
        name,
        slug: p.slug || '',
        index: i,
        isMain: !!images[i].isMain,
        url: String(images[i].url || ''),
        file: String(images[i].url || '').split('/').pop(),
        before,
        after,
      });
    }
  }
  if (imgs !== 38) { print('REFUSE expected 38 reconstructed images, got ' + imgs); quit(2); }
  print(JSON.stringify({
    fingerprint: '$LIVE_FP',
    db: '$LIVE_DB',
    products: rows.length,
    images: imgs,
    docs: rows,
    changes,
  }, null, 2));
" >"$BACKUP_DIR/before-plan.json"

python3 - <<PY
import json
from pathlib import Path
data = json.loads(Path("$BACKUP_DIR/before-plan.json").read_text())
assert data["products"] == 19 and data["images"] == 38
c0, c1 = data["changes"][0], data["changes"][1]
print(f"plan ok; sample: [{c0['index']}] {c0['after']!r} / [{c1['index']}] {c1['after']!r}")
PY

echo "=== mongodump 19 products ==="
$MEXEC sialkot_backup mongodump \
  --db="$LIVE_DB" \
  --collection=products \
  --queryFile="$QUERY_IN_CONTAINER" \
  --out="$DUMP_IN_CONTAINER"
docker cp "sialkot-mongo:${DUMP_IN_CONTAINER}" "$BACKUP_DIR/mongodump"
tar -C "$BACKUP_DIR" -czf "$BACKUP_DIR/mongodump-products.tgz" mongodump
ls -la "$BACKUP_DIR/mongodump/$LIVE_DB/products.bson" "$BACKUP_DIR/mongodump-products.tgz"

echo "=== scratch restore test → $SCRATCH_DB ==="
$MEXEC gm_root mongosh --quiet --eval "db.getSiblingDB('${SCRATCH_DB}').dropDatabase()" >/dev/null
$MEXEC gm_root mongorestore \
  --nsFrom="${LIVE_DB}.*" \
  --nsTo="${SCRATCH_DB}.*" \
  "${DUMP_IN_CONTAINER}"
$MEXEC gm_root mongosh "$SCRATCH_DB" --quiet --eval "
  const n = db.products.countDocuments({});
  const recon = db.products.countDocuments({ 'media.images.altText': { \$regex: 'reconstructed', \$options: 'i' } });
  if (n !== 19 || recon !== 19) { print('SCRATCH_FAIL count=' + n + ' recon=' + recon); quit(2); }
  print(JSON.stringify({ scratch: '$SCRATCH_DB', products: n, withReconstructedAlt: recon, ok: true }));
" | tee "$BACKUP_DIR/scratch-restore.json"
$MEXEC gm_root mongosh --quiet --eval "db.getSiblingDB('${SCRATCH_DB}').dropDatabase()" >/dev/null
docker exec sialkot-mongo rm -rf "$DUMP_IN_CONTAINER" "$QUERY_IN_CONTAINER"
echo "SCRATCH_RESTORE_OK (dropped $SCRATCH_DB)"

if [ "$APPLY" != "1" ]; then
  echo "DRY_RUN only. Re-run with APPLY=1 to write altText."
  echo "BACKUP_DIR=$BACKUP_DIR"
  exit 0
fi

# Build apply script from plan (field-level $set only)
export BACKUP_DIR
python3 - <<'PY'
import json, os
from pathlib import Path
backup = Path(os.environ["BACKUP_DIR"])
data = json.loads((backup / "before-plan.json").read_text())
by = {}
for c in data["changes"]:
    by.setdefault(c["_id"], {})[c["index"]] = c["after"]
updates = []
for i, fields in by.items():
    updates.append({
        "id": i,
        "set": {f"media.images.{idx}.altText": alt for idx, alt in fields.items()},
    })
lines = [
    "// auto-generated — field-level altText $set only",
    f"const LIVE_DB = {json.dumps(data['db'])};",
    "const updates = " + json.dumps(updates, indent=2) + ";",
    "const results = [];",
    "for (const u of updates) {",
    "  const r = db.getSiblingDB(LIVE_DB).products.updateOne({ _id: ObjectId(u.id) }, { $set: u.set });",
    "  results.push({ id: u.id, matched: r.matchedCount, modified: r.modifiedCount, keys: Object.keys(u.set) });",
    "}",
    "print(JSON.stringify({ applied: results.length, results }, null, 2));",
]
(backup / "apply.js").write_text("\n".join(lines) + "\n")
print("wrote", backup / "apply.js", "products", len(by))
PY

docker cp "$BACKUP_DIR/apply.js" "sialkot-mongo:${APPLY_JS_CONTAINER}"
echo "=== APPLY field-level \$set ==="
$MEXEC gm_root mongosh --quiet "$LIVE_DB" --file "$APPLY_JS_CONTAINER" | tee "$BACKUP_DIR/apply-result.json"
docker exec sialkot-mongo rm -f "$APPLY_JS_CONTAINER"

echo "=== AFTER re-read ==="
$MEXEC gm_root mongosh "$LIVE_DB" --quiet --eval "
  const arts = $(python3 -c 'import json; print(json.dumps("""'"${ARTICLE_NOS[*]}"'""".split()))');
  const rows = db.products.find(
    { articleNo: { \$in: arts } },
    { articleNo: 1, name: 1, slug: 1, status: 1, pricing: 1, 'media.images': 1, updatedAt: 1 }
  ).sort({ articleNo: 1 }).toArray();
  const reconLeft = db.products.countDocuments({
    articleNo: { \$in: arts },
    'media.images.altText': { \$regex: 'reconstructed', \$options: 'i' }
  });
  print(JSON.stringify({ products: rows.length, reconstructedRemaining: reconLeft, rows }, null, 2));
" >"$BACKUP_DIR/after-docs.json"

BACKUP_DIR="$BACKUP_DIR" python3 - <<'PY'
import json, os
from pathlib import Path
backup = Path(os.environ["BACKUP_DIR"])
plan = json.loads((backup / "before-plan.json").read_text())
after_wrap = json.loads((backup / "after-docs.json").read_text())
before_docs = {d["articleNo"]: d for d in plan["docs"]}
after_by = {r["articleNo"]: r for r in after_wrap["rows"]}
diffs = []
problems = []

def strip_alts(doc):
    d = json.loads(json.dumps(doc, default=str))
    imgs = ((d.get("media") or {}).get("images") or [])
    for im in imgs:
        im.pop("altText", None)
    return d

for c in plan["changes"]:
    doc = after_by.get(c["articleNo"])
    if not doc:
        problems.append(f"missing {c['articleNo']}")
        continue
    imgs = (doc.get("media") or {}).get("images") or []
    got = imgs[c["index"]].get("altText") if c["index"] < len(imgs) else None
    ok = got == c["after"]
    diffs.append({**c, "got": got, "ok": ok})
    if not ok:
        problems.append(f"{c['articleNo']}[{c['index']}] want={c['after']!r} got={got!r}")

# Only altText should change among media.images fields we care about; compare docs minus altText
for art, before in before_docs.items():
    after = after_by[art]
    b = strip_alts(before)
    a = strip_alts(after)
    # updatedAt may bump on some drivers — strip it for structural compare
    b.pop("updatedAt", None)
    a.pop("updatedAt", None)
    if b != a:
        problems.append(f"non-alt drift on {art}")

if after_wrap.get("reconstructedRemaining") != 0:
    problems.append(f"reconstructedRemaining={after_wrap.get('reconstructedRemaining')}")
if after_wrap.get("products") != 19:
    problems.append(f"products={after_wrap.get('products')}")

(backup / "before-after-diff.json").write_text(json.dumps({"diffs": diffs, "problems": problems}, indent=2))
print(f"AFTER products={after_wrap['products']} reconstructedRemaining={after_wrap['reconstructedRemaining']} ok_alts={sum(1 for d in diffs if d['ok'])}/38")
if problems:
    print("PROBLEMS:")
    for p in problems:
        print(" ", p)
    raise SystemExit(2)
for d in diffs:
    print(f"{d['articleNo']}[{d['index']}]")
    print(f"  BEFORE: {d['before']}")
    print(f"  AFTER:  {d['got']}")
print(f"BACKUP_DIR={backup}")
PY

echo "APPLY_OK BACKUP_DIR=$BACKUP_DIR"
