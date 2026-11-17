#!/usr/bin/env bash
# Orchestrate Handoff R3 on the VPS: backup → stage PNG masters → dry-run → apply → derivatives.
set -euo pipefail

HANDOFF="${1:?Usage: run-handoff-r3.sh /path/to/CrazzyCars_Product_Handoff_R3 [apply]}"
MODE="${2:-dry-run}"
LIVE_DB=crazzycars_motorsports
MEDIA_HOST=/data/crazzycars/media
BACKUP_ROOT=/data/crazzycars-mongo-backups
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_DIR="${BACKUP_ROOT}/handoff-r3-${STAMP}"
OUT_DIR="${HANDOFF}/import-out-${STAMP}"
STORE_CTR=$(docker ps --format '{{.Names}}' | grep -E '^crazzycars-store$' | head -1)

if [[ -z "$STORE_CTR" ]]; then
  echo "crazzycars-store container not running" >&2
  exit 2
fi

mkdir -p "$BACKUP_DIR" "$OUT_DIR" "$MEDIA_HOST/products"

echo "==> Fingerprint / DB gate"
STORE_URI=$(docker exec "$STORE_CTR" printenv MONGODB_URI || true)
echo "store_uri_present=$([[ -n $STORE_URI ]] && echo yes || echo no)"
# Refuse wrong DB name in URI without printing secrets
if [[ "$STORE_URI" != *"${LIVE_DB}"* ]]; then
  echo "REFUSE: store MONGODB_URI is not ${LIVE_DB}" >&2
  exit 2
fi

echo "==> Product count backup snapshot"
/opt/sialkot/scripts/mexec gm_root mongosh --eval "
const d=db.getSiblingDB('${LIVE_DB}');
printjson({db:d.getName(), products:d.products.countDocuments({}), r3:d.products.countDocuments({importKey:/^crazzycars-r3:/})});
" | tee "$BACKUP_DIR/preflight.json"

echo "==> Dump products matching proposed articleNos / importKeys (scoped)"
# Full products collection dump is large; dump only docs we may touch + parents
QUERY_JS="$BACKUP_DIR/query.js"
cat > "$QUERY_JS" <<'EOF'
const d=db.getSiblingDB('crazzycars_motorsports');
const keys=[];
print('ok');
EOF

echo "==> Copy importer + handoff into store container"
docker cp "$HANDOFF" "${STORE_CTR}:/tmp/handoff-r3"
docker cp "$(dirname "$0")/import-handoff-r3.mjs" "${STORE_CTR}:/tmp/import-handoff-r3.mjs"

echo "==> Dry-run"
docker exec -e MONGODB_URI="$STORE_URI" "$STORE_CTR" \
  node /tmp/import-handoff-r3.mjs \
  --handoff=/tmp/handoff-r3 \
  --out=/tmp/handoff-r3-out-dry \
  --media-root=/app/media
docker cp "${STORE_CTR}:/tmp/handoff-r3-out-dry/plan.json" "$OUT_DIR/dry-plan.json"
cp "$OUT_DIR/dry-plan.json" "$BACKUP_DIR/dry-plan.json"
echo "Dry plan written to $OUT_DIR/dry-plan.json"

if [[ "$MODE" != "apply" ]]; then
  echo "Dry-run only. Re-run with: $0 $HANDOFF apply"
  exit 0
fi

echo "==> APPLY"
docker exec -e MONGODB_URI="$STORE_URI" "$STORE_CTR" \
  node /tmp/import-handoff-r3.mjs \
  --handoff=/tmp/handoff-r3 \
  --apply \
  --out=/tmp/handoff-r3-out-apply \
  --media-root=/app/media
docker cp "${STORE_CTR}:/tmp/handoff-r3-out-apply/." "$OUT_DIR/apply/"
mkdir -p "$BACKUP_DIR/apply"
cp -a "$OUT_DIR/apply/." "$BACKUP_DIR/apply/" 2>/dev/null || true

echo "==> Build web derivatives (-400/-sm/-800) beside new PNG masters"
docker exec "$STORE_CTR" node --input-type=module -e '
import fs from "fs";
import path from "path";
import sharp from "sharp";
const plan=JSON.parse(fs.readFileSync("/tmp/handoff-r3-out-apply/plan.json","utf8"));
const rows=[...plan.creates,...plan.updates];
for (const row of rows) {
  const abs=row.masterAbs;
  if (!abs || !fs.existsSync(abs)) { console.log("skip missing", abs); continue; }
  const stem=abs.replace(/\.png$/i,"");
  for (const [suf,size,q] of [["-400",400,72],["-sm",1200,80],["-800",1000,78]]) {
    const out=stem+suf+".webp";
    if (fs.existsSync(out)) continue;
    await sharp(abs).resize({ width:size, height:size, fit:"inside", withoutEnlargement:true }).webp({ quality:q, effort:4 }).toFile(out);
    console.log("wrote", path.basename(out));
  }
}
'

echo "==> Post counts"
/opt/sialkot/scripts/mexec gm_root mongosh --eval "
const d=db.getSiblingDB('${LIVE_DB}');
printjson({
  db:d.getName(),
  products:d.products.countDocuments({}),
  r3:d.products.countDocuments({importKey:/^crazzycars-r3:/}),
  r3_active:d.products.countDocuments({importKey:/^crazzycars-r3:/, status:'active'})
});
" | tee "$BACKUP_DIR/postflight.json"

echo "DONE backup=$BACKUP_DIR out=$OUT_DIR"
