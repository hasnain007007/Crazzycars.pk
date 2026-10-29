# PHOTO-FIX dry-run — LIVE `187aad8c44fe3a84`

**DB:** `crazzycars_motorsports`  
**Token:** `GO PHOTO-FIX` (not applied)

| Signal | Count |
|--------|------:|
| sharedFileGroups | 7 |
| mainMismatchCount | 2 |

**mainMismatchSample**

1. `suzuki-alto-2018-2023-multimedia-steering-wheel-audio-control-buttons-panel` → main points at `premium-metal-key-cover-…` (`main_slug_token_mismatch`)
2. `honda-vezel-2013-2018-fog-lamps-drl-cover-hd011-l2` → main points at `osram-projector-lights-…` (`main_slug_token_mismatch`)

See `photo-fix-summary.json`. Plan at GO: field-level image URL `$set` only after fresh live mongodump; never overwrite media files that already 200.
