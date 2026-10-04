# Mobile Mongo indexes — how they are created

## Mechanism

Models declare indexes in schema files:

| Collection (approx.) | Source | Indexes |
|----------------------|--------|---------|
| `customerrefreshtokens` | `CustomerRefreshToken.model.js` | unique `tokenHash`; TTL `{ expiresAt: 1 }` `expireAfterSeconds: 0`; `{ customerId: 1, isRevoked: 1 }` (+ `customerId` from `index: true`) |
| `mobiledevices` | `MobileDevice.model.js` | unique `token`; `{ customerId: 1 }` |
| `idempotencykeys` | `IdempotencyKey.model.js` | unique `{ key: 1, scope: 1 }`; TTL `{ createdAt: 1 }` `expireAfterSeconds: 86400` |

`lib/db.js` imports `./registerModels`, which loads these models. On first successful `mongoose.connect`, **Mongoose autoIndex** (default `true` unless disabled) builds missing indexes asynchronously. There is **no** explicit `syncIndexes()` call in the app today.

**Implication:** Indexes appear after the preview/prod process connects and first loads these models (any request that imports them, e.g. login or devices). They are not created by a separate migration script.

Optional force sync (run against the **target** DB only):

```bash
# From storecraft-store, with MONGODB_URI pointing at preview DB
node --input-type=module <<'EOF'
import { dbConnect } from './lib/db.js';
import CustomerRefreshToken from './lib/models/CustomerRefreshToken.model.js';
import MobileDevice from './lib/models/MobileDevice.model.js';
import IdempotencyKey from './lib/models/IdempotencyKey.model.js';
await dbConnect();
console.log(await CustomerRefreshToken.syncIndexes());
console.log(await MobileDevice.syncIndexes());
console.log(await IdempotencyKey.syncIndexes());
process.exit(0);
EOF
```

## Verify with getIndexes()

On the VPS (preview DB example):

```bash
docker exec sialkot-mongo mongosh crazzycars_mobile_preview --quiet --eval '
printjson(db.customerrefreshtokens.getIndexes());
printjson(db.mobiledevices.getIndexes());
printjson(db.idempotencykeys.getIndexes());
'
```

Local / Atlas (replace URI and DB name):

```bash
mongosh "$MONGODB_URI" --quiet --eval '
printjson(db.customerrefreshtokens.getIndexes());
printjson(db.mobiledevices.getIndexes());
printjson(db.idempotencykeys.getIndexes());
'
```

Expect TTL indexes to show `"expireAfterSeconds": 0` (refresh) or `86400` (idempotency), and unique flags on `tokenHash` / `token` / `key+scope`.
