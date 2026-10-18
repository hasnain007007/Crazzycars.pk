# Server batch 3 — curl cases (local only)

Never hit crazzycars.pk.

```bash
BASE=http://127.0.0.1:3000

# Structured FAQ (same source as web /faq)
curl -sS "$BASE/api/mobile/v1/faq" | jq '.items[0]'

# Config includes optional recommended versions (empty string OK)
curl -sS "$BASE/api/mobile/v1/config" | jq '{minVersionAndroid,recommendedVersionAndroid,recommendedVersionIos}'
```

Expected:
- `/faq` → `{ items: [ { question, answer }, ... ] }` status 200
- `/config` → includes `recommendedVersionIos` and `recommendedVersionAndroid` keys
